import { Color, Matrix4, type Mesh, type MeshStandardMaterial } from 'three';

/*
 * Procedural surface detail for the metals of the cryostat, so they do not look CG-smooth:
 * uneven roughness, a slight colour variation, a micro bump and, on the plates, faint
 * concentric turning marks. Coordinates are in model space (meters), so the detail sticks to
 * the surface while the model moves, and no texture has to be downloaded.
 */

export interface SurfaceDetail {
  /** Frequency of the noise, per meter. */
  scale: number;
  /** Roughness is multiplied by a value between these two. */
  roughness: [number, number];
  /** Relative colour variation (0.06 = ±6%). */
  tint: number;
  /** Height of the micro bump, in meters. */
  bump: number;
  /** Strength of the concentric turning marks around the vertical axis (0 = none). */
  rings: number;
  /**
   * How much the direct lights lose their colour on this metal (0 = none, 1 = white), so that
   * silver stays silver under the violet lights of the particles.
   */
  neutral?: number;
}

// Kept faint: polished metals, with just enough variation not to look like plastic. Stronger
// values make the metals look hazy.
export const SURFACES: Record<string, SurfaceDetail> = {
  gold: { scale: 38, roughness: [0.85, 1.15], tint: 0.03, bump: 0.00004, rings: 0.03 },
  aluminium: {
    scale: 55,
    roughness: [0.85, 1.15],
    tint: 0.02,
    bump: 0.00003,
    rings: 0.03,
    neutral: 0.8,
  },
  steel: { scale: 60, roughness: [0.85, 1.15], tint: 0.02, bump: 0.00003, rings: 0, neutral: 0.8 },
  coax: { scale: 90, roughness: [0.9, 1.1], tint: 0.02, bump: 0.00002, rings: 0, neutral: 0.8 },
  'coax-dark': {
    scale: 90,
    roughness: [0.9, 1.1],
    tint: 0.03,
    bump: 0.00002,
    rings: 0,
    neutral: 0.8,
  },
};

const noiseChunk = /* glsl */ `
  varying vec3 vDetailPosition;
  uniform float uDetailScale;
  uniform vec2 uDetailRoughness;
  uniform float uDetailTint;
  uniform float uDetailBump;
  uniform float uDetailRings;
  uniform float uDetailNeutral;

  float detailHash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  float detailNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(detailHash(i), detailHash(i + vec3(1, 0, 0)), f.x),
          mix(detailHash(i + vec3(0, 1, 0)), detailHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(detailHash(i + vec3(0, 0, 1)), detailHash(i + vec3(1, 0, 1)), f.x),
          mix(detailHash(i + vec3(0, 1, 1)), detailHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float detailFbm(vec3 p) {
    return 0.55 * detailNoise(p) + 0.3 * detailNoise(p * 2.7 + 7.1) + 0.15 * detailNoise(p * 7.3 + 3.7);
  }

  /* Turning marks: rings around the vertical axis, faded out where they would alias. */
  float detailRings() {
    float phase = length(vDetailPosition.xz) * 900.0;
    float fade = clamp(1.0 - fwidth(phase) * 0.4, 0.0, 1.0);
    return sin(phase) * fade;
  }

  vec3 detailPerturb(vec3 surfacePosition, vec3 surfaceNormal, vec2 dHdxy, float faceDirection) {
    vec3 sigmaX = normalize(dFdx(surfacePosition));
    vec3 sigmaY = normalize(dFdy(surfacePosition));
    vec3 r1 = cross(sigmaY, surfaceNormal);
    vec3 r2 = cross(surfaceNormal, sigmaX);
    float determinant = dot(sigmaX, r1) * faceDirection;
    vec3 gradient = sign(determinant) * (dHdxy.x * r1 + dHdxy.y * r2);
    return normalize(abs(determinant) * surfaceNormal - gradient);
  }
`;

/**
 * Gives the mesh its own copy of the material with the surface detail. The copy is needed
 * because every mesh has its own quantization matrix (uDetailMatrix).
 */
export function addSurfaceDetail(mesh: Mesh, detail: SurfaceDetail, modelSpace: Matrix4) {
  const material = (mesh.material as MeshStandardMaterial).clone();
  material.userData.own = true;
  material.customProgramCacheKey = () => 'surface-detail';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uDetailMatrix: { value: modelSpace },
      uDetailScale: { value: detail.scale },
      uDetailRoughness: { value: detail.roughness },
      uDetailTint: { value: detail.tint },
      uDetailBump: { value: detail.bump },
      uDetailRings: { value: detail.rings },
      uDetailNeutral: { value: detail.neutral ?? 0 },
    });
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vDetailPosition;\nuniform mat4 uDetailMatrix;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvDetailPosition = (uDetailMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${noiseChunk}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float detailValue = detailFbm(vDetailPosition * uDetailScale);
        float detailRing = uDetailRings > 0.0 ? detailRings() : 0.0;
        diffuseColor.rgb *= 1.0 + (detailFbm(vDetailPosition * uDetailScale * 0.25 + 11.0) - 0.5) * 2.0 * uDetailTint;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(
          roughnessFactor * mix(uDetailRoughness.x, uDetailRoughness.y, detailValue) + detailRing * uDetailRings,
          0.04, 1.0);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        float detailHeight = (detailValue - 0.5) * uDetailBump + detailRing * uDetailBump * 0.35;
        normal = detailPerturb(-vViewPosition, normal, vec2(dFdx(detailHeight), dFdy(detailHeight)), faceDirection);`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        vec3 directGrey = vec3(dot(reflectedLight.directSpecular, vec3(0.3333)));
        reflectedLight.directSpecular = mix(reflectedLight.directSpecular, directGrey, uDetailNeutral);`,
      );
  };
  mesh.material = material;
}

/**
 * Light along the rim of a plate (the faces whose normal is horizontal), on top of the surface
 * detail if the mesh has it. Returns the uniform with its strength (0 = off).
 */
export function addRimGlow(mesh: Mesh, color: Color): { value: number } {
  let material = mesh.material as MeshStandardMaterial;
  if (!material.userData.own) {
    material = material.clone();
    material.userData.own = true;
    mesh.material = material;
  }
  const strength = { value: 0 };
  const detail = material.onBeforeCompile.bind(material);
  // Plates with and without the surface detail need programs of their own.
  const key = material.customProgramCacheKey();
  material.customProgramCacheKey = () => `${key}+rim`;
  material.onBeforeCompile = (shader, renderer) => {
    detail(shader, renderer);
    Object.assign(shader.uniforms, { uRimGlow: strength, uRimColor: { value: color } });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vRimSide;')
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vRimSide = 1.0 - abs(normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz).y);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vRimSide;\nuniform float uRimGlow;\nuniform vec3 uRimColor;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uRimColor * uRimGlow * smoothstep(0.6, 0.95, vRimSide);`,
      );
  };
  return strength;
}
