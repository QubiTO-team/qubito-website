import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PointLight,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Scene,
} from 'three';

/*
 * Thermal particles: violet points that jiggle like hot atoms. At the warm stages there are
 * many, of very different sizes, moving fast and wide. Cooling down they thin out, become alike
 * and slow down, until at 10 mK the ones left settle on a regular lattice. They never stop
 * completely: a tiny vibration always remains.
 *
 * A few "lead" particles near the model are also lights, so their violet glow moves across the
 * gold plates; they look like any other small particle. With a mouse or a trackpad, the particles
 * near the pointer light up.
 */

/** Amplitude of the vibration left at the coldest stage, in scene units. */
const VIBRATION = 0.0006;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uClock;
  uniform float uAmplitude;
  uniform float uOrder;
  uniform float uColdness;
  uniform float uDensity;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFollowX;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uAspect;
  uniform float uFade;
  attribute vec3 aLattice;
  attribute vec3 aPhase;
  attribute vec3 aFrequency;
  attribute vec3 aColor;
  attribute float aScale;
  attribute float aColdScale;
  attribute float aAlpha;
  attribute float aRank;
  attribute float aFollow;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 wobble = sin(uTime * aFrequency + aPhase) + 0.5 * sin(uTime * aFrequency.yzx * 2.3 + aPhase.zxy);
    vec3 vibration = sin(uClock * aFrequency.zxy * 1.5 + aPhase.yzx) * ${VIBRATION};
    vec3 settled = mix(position, aLattice, uOrder);
    vec3 p = settled + wobble * uAmplitude + vibration + vec3(uFollowX * aFollow, 0.0, 0.0);
    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    // Light from the pointer; the lead particles keep their own size and brightness.
    vec2 screen = (gl_Position.xy / gl_Position.w - uPointer) * vec2(uAspect, 1.0) / 0.42;
    float near = max(0.0, 1.0 - dot(screen, screen));
    float light = near * near * uPointerStrength * (1.0 - aFollow);

    // Cooling down, sizes and brightness become alike and particles fade out one by one.
    float calm = smoothstep(0.1, 0.95, uColdness);
    float present = 1.0 - smoothstep(uDensity - 0.04, uDensity + 0.04, aRank);
    float scale = mix(aScale, aColdScale, calm);
    float alpha = mix(aAlpha, 0.65, calm * 0.8);

    gl_PointSize = uSize * scale * uPixelRatio / -viewPosition.z * (1.0 + 0.6 * light) * step(0.001, present);
    vColor = aColor;
    vAlpha = min(1.0, alpha + light * 0.6) * present * uFade;
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

export interface ParticleOptions {
  /** Particles at the warmest stage; at 10 mK about a third of them are left. */
  count: number;
  lightCount: number;
  pixelRatio: number;
}

const PALETTE = ['#751f72', '#b876b0', '#e891db'].map((hex) => new Color(hex));
const LIGHT_COLORS = ['#e891db', '#b876b0'].map((hex) => new Color(hex));
const LATTICE_SPACING = 0.3;
/** Share of the particles still visible at 10 mK. */
const COLD_DENSITY = 0.38;

export class ThermalParticles {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  private readonly lights: PointLight[] = [];
  private readonly base: Float32Array;
  private readonly lattice: Float32Array;
  private readonly phase: Float32Array;
  private readonly frequency: Float32Array;
  private time = 0;
  private clock = 0;
  private readonly pointer = { target: new Vector2(), active: false };
  private readonly lightPosition = new Vector3();

