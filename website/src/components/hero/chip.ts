import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  NoColorSpace,
  PerspectiveCamera,
  PointLight,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareShaders } from './shaders';

/*
 * The end of the descent: the quantum chip in its sample holder (scripts/blender/chip.py,
 * units are millimetres). The camera comes down from above ("arrival") and then gets closer
 * ("closeUp"), while a lattice of particles above the chip comes down onto the five qubits, which
 * light up as their particles land. Both go from 0 to 1 with the scroll. The camera slowly turns
 * around the chip.
 */

const SUBSTRATE = new Color('#0d0c12');
const METAL = new Color('#d9dbe0');
const BOARD = new Color('#2a1d20');
/** The gold of the cryostat (material "gold" in scripts/blender/cryostat.py), in linear RGB. */
const GOLD = new Color().setRGB(1, 0.68, 0.24);
const GLOW = new Color('#e891db');
/** Parts of the chip itself, brightened and lit by their own environment. */
const CHIP_PARTS = new Set(['chip-top', 'die']);
/** Brightness of the chip, relative to the board and the bonds around it. */
const CHIP_LEVEL = 1.6;
/** Like Scene.environmentIntensity of the cryostat (scene.ts). */
const BOARD_ENVIRONMENT_INTENSITY = 0.85;
/** Parts of the model left out on the page. */
const HIDDEN = new Set(['holder', 'screws', 'contacts']);
/**
 * Distance from the centre qubit, in mm, over which the surroundings fade to black: from just
 * past the corners of the chip (7.4 mm wide).
 */
const FADE_FROM = 5.4;
const FADE_TO = 7.5;
/**
 * Share of the width the chip is moved to the right on large screens, beside the text; once the
 * text has scrolled away it comes a little towards the centre, so the close-up fits.
 */
export const CHIP_SHIFT = 0.24;
const CLOSE_SHIFT = 0.15;
/** On narrow screens the camera moves back, so the chip still fits across. */
const SMALL_FIT = 1.1;
/** Emission of a lit qubit. */
const GLOW_STRENGTH = 2.6;
/** Violet light spilled by a lit qubit on the chip around it: strength and radius in mm. */
const HALO_STRENGTH = 0.22;
const HALO_RADIUS = 0.5;
/** Turn of the camera around the chip, radians per second. */
const IDLE_SPEED = (2 * Math.PI) / 160;
/** Share of the landing that one particle takes to come down. */
const FLIGHT = 0.3;
/** Half the side of the square around the centre qubit where a drag turns the chip, in mm. */
const PICK_HALF = 5;
const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

export interface ChipView {
  /** turn: extra turn of the chip, in radians (dragging with the mouse). */
  update(delta: number, arrival: number, closeUp: number, turn: number): void;
  render(renderer: WebGLRenderer): void;
  /** Prepares the shaders ahead of the first frame, in short steps; each step waits for `pause`. */
  prepare(renderer: WebGLRenderer, pause?: () => Promise<void>): Promise<void>;
  /** Size in CSS pixels; pixelRatio: pixels drawn per CSS pixel. */
  resize(width: number, height: number, small: boolean, pixelRatio: number): void;
  setPointer(x: number, y: number, active: boolean): void;
  /** Whether a point of the screen (normalized device coordinates) is on the chip. */
  covers(x: number, y: number): boolean;
  dispose(): void;
}

/** Downloads the model of the chip; loadChip() reads it, which can then wait for a better moment. */
export async function downloadChip(): Promise<ArrayBuffer> {
  const response = await fetch('/models/chip.glb');
  if (!response.ok) throw new Error(`chip.glb: ${response.status}`);
  return response.arrayBuffer();
}

