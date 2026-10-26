import {
  BackSide,
  BoxGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type BufferGeometry,
  type Side,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';

/**
 * Prepares the reflections of the metals using blur passes only, as three.js did before version
 * r180. Its newer filter (GGX) samples 256 directions per pixel, and compiling it freezes the page
 * for about 300 ms even on a fast graphics card; on these polished metals the result looks the
 * same.
 */
export function createPmremGenerator(renderer: WebGLRenderer): PMREMGenerator {
  return new BlurPMREMGenerator(renderer);
}

/** Internals of three.js's PMREMGenerator (r186) that the blur-only filter relies on. */
interface PmremInternals {
  _renderer: WebGLRenderer;
  _lodMax: number;
  _sizeLods: number[];
  _blur(target: WebGLRenderTarget, lodIn: number, lodOut: number, sigma: number): void;
  _applyPMREM(target: WebGLRenderTarget): void;
}

/** Smallest level of the map with its own resolution; the levels after it are extra blurs. */
const LOD_MIN = 4;
/** Blur of the extra levels, in radians (the values of three.js before r180). */
const EXTRA_LOD_SIGMA = [0.125, 0.215, 0.35, 0.446, 0.526, 0.582];

class BlurPMREMGenerator extends PMREMGenerator {
  _applyPMREM(target: WebGLRenderTarget) {
    const self = this as unknown as PmremInternals;
    const sizes = self._sizeLods;
    // If a later three.js changes these internals, keep its own filter.
    if (typeof self._blur !== 'function' || !Array.isArray(sizes)) {
      (PMREMGenerator.prototype as unknown as PmremInternals)._applyPMREM.call(this, target);
      return;
    }
    const sigma = (lod: number) => {
      if (lod === 0) return 0;
      if (lod > self._lodMax - LOD_MIN)
        return EXTRA_LOD_SIGMA[lod - self._lodMax + LOD_MIN - 1] ?? 1;
      return 1 / (sizes[lod] ?? 1);
    };
    const renderer = self._renderer;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    // Each level is the previous one blurred by the difference of their blurs.
    for (let lod = 1; lod < sizes.length; lod++) {
      self._blur(target, lod - 1, lod, Math.sqrt(sigma(lod) ** 2 - sigma(lod - 1) ** 2));
    }
    renderer.autoClear = autoClear;
  }
}

/*
 * Environment reflected by the metals: a dark lab with ceiling strip lights, a warm softbox,
 * a cool window and a violet glow from below. Varied reflections make the gold read as real
 * metal, where a uniform room makes it look like plastic. Without `violet`, the room is a lighter
 * neutral grey and has no violet glows: polished silver mirrors them so clearly that it turns
 * pink, and a dark room makes it look like black chrome.
 */
export function createLabEnvironment(pmrem: PMREMGenerator, { violet = true } = {}): Texture {
  return bake(pmrem, (add) => {
    add(new BoxGeometry(14, 8, 14), violet ? '#1a1620' : '#34353a', 1, [0, 0, 0.001], BackSide);
    for (let i = -2; i <= 2; i++) {
      add(new PlaneGeometry(0.35, 6), '#ffffff', 5, [i * 1.8, 3.8, 0]);
    }
    add(new PlaneGeometry(3, 2.2), '#ffe2b0', 6, [-4.5, 1.2, 3.5]);
    add(new PlaneGeometry(2.2, 3.5), '#96acd4', 3, [5.5, 0.6, -2.5]);
    if (violet) {
      add(new PlaneGeometry(8, 1.2), '#751f72', 2.5, [0, -3.8, 2]);
      add(new PlaneGeometry(1.2, 1.2), '#e891db', 3, [-2, -1, -5]);
    }
  });
}

/*
 * Environment of the chip: a light grey room, so the metal of the chip never mirrors anything
 * dark (dark gaps would sweep across the chip as bands while the camera moves). Its gloss comes
 * from brighter strips: two sharp ones on the far side (-z, seen from a camera on +z), one low
 * and one high, so a band of light crosses the chip whatever the height of the camera, and
 * softer ones in between. A violet glow low on a side. Turned with the camera
 * (Scene.environmentRotation), the bands stay in place while the camera moves.
 */
export function createChipEnvironment(pmrem: PMREMGenerator): Texture {
  return bake(pmrem, (add) => {
    add(new BoxGeometry(14, 8, 14), '#6e717c', 1, [0, 0, 0.001], BackSide);
    add(new PlaneGeometry(9, 0.25), '#fff4e6', 3.5, [0, 3.2, -4.2]);
    add(new PlaneGeometry(9, 0.2), '#fff4e6', 1.8, [0, 3.4, -1.95]);
    add(new PlaneGeometry(9, 0.6), '#eceef2', 0.8, [0, 2.0, -4.6]);
    add(new PlaneGeometry(9, 0.6), '#eceef2', 0.7, [0, 3.95, -0.9]);
    add(new PlaneGeometry(9, 0.8), '#eceef2', 0.7, [0, 3.95, 0.5]);
    add(new PlaneGeometry(3, 1.5), '#b876b0', 1.4, [-5.5, -0.5, 1.5]);
  });
}

/*
 * Environment of the gold board around the chip: warm panels high up, with dark gaps between
 * them, so the flat board mirrors light from the far side (bright, pale gold) to the side of
 * the camera (deeper gold), like the gold of the cryostat.
 */
export function createGoldEnvironment(pmrem: PMREMGenerator): Texture {
  return bake(pmrem, (add) => {
    add(new BoxGeometry(14, 8, 14), '#1a1620', 1, [0, 0, 0.001], BackSide);
    add(new PlaneGeometry(7, 1.1), '#fff1d6', 1.6, [0, 2.6, -4.5]);
    add(new PlaneGeometry(7, 0.9), '#ffe2b0', 0.75, [0, 3.9, -2.4]);
    add(new PlaneGeometry(8, 1.2), '#f3dcb5', 0.45, [0, 3.95, 0.6]);
    add(new PlaneGeometry(2, 3), '#96acd4', 0.6, [5.5, 1.5, -3]);
  });
}

type Add = (
  geometry: BufferGeometry,
  color: string,
  intensity: number,
  position: [number, number, number],
  side?: Side,
) => void;

/** Renders a scene of glowing panels, built by `build`, into a prefiltered environment map. */
function bake(pmrem: PMREMGenerator, build: (add: Add) => void): Texture {
  const scene = new Scene();
  const disposables: { dispose(): void }[] = [];

  const add = (
    geometry: BufferGeometry,
    color: string,
    intensity: number,
    position: [number, number, number],
    side: Side = DoubleSide,
  ) => {
    const material = new MeshBasicMaterial({
      color: new Color(color).multiplyScalar(intensity),
      side,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    disposables.push(geometry, material);
  };

  build(add);

  const texture = pmrem.fromScene(scene, 0.03).texture;
  disposables.forEach((item) => item.dispose());
  return texture;
}
