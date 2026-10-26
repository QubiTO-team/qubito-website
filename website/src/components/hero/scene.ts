import {
  Box3,
  Color,
  DirectionalLight,
  Group,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CHIP_SHIFT, loadChip, type ChipView } from './chip';
import {
  createChipEnvironment,
  createGoldEnvironment,
  createLabEnvironment,
  createPmremGenerator,
} from './environment';
import { ThermalParticles } from './particles';
import { createModelPicker } from './pick';
import { ALIGN_AT, createScrollTracker, stagePosition, type PageTop } from './scroll';
import { nextTask, prepareShaders } from './shaders';
import { SURFACES, addRimGlow, addSurfaceDetail } from './surface';

/*
 * The cryostat behind the home page. When the page opens it is entirely in view, its top
 * plate next to the first stage plate of the page. It always turns slowly clockwise (seen
 * from above); scrolling adds more clockwise rotation and moves the model so that the plate
 * of the current stage lines up with the stage plate of the page, while the camera gets closer
 * towards the mixing chamber. Approaching the stage of the chip (FINALE) the camera dives into
 * the gold can at the bottom, the picture goes dark and the chip comes up (chip.ts).
 * The loop runs continuously: 30 fps on small screens, paused while the tab is hidden.
 * The start-up runs in short steps (the page keeps responding) while the canvas is still hidden.
 */

const SMALL_SCREEN = '(max-width: 47.99rem)';
/**
 * On large screens the scene is drawn with at least this many pixels per CSS pixel, and the
 * browser scales it down: thin cables, reflections and the drawing of the chip get smooth edges,
 * like the text around them. Denser screens get their full resolution. At most PIXEL_BUDGET
 * pixels per frame.
 */
const SHARP_RATIO = 2;
const PIXEL_BUDGET = 20e6;
/**
 * A computer that cannot keep up goes back to the resolution of its screen for good: when the
 * median frame of about a second takes longer than this, in milliseconds.
 */
const SLOW_FRAME = 1000 / 45;
/** The model fades in during the collapse of the hero claim (which starts at 1.8 s). */
const REVEAL_AT_MS = 2400;
/** Idle rotation, radians per second: one turn in about 100 s. */
const IDLE_SPEED = (2 * Math.PI) / 100;
/** Extra rotation over the whole page, radians. */
const SCROLL_TURN = 3.4;
/** Room left free below the header and at the bottom of the screen when the page opens. */
const OPENING_MARGIN = 0.015;
/** The key light cools down with the stages. */
const WARM_KEY = new Color(0xffe2b0);
const COLD_KEY = new Color(0x96acd4);
/** Silver metals, which mirror a room without violet glows. */
const SILVER = new Set(['aluminium', 'steel', 'coax']);
/** Glow of the rim of the plate of the current stage. */
const RIM_COLOR = new Color(0xd6b26e).multiplyScalar(0.9);
/** Stage of the page where the chip is shown; the camera dives into the gold can before it. */
const FINALE = '20mK';
/**
 * The gold can at the bottom of one of the two towers, which reads as the box of the chip: its
 * axis in model space (LINE_TOWER in scripts/blender/cryostat.py), its height and how close the
 * camera gets to its axis before the picture goes dark, in metres.
 */
const CHIP_CAN = { x: 0.094, z: -0.004, height: 0.066, approach: 0.15 };
/**
 * When the page stops on one stage at a time, the model follows it with a spring, so that it
 * starts and stops gently: its smoothing time in seconds, longer around the chip (from 800 mK to
 * 100 mK the camera dives towards the can; further down the chip appears and gets close).
 */
const GLIDE = 0.45;
const DIVE_GLIDE = 0.65;
const FINALE_GLIDE = 0.9;
/**
 * The dive into the can and the chip after it follow with a spring of their own, so the chip does
 * not appear all at once; going back up it is slower, so the chip is seen moving away before the
 * cryostat comes back.
 */