export async function loadChip(
  model: ArrayBuffer,
  environments: { chip: Texture; board: Texture },
  { mobile }: { mobile: boolean },
): Promise<ChipView> {
  const gltf = await new GLTFLoader().parseAsync(model, '');
  const scene = new Scene();
  scene.environment = environments.chip;
  scene.environmentIntensity = 1;
  scene.add(gltf.scene);
  gltf.scene.updateMatrixWorld(true);

  // Qubits: markers named "qubit-<row>-<col>", the centre one first.
  const markers: Object3D[] = [];
  gltf.scene.traverse((object) => {
    if (object.name.startsWith('qubit-')) markers.push(object);
  });
  if (markers.length === 0) throw new Error('No qubit markers in chip.glb');
  markers.sort((a, b) => Number(b.name === 'qubit-1-1') - Number(a.name === 'qubit-1-1'));
  const qubits = markers.map((marker) => marker.getWorldPosition(new Vector3()));
  const glow = qubits.map(() => 0);
  const centre = qubits[0]?.clone() ?? new Vector3();

  // The holder and its posts are left out: the board around the chip fades into the black page
  // a few millimetres from the chip, so the text next to it stays readable. The board and the
  // bonds mirror the environment of the cryostat, so the gold looks like the gold of the sample
  // tower above (the soft overhead panel of the chip would make it look flat). Every mesh gets
  // its own copy of its material, so that each one can be shaded on its own.
  const fadeCentre = new Vector2(centre.x, centre.z);
  const surroundings: MeshStandardMaterial[] = [];
  gltf.scene.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    if (HIDDEN.has(mesh.name)) {
      mesh.visible = false;
      return;
    }
    const material = (mesh.material as MeshStandardMaterial).clone();
    mesh.material = material;
    const chipPart = CHIP_PARTS.has(mesh.name);
    const fade = {
      centre: fadeCentre,
      inner: FADE_FROM,
      outer: FADE_TO,
      level: chipPart ? CHIP_LEVEL : 1,
    };
    if (material.name === 'chip-pattern') shadePattern(material, 'chip', qubits, glow, fade);
    else if (material.name === 'board-pattern') shadePattern(material, 'board', qubits, glow, fade);
    else fadeAround(material, fade);
    if (!chipPart) {
      material.roughness = Math.max(material.roughness, 0.4);
      material.envMap = environments.board;
      material.envMapIntensity = BOARD_ENVIRONMENT_INTENSITY;
      surroundings.push(material);
    }
  });

  // The metal of the chip mostly mirrors the environment; a faint warm key from behind and
  // violet lights far out on the sides, grazing the board.
  const key = new DirectionalLight(0xffe2b0, 0.2);
  key.position.set(4, 10, -8);
  scene.add(key);
  const violet = [new Vector3(-16, 1.5, 6), new Vector3(14, 1.2, 10)].map((position) => {
    const light = new PointLight(0xb876b0, 6, 40, 2);
    light.position.copy(position);
    scene.add(light);
    return light;
  });

  const camera = new PerspectiveCamera(30, 1, 1, 120);
  const particles = new LandingParticles(scene, qubits, { count: mobile ? 160 : 360 });

  let angle = 0;
  let time = 0;
  let fit = 1;
  const view = { width: 1, height: 1, small: false };

  return {
    update(delta, arrival, closeUp, turn) {
      time += delta;
      angle += delta * IDLE_SPEED;
      // The camera keeps coming down from the dive into the cryostat, slowing to an overview of
      // the chip; then it gets close to the cross of qubits.
      const come = 1 - (1 - arrival) ** 3;
      const close = smoothstep(0, 1, closeUp);
      const elevation = lerp(lerp(1.15, 0.95, come), 0.7, close);
      const distance = lerp(lerp(40, 24, come), 17, close) * fit;
      // Turning the chip one way is moving the camera around it the other way.
      const azimuth = 0.6 + angle - turn;
      // The environments turn with the camera, so the band of light stays on the chip.
      scene.environmentRotation.y = azimuth;
      for (const material of surroundings) material.envMapRotation.y = azimuth;
      camera.position.set(
        centre.x + distance * Math.cos(elevation) * Math.sin(azimuth),
        centre.y + distance * Math.sin(elevation),
        centre.z + distance * Math.cos(elevation) * Math.cos(azimuth),
      );
      camera.lookAt(centre);
      if (view.small) camera.clearViewOffset();
      else {
        const shift = lerp(CHIP_SHIFT, CLOSE_SHIFT, smoothstep(0.7, 1, closeUp));
        const { width, height } = view;
        camera.setViewOffset(width, height, -width * shift, 0, width, height);
      }

      const landed = particles.update(delta, closeUp);
      landed.forEach((share, i) => {
        glow[i] =
          GLOW_STRENGTH * smoothstep(0, 1, share) * (0.88 + 0.12 * Math.sin(time * 1.3 + i));
      });
    },
    render(renderer) {
      renderer.render(scene, camera);
    },
    prepare(renderer, pause) {
      return prepareShaders(renderer, scene, camera, pause);
    },
    resize(width, height, small, pixelRatio) {
      Object.assign(view, { width, height, small });
      camera.aspect = width / Math.max(1, height);
      fit = small ? Math.max(1, SMALL_FIT / camera.aspect) : 1;
      camera.updateProjectionMatrix();
      particles.setAspect(camera.aspect);
      particles.setPixelRatio(pixelRatio);
    },
    setPointer(x, y, active) {
      particles.setPointer(x, y, active);
    },
    covers(x, y) {
      // The square around the chip as it looks from the camera; on screen, in pixels.
      const corner = new Vector3();
      const quad = CORNERS.map(([sx, sz]) => {
        corner.set(centre.x + sx * PICK_HALF, centre.y, centre.z + sz * PICK_HALF).project(camera);
        return [corner.x * view.width, corner.y * view.height] as const;
      });
      const px = x * view.width;
      const py = y * view.height;
      let side = 0;
      for (let i = 0; i < quad.length; i++) {
        const [ax, ay] = quad[i] ?? [0, 0];
        const [bx, by] = quad[(i + 1) % quad.length] ?? [0, 0];
        const turn = Math.sign((bx - ax) * (py - ay) - (by - ay) * (px - ax));
        if (turn === 0) continue;
        if (side === 0) side = turn;
        else if (turn !== side) return false;
      }
      return true;
    },
    dispose() {
      particles.dispose();
      environments.chip.dispose();
      environments.board.dispose();
      violet.forEach((light) => light.dispose());
      key.dispose();
      gltf.scene.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials: Material[] = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        materials.forEach((material) => {
          (material as MeshStandardMaterial).map?.dispose();
          material.dispose();
        });
      });
    },
  };
}

