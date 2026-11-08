import type { Camera, Light, Material, Object3D, Scene, WebGLRenderer } from 'three';

/** Lets the browser handle input and paint before the next step of a long start-up. */
export function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Layer used only while the shaders are prepared. */
const WARM_UP_LAYER = 31;
/** Work done in one go before giving the browser a turn, in milliseconds. */
const STEP_BUDGET = 10;

type Drawn = Object3D & { material: Material | Material[] };

/**
 * Prepares the shaders of a scene before its first frame without blocking the page for long.
 * compileAsync lets the GPU compile them in parallel where the browser supports it; then each
 * material is drawn once on its own, giving the browser a turn in between, because some drivers
 * compile a shader (or finish compiling it) only when it is first drawn. The draws touch a single
 * pixel of the canvas, which the next frame covers.
 */
export async function prepareShaders(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
  await renderer.compileAsync(scene, camera);

  const drawn: Drawn[] = [];
  const materials = new Set<Material>();
  scene.traverseVisible((object) => {
    const material = (object as Partial<Drawn>).material;
    if (!material) return;
    drawn.push(object as Drawn);
    for (const item of Array.isArray(material) ? material : [material]) materials.add(item);
  });
  // The lights decide which shader a material gets, so they stay in every draw.
  const lights: Object3D[] = [];
  scene.traverse((object) => {
    if ((object as Light).isLight) lights.push(object);
  });

  let start = performance.now();
  for (const material of materials) {
    const saved = [...drawn, ...lights].map((object) => [object.layers.mask, object.frustumCulled]);
    const cameraMask = camera.layers.mask;
    for (const object of drawn) {
      const uses = Array.isArray(object.material)
        ? object.material.includes(material)
        : object.material === material;
      object.layers.mask = uses ? 1 << WARM_UP_LAYER : 0;
      object.frustumCulled = false;
    }
    for (const light of lights) light.layers.enable(WARM_UP_LAYER);
    camera.layers.set(WARM_UP_LAYER);
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, 1, 1);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
    camera.layers.mask = cameraMask;
    [...drawn, ...lights].forEach((object, i) => {
      const [mask, culled] = saved[i] as [number, boolean];
      object.layers.mask = mask;
      object.frustumCulled = culled;
    });
    if (performance.now() - start > STEP_BUDGET) {
      await nextTask();
      start = performance.now();
    }
  }
}