const ENDING_GLIDE = 0.45;
const ENDING_BACK_GLIDE = 0.8;
/**
 * With those stops, the particles land on the qubits in their own time once the chip stage is
 * reached, and lift off again when the page goes back up, in seconds, instead of following the
 * scroll.
 */
const LANDING_TIME = 4;
const LIFT_TIME = 1.2;
/** Dragging with the mouse on the model (or the chip) turns it, radians per pixel. */
const DRAG_TURN = (2 * Math.PI) / 900;
/** After a drag the model keeps turning, slowing down by this rate per second. */
const DRAG_FRICTION = 3.5;
/** Where a drag does not turn the model even over it: text, controls, media and the header. */
const NOT_DRAGGABLE =
  'p, h1, h2, h3, h4, li, dl, blockquote, figcaption, time, pre, table, ' +
  'a, button, input, textarea, select, label, summary, img, svg, video, header';

export async function startScene(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  context: WebGL2RenderingContext,
) {
  const smallScreen = window.matchMedia(SMALL_SCREEN);
  const mobile = smallScreen.matches;

  const renderer = new WebGLRenderer({ canvas, context });
  // Pixels drawn per CSS pixel (see SHARP_RATIO); small screens keep a lighter resolution.
  let sharp = !mobile;
  const drawingRatio = () => {
    const screen = Math.min(window.devicePixelRatio, mobile ? 1.5 : 2);
    if (!sharp) return screen;
    const area = Math.max(1, canvas.clientWidth * canvas.clientHeight);
    const budget = Math.sqrt(PIXEL_BUDGET / area);
    return Math.max(screen, Math.min(Math.max(window.devicePixelRatio, SHARP_RATIO), budget));
  };
  let pixelRatio = drawingRatio();
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  // Neutral tone mapping keeps the hue of the gold; AgX washes bright metals out to silver.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  await nextTask();

  const scene = new Scene();
  const pmrem = createPmremGenerator(renderer);
  const environment = createLabEnvironment(pmrem);
  scene.environment = environment;
  scene.environmentIntensity = 0.85;
  await nextTask();
  const silverEnvironment = createLabEnvironment(pmrem, { violet: false });
  await nextTask();

  const camera = new PerspectiveCamera(30, 1, 0.05, 40);

  // Warm key and cold rim; the violet light comes from the particles.
  const key = new DirectionalLight(0xffe2b0, 3);
  key.position.set(-2, 2.5, 2.5);
  const rim = new DirectionalLight(0x96acd4, 1.8);
  rim.position.set(2.5, 0.6, -2.2);
  scene.add(key, rim);

  const gltf = await new GLTFLoader().loadAsync(
    `/models/cryostat-${mobile ? 'mobile' : 'desktop'}.glb`,
  );
  const model = gltf.scene;
  const pivot = new Group();
  pivot.add(model);
  scene.add(pivot);

  // The silver metals get their own environment (with a material envMap, three.js uses the
  // material's envMapIntensity instead of the scene's).
  model.traverse((object) => {
    const material = (object as Mesh).isMesh
      ? ((object as Mesh).material as MeshStandardMaterial)
      : null;
    if (!material || !SILVER.has(material.name)) return;
    material.envMap = silverEnvironment;
    material.envMapIntensity = scene.environmentIntensity;
  });

  // Surface detail on the metals, in model space (the pivot is still at the origin here).
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    const mesh = object as Mesh;
    const detail = mesh.isMesh ? SURFACES[(mesh.material as MeshStandardMaterial).name] : undefined;
    if (detail) addSurfaceDetail(mesh, detail, mesh.matrixWorld.clone());
  });

  // Height of every stage in model space: the top of each plate. For the last stage (the
  // footer) it is the bottom of the model, so the whole cryostat ends above the footer content.
  // The rim of each plate lights up while it is lined up with its stage plate in the page.
  const stageHeight = new Map<string, number>();
  const rimGlow = new Map<string, { value: number }[]>();
  for (const plate of model.children.filter((child) => child.name.startsWith('plate-'))) {
    const label = plate.name.slice('plate-'.length);
    stageHeight.set(label, new Box3().setFromObject(plate).max.y);
    const glows: { value: number }[] = [];
    plate.traverse((object) => {
      if ((object as Mesh).isMesh) glows.push(addRimGlow(object as Mesh, RIM_COLOR));
    });
    rimGlow.set(label, glows);
  }
  const bounds = new Box3().setFromObject(model);
  const radius = Math.max(bounds.max.x, bounds.max.z, -bounds.min.x, -bounds.min.z);
  stageHeight.set('10mK', bounds.min.y - 0.04);
  stageHeight.set(FINALE, bounds.min.y - 0.04);
  await nextTask();

  const particles = new ThermalParticles(scene, {
    count: mobile ? 760 : 2300,
    lightCount: mobile ? 2 : 6,
    pixelRatio,
  });

  // The pointer lights the particles near it, and dragging on the model or on the chip (not on
  // text or controls in front of them) turns it, so it can be seen from any side (mouse and
  // trackpad only: on touch screens a drag scrolls the page).
  const followPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onCryostat = createModelPicker(model, pivot, bounds);
  const html = document.documentElement;
  const drag = { angle: 0, velocity: 0, active: false, x: 0, time: 0 };
  const pointerAt = new Vector2();
  const onModel = (event: PointerEvent) => {
    if (!shown) return false;
    const rect = canvas.getBoundingClientRect();
    pointerAt.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
    if (chip && reveal > 0.5) return chip.covers(pointerAt.x, pointerAt.y);
    // While the camera dives into the can the model fills the screen: no turning then.
    return reveal === 0 && dive < 0.3 && onCryostat(pointerAt.x, pointerAt.y, camera);
  };
  const draggable = (event: PointerEvent) => {
    const target = event.target;
    return (
      target instanceof Element &&
      !target.closest(NOT_DRAGGABLE) &&
      ![...target.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      ) &&
      onModel(event)
    );
  };
  const onPointerMove = (event: PointerEvent) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = 1 - (event.clientY / window.innerHeight) * 2;
    particles.setPointer(x, y, true);
    chip?.setPointer(x, y, true);
    if (drag.active) {
      const turn = (event.clientX - drag.x) * DRAG_TURN;
      const seconds = Math.max(0.008, (event.timeStamp - drag.time) / 1000);
      drag.angle += turn;
      drag.velocity = lerp(drag.velocity, turn / seconds, 0.5);
      drag.x = event.clientX;
      drag.time = event.timeStamp;
    }
    html.classList.toggle('can-turn-model', drag.active || draggable(event));
  };
  const onPointerOut = (event: PointerEvent) => {
    if (event.relatedTarget) return;
    particles.setPointer(0, 0, false);
    chip?.setPointer(0, 0, false);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || event.pointerType === 'touch' || !draggable(event)) return;
    // No text selection while turning.
    event.preventDefault();
    html.setPointerCapture(event.pointerId);
    Object.assign(drag, { active: true, velocity: 0, x: event.clientX, time: event.timeStamp });
    html.classList.add('is-turning-model');
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!drag.active) return;
    drag.active = false;
    // A pause before letting go means no spin.
    if (event.timeStamp - drag.time > 100) drag.velocity = 0;
    html.classList.remove('is-turning-model');
  };
  if (followPointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerout', onPointerOut);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }
  const tracker = createScrollTracker();

  // The chip is downloaded only when the descent gets near it, and set up in short steps so
  // that scrolling stays smooth; it is shown once its shaders are ready.
  let chip: ChipView | null = null;
  let chipRequested = false;
  const requestChip = async () => {
    chipRequested = true;
    try {
      const chipEnvironment = createChipEnvironment(pmrem);
      await nextTask();
      const board = createGoldEnvironment(pmrem);
      const view = await loadChip({ chip: chipEnvironment, board }, { mobile });
      await view.prepare(renderer);
      view.resize(canvas.clientWidth, canvas.clientHeight, smallScreen.matches, pixelRatio);
      chip = view;
    } catch (error) {
      console.error('Chip unavailable:', error);
    }
  };
  const can = new Vector3();
  const look = new Vector3();
  let dive = 0;
  let reveal = 0;
  let settle = 0;
  let landing = 0;
  const glide = { progress: 0, velocity: 0, started: false };
  // Dive and chip as one value: from 0 to 1 the dive, from 1 to 2 the chip.
  const ending = { progress: 0, velocity: 0 };

  let idleAngle = 0;
  const update = (delta: number) => {
    idleAngle += delta * IDLE_SPEED;
    const anchors = tracker.anchors;
    const last = Math.max(1, anchors.length - 1);
    const finale = anchors.findIndex((anchor) => anchor.label === FINALE);
    const target = tracker.progress;
    if (tracker.snapping && glide.started) {
      // The upper stage of the two the model is moving between.
      const upper = Math.floor(
        Math.min(stagePosition(anchors, glide.progress), stagePosition(anchors, target)) + 1e-3,
      );
      const smoothTime =
        finale < 0 || upper < finale - 2 ? GLIDE : upper === finale - 2 ? DIVE_GLIDE : FINALE_GLIDE;
      smoothDamp(glide, target, smoothTime, delta);
    } else {
      glide.progress = target;
      glide.velocity = 0;
    }
    glide.started = true;
    const progress = glide.progress;
    const position = Math.min(stagePosition(anchors, progress), last);
    const index = Math.min(Math.floor(position), last - 1);
    const t = position - index;
    const from = stageHeight.get(anchors[index]?.label ?? '') ?? 0;
    const to = stageHeight.get(anchors[index + 1]?.label ?? '') ?? from;
    const depth = position / last;
    const baseDistance = (at: number) =>
      smallScreen.matches ? lerp(4.2, 3.2, at) : lerp(2.95, 2.0, at);
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360);

    // The opening framing gives way to the stage framing during the first transition.
    const firstPlate = stageHeight.get(anchors[0]?.label ?? '') ?? 0;
    const opening = openingView(tanHalf, baseDistance(0), tracker.top, {
      above: bounds.max.y - firstPlate,
      below: firstPlate - bounds.min.y,
      radius,
    });
    const intro = index === 0 ? 1 - t : 0;
    const distance = baseDistance(depth) + (opening.distance - baseDistance(0)) * intro;
    const stageAlign = lerp(
      anchors[index]?.align ?? ALIGN_AT,
      anchors[index + 1]?.align ?? ALIGN_AT,
      t,
    );
    const align = lerp(stageAlign, opening.align, intro);
    const halfHeight = tanHalf * distance;
    const halfWidth = halfHeight * camera.aspect;
    const modelX = smallScreen.matches ? 0 : halfWidth * 0.42;

    camera.position.set(0, 0, distance);
    pivot.position.set(modelX, -lerp(from, to, t) + (1 - 2 * align) * halfHeight, 0);
    // Negative angles turn clockwise seen from above (Y up).
    if (!drag.active) {
      drag.angle += drag.velocity * delta;
      drag.velocity *= Math.exp(-DRAG_FRICTION * delta);
    }
    pivot.rotation.y = 0.55 - idleAngle - progress * SCROLL_TURN + drag.angle;
    particles.update(delta, depth, modelX);

    key.color.lerpColors(WARM_KEY, COLD_KEY, depth * depth * (3 - 2 * depth));
    anchors.forEach((anchor, i) => {
      const glow = Math.max(0, 1 - Math.abs(position - i) * 2.5);
      const plate = anchor.label === FINALE ? '10mK' : anchor.label;
      for (const strength of rimGlow.get(plate) ?? []) strength.value = glow * glow;
    });

    // Finale: dive into the gold can, then the chip (only once it has arrived). The chip
    // shows up as soon as the cryostat has gone dark, and going back up the cryostat comes
    // back only after the chip has gone.
    if (finale > 0 && !chipRequested && position > finale - 3) requestChip();
    const ready = finale > 0 && chip !== null;
    const endingTarget = ready
      ? clamp01((position - (finale - 1.45)) / 0.85) + clamp01((position - (finale - 0.6)) / 0.4)
      : 0;
    if (tracker.snapping) {
      const back = endingTarget < ending.progress;
      smoothDamp(ending, endingTarget, back ? ENDING_BACK_GLIDE : ENDING_GLIDE, delta);
    } else Object.assign(ending, { progress: endingTarget, velocity: 0 });
    dive = Math.min(1, ending.progress);
    reveal = Math.max(0, ending.progress - 1);
    settle = ready ? smoothstep((position - (finale + 0.65)) / 0.35) : 0;
    const approach = smoothstep(dive);
    look.set(0, 0, 0);
    camera.near = 0.05;
    camera.clearViewOffset();
    if (approach > 0) {
      pivot.updateMatrixWorld();
      pivot.localToWorld(can.set(CHIP_CAN.x, bounds.min.y + CHIP_CAN.height / 2, CHIP_CAN.z));
      const end = camera.position.clone().sub(can).setLength(CHIP_CAN.approach).add(can);
      camera.position.lerp(end, approach);
      look.lerp(can, approach);
      camera.near = lerp(0.05, 0.004, approach);
      // On large screens the can stays on the right, where the chip will appear.
      if (!smallScreen.matches) {
        const { clientWidth: width, clientHeight: height } = canvas;
        camera.setViewOffset(width, height, -width * CHIP_SHIFT * approach, 0, width, height);
      }
    }
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    particles.setFade(1 - smoothstep((dive - 0.25) / 0.55));
    // From the chip stage to the footer the camera gets closer to the chip. When the page stops
    // at each stage, the approach is spread over the whole way between the two.
    const scrolled = clamp01((position - (finale - 0.5)) / 1.1);
    const closeUp =
      tracker.snapping && position > finale
        ? lerp(0.5 / 1.1, 1, clamp01(position - finale))
        : scrolled;
    // The particles land on the qubits as the page scrolls. When the page stops at each stage,
    // they land in their own time once the chip stage is reached, and lift off when going back.
    if (!tracker.snapping) landing = scrolled;
    else if (reveal === 0) landing = 0;
    else if (position > finale - 0.15) landing = Math.min(1, landing + delta / LANDING_TIME);
    else landing = Math.max(0, landing - delta / LIFT_TIME);
    if (chip && reveal > 0) chip.update(delta, reveal, closeUp, landing, drag.angle);
  };

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas;
    pixelRatio = drawingRatio();
    renderer.setDrawingBufferSize(width, height, pixelRatio);
    // The browser may give a smaller drawing than asked for: then draw at the size it gave.
    const given = Math.min(
      context.drawingBufferWidth / canvas.width,
      context.drawingBufferHeight / canvas.height,
    );
    if (given < 1) {
      pixelRatio *= given;
      renderer.setDrawingBufferSize(width, height, pixelRatio);
    }
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    particles.setAspect(camera.aspect);
    particles.setPixelRatio(pixelRatio);
    chip?.resize(width, height, smallScreen.matches, pixelRatio);
  };
  resize();
  window.addEventListener('resize', resize);

  // The model is hidden until it fades in. Meanwhile frames are drawn only for a first, shorter
  // speed check, so that the title animation has the graphics card to itself.
  let shown = false;
  let checked = false;
  // While the drawing is sharp, frame times are checked in windows of about a second.
  const frameTimes: number[] = [];
  const checkFrame = (elapsed: number) => {
    frameTimes.push(elapsed);
    if (frameTimes.reduce((sum, time) => sum + time, 0) < (shown ? 1000 : 300)) return;
    checked = true;
    frameTimes.sort((a, b) => a - b);
    const median = frameTimes[frameTimes.length >> 1] ?? 0;
    frameTimes.length = 0;
    if (median > SLOW_FRAME) {
      sharp = false;
      resize();
    }
  };

  const frameInterval = mobile ? 1000 / 30 : 0;
  let previous = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const elapsed = now - previous;
    if (elapsed < frameInterval - 1) return;
    previous = now;
    if (!shown && (checked || !sharp)) return;
    if (sharp) checkFrame(elapsed);
    update(Math.min(elapsed, 100) / 1000);
    if (chip && reveal > 0) {
      // Bright early in the reveal; dimmer over the footer, where the links have to stay readable.
      renderer.toneMappingExposure = (1 - (1 - reveal) ** 2) * (1 - 0.45 * settle);
      chip.render(renderer);
    } else {
      // The cryostat goes dark as the camera reaches the can.
      renderer.toneMappingExposure = 1 - smoothstep((dive - 0.5) / 0.5);
      renderer.render(scene, camera);
    }
  };

  const onVisibilityChange = () => {
    cancelAnimationFrame(frame);
    if (!document.hidden) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  update(0);
  await prepareShaders(renderer, scene, camera);
  renderer.render(scene, camera);
  window.setTimeout(
    () => {
      shown = true;
      root.classList.add('is-ready');
    },
    Math.max(0, REVEAL_AT_MS - performance.now()),
  );
  // Frame times start here: the time spent preparing is not a frame.
  previous = performance.now();
  frame = requestAnimationFrame(tick);
  document.addEventListener('visibilitychange', onVisibilityChange);

  const dispose = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerout', onPointerOut);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    tracker.dispose();
    particles.dispose();
    chip?.dispose();
    model.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => material.dispose());
    });
    environment.dispose();
    silverEnvironment.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
  window.addEventListener(
    'pagehide',
    (event) => {
      if (!event.persisted) dispose();
    },
    { once: true },
  );
}