/**
 * Chip and board tops: their image is a mask, not a colour (red: metal, green: air bridges on
 * the chip, blue: qubit islands). Metal and bare surface get their own colour, roughness and
 * metalness; each qubit glows by its own amount (the nearest qubit to the fragment).
 */
function shadePattern(
  material: MeshStandardMaterial,
  kind: 'chip' | 'board',
  qubits: Vector3[],
  glow: number[],
  fade: Fade,
) {
  // The patterned faces lie just above the top of their box: they must win the depth test.
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -4;
  if (material.map) {
    material.map.colorSpace = NoColorSpace;
    material.map.anisotropy = 8;
    material.map.needsUpdate = true;
  }
  material.color.set(0xffffff);
  const chip = kind === 'chip';
  // Same function source for both kinds: without its own key, three.js would share one program.
  material.customProgramCacheKey = () => `pattern-${kind}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uBare: { value: chip ? SUBSTRATE : BOARD },
      uMetal: { value: chip ? METAL : GOLD },
      uGlowColor: { value: GLOW },
      uQubits: { value: qubits },
      uQubitGlow: { value: glow },
      ...fadeUniforms(fade),
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPatternWorld;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvPatternWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vPatternWorld;
        uniform vec3 uBare;
        uniform vec3 uMetal;
        uniform vec3 uGlowColor;
        uniform vec3 uQubits[${qubits.length}];
        uniform float uQubitGlow[${qubits.length}];
        ${FADE_UNIFORMS}`,
      )
      .replace(
        '#include <opaque_fragment>',
        `${fadeChunk('vPatternWorld')}\n#include <opaque_fragment>`,
      )
      .replace(
        '#include <map_fragment>',
        `vec3 pattern = texture2D(map, vMapUv).rgb;
        diffuseColor.rgb = mix(uBare, uMetal, pattern.r);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = ${chip ? 'mix(0.3, 0.14, pattern.r) - 0.06 * pattern.g' : 'mix(0.6, 0.18, pattern.r)'};`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        '#include <metalnessmap_fragment>\nmetalnessFactor = pattern.r;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        chip
          ? `#include <emissivemap_fragment>
          float nearest = 1e9;
          float qubitGlow = 0.0;
          for (int i = 0; i < ${qubits.length}; i++) {
            vec2 offset = vPatternWorld.xz - uQubits[i].xz;
            float distance2 = dot(offset, offset);
            if (distance2 < nearest) {
              nearest = distance2;
              qubitGlow = uQubitGlow[i];
            }
          }
          float halo = ${HALO_STRENGTH.toFixed(3)} * exp(-nearest / ${(HALO_RADIUS * HALO_RADIUS).toFixed(3)});
          totalEmissiveRadiance += uGlowColor * (pattern.b + halo) * qubitGlow;`
          : '#include <emissivemap_fragment>',
      );
  };
}