  constructor(scene: Scene, { count, lightCount, pixelRatio }: ParticleOptions) {
    this.base = new Float32Array(count * 3);
    this.lattice = new Float32Array(count * 3);
    this.phase = new Float32Array(count * 3);
    this.frequency = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const coldScales = new Float32Array(count);
    const alphas = new Float32Array(count);
    const ranks = new Float32Array(count);
    const follow = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const lead = i < lightCount;
      // Lead particles stay close to the model (offset at runtime by uFollowX), the others
      // fill the whole view.
      const x = lead ? random(-0.45, 0.45) : random(-2.6, 2.6);
      const y = lead ? random(-0.85, 0.45) : random(-1.5, 1.5);
      const z = lead ? random(0.2, 0.5) : random(-1.8, 0.9);
      this.base.set([x, y, z], i * 3);
      this.lattice.set(
        [x, y, z].map((v) => Math.round(v / LATTICE_SPACING) * LATTICE_SPACING),
        i * 3,
      );
      this.phase.set([random(0, 6.28), random(0, 6.28), random(0, 6.28)], i * 3);
      this.frequency.set([random(0.5, 1.6), random(0.5, 1.6), random(0.5, 1.6)], i * 3);
      const color = lead ? LIGHT_COLORS[i % LIGHT_COLORS.length] : PALETTE[i % PALETTE.length];
      colors.set([color.r, color.g, color.b], i * 3);
      // Mostly small particles and a few large ones; the larger, the fainter.
      const large = Math.random() ** 3;
      scales[i] = lead ? random(1.6, 2.6) : 1.2 + 5 * large;
      coldScales[i] = random(2.1, 2.7);
      alphas[i] = lead ? random(0.6, 0.85) : random(0.35, 0.85) * (1 - 0.45 * large);
      ranks[i] = lead ? 0 : Math.random();
      follow[i] = lead ? 1 : 0;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.base, 3));
    geometry.setAttribute('aLattice', new BufferAttribute(this.lattice, 3));
    geometry.setAttribute('aPhase', new BufferAttribute(this.phase, 3));
    geometry.setAttribute('aFrequency', new BufferAttribute(this.frequency, 3));
    geometry.setAttribute('aColor', new BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new BufferAttribute(scales, 1));
    geometry.setAttribute('aColdScale', new BufferAttribute(coldScales, 1));
    geometry.setAttribute('aAlpha', new BufferAttribute(alphas, 1));
    geometry.setAttribute('aRank', new BufferAttribute(ranks, 1));
    geometry.setAttribute('aFollow', new BufferAttribute(follow, 1));

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uClock: { value: 0 },
        uAmplitude: { value: 0.06 },
        uOrder: { value: 0 },
        uColdness: { value: 0 },
        uDensity: { value: 1 },
        uSize: { value: 26 },
        uPixelRatio: { value: pixelRatio },
        uFollowX: { value: 0 },
        uPointer: { value: new Vector2() },
        uPointerStrength: { value: 0 },
        uAspect: { value: 1 },
        uFade: { value: 1 },
      },
    });

    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    for (let i = 0; i < lightCount; i++) {
      const light = new PointLight(LIGHT_COLORS[i % LIGHT_COLORS.length], 1.4, 1.2, 2);
      this.lights.push(light);
      scene.add(light);
    }
  }

  /** coldness: 0 at 300 K, 1 at 10 mK. followX: horizontal position of the model. */
  update(delta: number, coldness: number, followX: number) {
    const speed = lerp(1, 0.07, coldness);
    const amplitude = lerp(0.07, 0.0008, coldness);
    const order = smoothstep(0.45, 1, coldness);
    this.time += delta * speed;
    this.clock += delta;

    const uniforms = this.points.material.uniforms;
    uniforms.uTime.value = this.time;
    uniforms.uClock.value = this.clock;
    uniforms.uAmplitude.value = amplitude;
    uniforms.uOrder.value = order;
    uniforms.uColdness.value = coldness;
    uniforms.uDensity.value = lerp(1, COLD_DENSITY, coldness);
    uniforms.uFollowX.value = followX;

    // The pointer light follows the pointer with a short delay and fades in and out.
    const pointer: Vector2 = uniforms.uPointer.value;
    pointer.lerp(this.pointer.target, Math.min(1, delta * 6));
    uniforms.uPointerStrength.value +=
      ((this.pointer.active ? 1 : 0) - uniforms.uPointerStrength.value) * Math.min(1, delta * 3);

    // Same motion as the vertex shader, on the CPU, for the lead particles that carry a light
    // (without the residual vibration, too small to matter).
    const position = this.lightPosition;
    this.lights.forEach((light, i) => {
      const k = i * 3;
      for (let axis = 0; axis < 3; axis++) {
        const next = (axis + 1) % 3;
        const after = (axis + 2) % 3;
        const wobble =
          Math.sin(this.time * this.frequency[k + axis] + this.phase[k + axis]) +
          0.5 * Math.sin(this.time * this.frequency[k + next] * 2.3 + this.phase[k + after]);
        const settled = lerp(this.base[k + axis], this.lattice[k + axis], order);
        position.setComponent(axis, settled + wobble * amplitude);
      }
      light.position.set(position.x + followX, position.y, position.z);
    });
  }

  /** Pointer position in normalized device coordinates; inactive when it leaves the page. */
  setPointer(x: number, y: number, active: boolean) {
    const uniforms = this.points.material.uniforms;
    // Coming back after leaving the page, the light starts where the pointer is.
    if (active && !this.pointer.active && uniforms.uPointerStrength.value < 0.01) {
      (uniforms.uPointer.value as Vector2).set(x, y);
    }
    this.pointer.target.set(x, y);
    this.pointer.active = active;
  }

  setAspect(aspect: number) {
    this.points.material.uniforms.uAspect.value = aspect;
  }

  /** Overall opacity (the particles fade out while the camera dives into the sample holder). */
  setFade(fade: number) {
    this.points.material.uniforms.uFade.value = fade;
  }

  setPixelRatio(pixelRatio: number) {
    this.points.material.uniforms.uPixelRatio.value = pixelRatio;
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.lights.forEach((light) => light.dispose());
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
