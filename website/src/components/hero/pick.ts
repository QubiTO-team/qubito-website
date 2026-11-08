import { Matrix4, Ray, Vector3, type Box3, type Camera, type Mesh, type Object3D } from 'three';

/** Heights at which the model is measured, from its bottom to its top. */
const SLICES = 96;
/** Points checked along the line of sight, inside the cylinder that holds the model. */
const STEPS = 48;

/**
 * Tells whether a point of the screen is on a model that turns about the vertical axis of its
 * pivot. The model is measured once (lazily, at the first question): its distance from the axis
 * at each height. Then the line of sight through the point is followed through that shape.
 * `bounds` is the model's bounding box in the space of the pivot.
 */
export function createModelPicker(model: Object3D, pivot: Object3D, bounds: Box3) {
  const minY = bounds.min.y;
  const maxY = bounds.max.y;
  let radius: Float32Array | null = null;
  let outer = 0;
  const ray = new Ray();
  const toPivot = new Matrix4();
  const point = new Vector3();

  const slice = (y: number) => Math.floor(((y - minY) / (maxY - minY)) * SLICES);

  const measure = () => {
    const widths = new Float32Array(SLICES);
    pivot.updateMatrixWorld(true);
    toPivot.copy(pivot.matrixWorld).invert();
    const local = new Matrix4();
    model.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const position = mesh.geometry.getAttribute('position');
      local.multiplyMatrices(toPivot, mesh.matrixWorld);
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(local);
        const index = slice(point.y);
        if (index < 0 || index >= SLICES) continue;
        widths[index] = Math.max(widths[index] ?? 0, Math.hypot(point.x, point.z));
      }
    });
    // Each height also takes the width of the ones next to it, so that the thin gaps between the
    // plates count as part of the model.
    radius = widths.map((width, i) => Math.max(width, widths[i - 1] ?? 0, widths[i + 1] ?? 0));
    outer = Math.max(...radius);
  };

  /** Whether the point (normalized device coordinates of `camera`) is on the model. */
  return (x: number, y: number, camera: Camera) => {
    if (!radius) measure();
    if (!radius || outer <= 0) return false;
    ray.origin.setFromMatrixPosition(camera.matrixWorld);
    ray.direction.set(x, y, 0.5).unproject(camera).sub(ray.origin).normalize();
    ray.applyMatrix4(toPivot.copy(pivot.matrixWorld).invert());
    const { origin: o, direction: d } = ray;
    // Stretch of the line of sight inside the cylinder of radius `outer` around the axis.
    const a = d.x * d.x + d.z * d.z;
    const b = 2 * (o.x * d.x + o.z * d.z);
    const c = o.x * o.x + o.z * o.z - outer * outer;
    const disc = b * b - 4 * a * c;
    if (a < 1e-9 || disc < 0) return false;
    const near = (-b - Math.sqrt(disc)) / (2 * a);
    const far = (-b + Math.sqrt(disc)) / (2 * a);
    for (let i = 0; i <= STEPS; i++) {
      point
        .copy(d)
        .multiplyScalar(near + ((far - near) * i) / STEPS)
        .add(o);
      const width = radius[slice(point.y)];
      if (width !== undefined && Math.hypot(point.x, point.z) <= width) return true;
    }
    return false;
  };
}