interface Fade {
  centre: Vector2;
  inner: number;
  outer: number;
  /** Brightness of the surface before the fade. */
  level: number;
}

const FADE_UNIFORMS =
  'uniform vec2 uFadeCentre;\nuniform vec2 uFadeRange;\nuniform float uFadeLevel;';

const fadeUniforms = (fade: Fade) => ({
  uFadeCentre: { value: fade.centre },
  uFadeRange: { value: new Vector2(fade.inner, fade.outer) },
  uFadeLevel: { value: fade.level },
});

/** Darkens the light leaving a surface with its distance from the centre of the chip. */
const fadeChunk = (world: string) =>
  `outgoingLight *= uFadeLevel * (1.0 - smoothstep(uFadeRange.x, uFadeRange.y, length(${world}.xz - uFadeCentre)));`;

/** The fade alone, for the plain materials around the chip. */
function fadeAround(material: MeshStandardMaterial, fade: Fade) {
  material.customProgramCacheKey = () => 'fade-around';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fadeUniforms(fade));
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFadeWorld;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvFadeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFadeWorld;\n${FADE_UNIFORMS}`)
      .replace(
        '#include <opaque_fragment>',
        `${fadeChunk('vFadeWorld')}\n#include <opaque_fragment>`,
      );
  };
}