/**
 * Camera distance and height of the top plate (fraction of the viewport height) when the page
 * opens: the plate as close as possible to its stage plate, with the whole model between the
 * header and the bottom of the screen. The camera moves back only if the model does not fit.
 * The top is checked at the front of the model's bounding cylinder, which perspective pushes
 * highest on screen; the bottom is the narrow sample tower, checked on its axis.
 */
function openingView(
  tanHalf: number,
  base: number,
  page: PageTop,
  model: { above: number; below: number; radius: number },
) {
  // Highest point allowed on screen, in normalized device coordinates.
  const limit = 1 - 2 * (page.ceiling + OPENING_MARGIN);
  let distance = base;
  let highest = 0;
  let lowest = 1;
  for (let attempt = 0; attempt < 16; attempt++) {
    highest = (1 - (limit * (distance - model.radius) - model.above / tanHalf) / distance) / 2;
    lowest = 1 - OPENING_MARGIN - model.below / (2 * tanHalf * distance);
    if (highest <= lowest) break;
    distance *= 1.05;
  }
  return { distance, align: Math.min(Math.max(page.plate, highest), lowest) };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

/**
 * Moves `state.progress` towards `target` like a critically damped spring (the smoothDamp of Game
 * Programming Gems 4): it starts and stops gently, and covers about 90% of the way in twice
 * `smoothTime` seconds.
 */
function smoothDamp(
  state: { progress: number; velocity: number },
  target: number,
  smoothTime: number,
  delta: number,
) {
  const omega = 2 / smoothTime;
  const x = omega * delta;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = state.progress - target;
  const push = (state.velocity + omega * change) * delta;
  state.velocity = (state.velocity - omega * push) * decay;
  state.progress = target + (change + push) * decay;
  // The spring only gets ever closer: once it is there, it stops exactly on the target.
  if (Math.abs(state.progress - target) < 1e-5 && Math.abs(state.velocity) < 1e-4) {
    state.progress = target;
    state.velocity = 0;
  }
}

/** Smoothstep from 0 to 1, with x clamped to that range. */
function smoothstep(x: number) {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}