const vertexShader = /* glsl */ `
  uniform float uLanding;
  uniform float uClock;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uAspect;
  attribute vec3 aTarget;
  attribute vec3 aPhase;
  attribute vec3 aColor;
  attribute float aDelay;
  attribute float aScale;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float flight = clamp((uLanding - aDelay) / ${FLIGHT}, 0.0, 1.0);
    float eased = flight * flight * (3.0 - 2.0 * flight);
    // A tiny vibration in the lattice, gone once the particle has landed.
    vec3 vibration = sin(uClock * aPhase.zxy * 1.5 + aPhase) * 0.004 * (1.0 - eased);
    vec3 p = mix(position, aTarget, eased) + vibration;
    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    vec2 screen = (gl_Position.xy / gl_Position.w - uPointer) * vec2(uAspect, 1.0) / 0.42;
    float near = max(0.0, 1.0 - dot(screen, screen));
    float light = near * near * uPointerStrength;

    gl_PointSize = uSize * aScale * uPixelRatio / -viewPosition.z * mix(1.0, 0.6, eased) * (1.0 + 0.6 * light);
    vColor = aColor;
    vAlpha = min(1.0, aAlpha + light * 0.6) * (1.0 - smoothstep(0.8, 1.0, flight));
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float glow = smoothstep(0.5, 0.0, d);
    glow *= glow;
    gl_FragColor = vec4(vColor * glow * vAlpha, glow * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const PALETTE = ['#751f72', '#b876b0', '#e891db'].map((hex) => new Color(hex));
const LATTICE_SPACING = 0.7;
/** Outer radius of the ring of a qubit, in mm (QUBIT_RING in scripts/blender/chip.py). */
const QUBIT_RADIUS = 0.085;

/**
 * Particles on a lattice above the chip, each one bound for a point on the ring of one qubit.
 * The qubits are reached in turn, the centre one first.
 */
class LandingParticles {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  private readonly delays: number[] = [];
  private readonly owners: number[] = [];
  private readonly counts: number[];
  private readonly pointer = { target: new Vector2(), active: false };
  private clock = 0;

  constructor(scene: Scene, qubits: Vector3[], { count }: { count: number }) {
    const centre = qubits[0] ?? new Vector3();
    const start = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const phase = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const delays = new Float32Array(count);
    const scales = new Float32Array(count);
    const alphas = new Float32Array(count);
    this.counts = qubits.map(() => 0);

    // Distinct lattice sites in a box above the chip.
    const sites = new Set<string>();
    for (let i = 0; i < count; i++) {
      let gx = 0;
      let gy = 0;
      let gz = 0;
      do {
        gx = Math.round(random(-6.5, 6.5));
        gy = Math.round(random(2.5, 7.5));
        gz = Math.round(random(-6.5, 6.5));
      } while (sites.has(`${gx},${gy},${gz}`) && sites.size < 2000);
      sites.add(`${gx},${gy},${gz}`);
      start.set(
        [
          centre.x + gx * LATTICE_SPACING,
          centre.y + gy * LATTICE_SPACING,
          centre.z + gz * LATTICE_SPACING,
        ],
        i * 3,
      );

      const owner = i % qubits.length;
      const qubit = qubits[owner] ?? centre;
      const radius = random(0, QUBIT_RADIUS);
      const turn = random(0, 2 * Math.PI);
      target.set(
        [qubit.x + radius * Math.cos(turn), qubit.y + 0.02, qubit.z + radius * Math.sin(turn)],
        i * 3,
      );
      this.owners.push(owner);
      this.counts[owner] = (this.counts[owner] ?? 0) + 1;
      const delay = owner * 0.09 + random(0, 0.3);
      this.delays.push(delay);
      delays[i] = delay;

      phase.set([random(0, 6.28), random(0, 6.28), random(0, 6.28)], i * 3);
      const color = PALETTE[i % PALETTE.length] ?? GLOW;
      colors.set([color.r, color.g, color.b], i * 3);
      scales[i] = random(2.1, 2.7);
      alphas[i] = random(0.55, 0.85);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(start, 3));
    geometry.setAttribute('aTarget', new BufferAttribute(target, 3));
    geometry.setAttribute('aPhase', new BufferAttribute(phase, 3));
    geometry.setAttribute('aColor', new BufferAttribute(colors, 3));
    geometry.setAttribute('aDelay', new BufferAttribute(delays, 1));
    geometry.setAttribute('aScale', new BufferAttribute(scales, 1));
    geometry.setAttribute('aAlpha', new BufferAttribute(alphas, 1));

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uLanding: { value: 0 },
        uClock: { value: 0 },
        uSize: { value: 130 },
        uPixelRatio: { value: 1 },
        uPointer: { value: new Vector2() },
        uPointerStrength: { value: 0 },
        uAspect: { value: 1 },
      },
    });
    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** Returns, for each qubit, the share of its particles that have landed. */
  update(delta: number, landing: number): number[] {
    this.clock += delta;
    const uniforms = this.points.material.uniforms;
    uniforms.uLanding.value = landing;
    uniforms.uClock.value = this.clock;
    const pointer: Vector2 = uniforms.uPointer.value;
    pointer.lerp(this.pointer.target, Math.min(1, delta * 6));
    uniforms.uPointerStrength.value +=
      ((this.pointer.active ? 1 : 0) - uniforms.uPointerStrength.value) * Math.min(1, delta * 3);

    const landed = this.counts.map(() => 0);
    this.delays.forEach((delay, i) => {
      const owner = this.owners[i] ?? 0;
      if ((landing - delay) / FLIGHT >= 0.9) landed[owner] = (landed[owner] ?? 0) + 1;
    });
    return landed.map((value, i) => value / Math.max(1, this.counts[i] ?? 1));
  }

  setPointer(x: number, y: number, active: boolean) {
    const uniforms = this.points.material.uniforms;
    if (active && !this.pointer.active && uniforms.uPointerStrength.value < 0.01) {
      (uniforms.uPointer.value as Vector2).set(x, y);
    }
    this.pointer.target.set(x, y);
    this.pointer.active = active;
  }

  setAspect(aspect: number) {
    this.points.material.uniforms.uAspect.value = aspect;
  }

  setPixelRatio(pixelRatio: number) {
    this.points.material.uniforms.uPixelRatio.value = pixelRatio;
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
