"""
Procedural dilution refrigerator ("chandelier") for the QubiTO home page.

A generic model built from scratch, with the features common to these systems: gold-plated
perforated stage plates, perforated brackets, bundles of semi-rigid coaxial lines with rows of
connectors, attenuators, twisted pairs, and a lower section split into a sample tower and a
line tower. It does not reproduce any manufacturer's layout or logo.

Geometry is grouped by material into a few meshes, so the web scene needs few draw calls.
Each stage plate is its own object named "plate-<temperature>" (plate-300K ... plate-10mK);
below the still, plate-100mK and plate-10mK contain the plates of both towers.

Run it with Blender, without its window, from the project root. All the commands that rebuild
the models of the site, including the compression step, are in docs/developer-guide.md.

  blender --background --factory-startup --python scripts/blender/cryostat.py -- \
      --detail high --glb scripts/blender/build/cryostat-desktop-raw.glb

Options (all optional):
  --detail high|low       geometric detail (computers / phones)
  --glb PATH              export the model as binary glTF
  --blend PATH            save a .blend file to open and edit by hand
  --render PATH           render an image with Cycles, lit like the website
  --view hero|side|low|above  camera position for the render
  --samples N             Cycles samples (default 96)
  --resolution WxH        render size (default 1000x1500)
  --transparent           transparent background in the render
"""

import argparse
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description='Build the QubiTO cryostat model.')
    parser.add_argument('--detail', choices=['high', 'low'], default='high')
    parser.add_argument('--glb')
    parser.add_argument('--blend')
    parser.add_argument('--render')
    parser.add_argument('--view', choices=['hero', 'side', 'low', 'above'], default='hero')
    parser.add_argument('--samples', type=int, default=96)
    parser.add_argument('--resolution', default='1000x1500')
    parser.add_argument('--transparent', action='store_true')
    return parser.parse_args(argv)


ARGS = parse_args()
HIGH = ARGS.detail == 'high'

PLATE_SEGMENTS = 128 if HIGH else 56
ROUND_SEGMENTS = 14 if HIGH else 8
TUBE_SIDES = 8 if HIGH else 5
COAX_SIDES = 6 if HIGH else 4
HOLE_SIDES = 10 if HIGH else 6
HOLE_PITCH = 0.022 if HIGH else 0.036
BOLTS_PER_PLATE = 24 if HIGH else 10
LINES_PER_BUNDLE = 6 if HIGH else 3
CURVE_SAMPLES = 6 if HIGH else 3
HELIX_STEPS_PER_TURN = 18 if HIGH else 8

# Main plates, from room temperature down to the still: (label, top z, radius, thickness, perforated).
MAIN_STAGES = [
    ('300K', 0.000, 0.260, 0.028, False),
    ('50K', -0.230, 0.250, 0.016, False),
    ('4K', -0.450, 0.240, 0.016, True),
    ('800mK', -0.650, 0.225, 0.014, True),
]
# Below the still the structure splits into two towers: (label, top z, thickness).
TOWER_STAGES = [('100mK', -0.800, 0.012), ('10mK', -0.950, 0.012)]
SAMPLE_TOWER = (Vector((-0.088, -0.010, 0.0)), 0.072)
LINE_TOWER = (Vector((0.094, 0.004, 0.0)), 0.080)

BORE = 0.042  # central hole of the main plates
ROD_ANGLES = [2 * math.pi * (k + 0.5) / 6 for k in range(6)]
# Line bundles all around the plates, except the sector of the pulse tube, can and brackets.
BUNDLE_ANGLES = [
    math.radians(a) for a in ((-112, -78, -44, -10, 24, 58, 92) if HIGH else (-96, -44, 8, 60))
]
BUNDLE_RADIUS = 0.170
WALL_ANGLE = math.radians(-27)
LOOM_RODS = (0, 3, 5) if HIGH else (0, 3)  # indexes in ROD_ANGLES with a black wire loom
# Fixed seed: the irregular routing of the lines is the same at every run.
RNG = random.Random(1859)
LINE_SPACING = 0.0085
PULSE_TUBE = (0.176, math.radians(135))
STILL_CAN = Vector((-0.112, 0.080, 0.0))
BRACKET_ANGLES = [math.radians(a) for a in (168, 208)]

Z = lambda z: Vector((0.0, 0.0, z))


def main_stage(label):
    return next(stage for stage in MAIN_STAGES if stage[0] == label)


def bottom_of(stage):
    return stage[1] - stage[3]


# ---------------------------------------------------------------------------
# Materials


def srgb_to_linear(value):
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def hex_color(code):
    code = code.lstrip('#')
    return tuple(srgb_to_linear(int(code[i : i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


def make_material(name, color, metallic, roughness, emission=None, strength=0.0):
    material = bpy.data.materials.new(name)
    if material.node_tree is None:
        material.use_nodes = True
    bsdf = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = strength
    return material


# ---------------------------------------------------------------------------
# Geometry helpers (everything is written into bmesh objects)


class Part:
    """Geometry accumulated into a single mesh object."""

    def __init__(self, name, material):
        self.name = name
        self.material = material
        self.bm = bmesh.new()

    def finish(self, collection, bevel=None, sharp_angle=35):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-6)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        limit = math.radians(sharp_angle)
        for edge in self.bm.edges:
            if len(edge.link_faces) == 2 and edge.calc_face_angle(0) > limit:
                edge.smooth = False
        for face in self.bm.faces:
            face.smooth = True
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        mesh.materials.append(self.material)
        obj = bpy.data.objects.new(self.name, mesh)
        collection.objects.link(obj)
        if bevel:
            modifier = obj.modifiers.new('Bevel', 'BEVEL')
            modifier.width = bevel
            modifier.segments = 2 if HIGH else 1
            modifier.limit_method = 'ANGLE'
            modifier.angle_limit = math.radians(30)
            modifier.harden_normals = True
        return obj


def add_cylinder(bm, radius, depth, segments, matrix, radius_top=None):
    """Closed cylinder (or cone) centred on the matrix origin, along its local Z axis."""
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=radius,
        radius2=radius if radius_top is None else radius_top,
        depth=depth,
        matrix=matrix,
    )


def add_box(bm, size, matrix):
    bmesh.ops.create_cube(bm, size=1.0, matrix=matrix @ Matrix.Diagonal((*size, 1.0)))


def add_ring(bm, inner, outer, z_bottom, z_top, segments, center=Vector()):
    """Flat annulus around a vertical axis: a rectangular profile spun 360 degrees."""
    corners = [(inner, z_bottom), (outer, z_bottom), (outer, z_top), (inner, z_top)]
    verts = [bm.verts.new((center.x + r, center.y, z)) for r, z in corners]
    edges = [bm.edges.new((verts[i], verts[(i + 1) % 4])) for i in range(4)]
    bmesh.ops.spin(
        bm,
        geom=verts + edges,
        cent=(center.x, center.y, 0.0),
        axis=(0.0, 0.0, 1.0),
        dvec=(0.0, 0.0, 0.0),
        angle=2 * math.pi,
        steps=segments,
        use_merge=True,
        use_duplicate=False,
    )


def add_disc(bm, radius, z_bottom, z_top, segments, center=Vector()):
    add_cylinder(bm, radius, z_top - z_bottom, segments, Matrix.Translation(center + Z((z_top + z_bottom) / 2)))


def catmull_rom(points, samples):
    pts = [Vector(p) for p in points]
    out = []
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else pts[i + 1]
        for s in range(samples):
            t = s / samples
            out.append(
                0.5
                * (
                    2 * p1
                    + (p2 - p0) * t
                    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                    + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t
                )
            )
    out.append(pts[-1])
    return out


def add_tube(bm, points, radius, sides, caps=True):
    """Sweeps a circle along a polyline, with parallel-transport frames to avoid twisting."""
    pts = [Vector(p) for p in points]
    tangents = [
        (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(len(pts))
    ]
    reference = Vector((0, 0, 1)) if abs(tangents[0].z) < 0.9 else Vector((1, 0, 0))
    normal = tangents[0].cross(reference).normalized()
    rings = []
    for i, point in enumerate(pts):
        tangent = tangents[i]
        if i > 0:
            axis = tangents[i - 1].cross(tangent)
            if axis.length > 1e-9:
                angle = tangents[i - 1].angle(tangent)
                normal = Matrix.Rotation(angle, 3, axis.normalized()) @ normal
            normal = (normal - tangent * normal.dot(tangent)).normalized()
        binormal = tangent.cross(normal)
        rings.append(
            [
                bm.verts.new(
                    point
                    + radius
                    * (
                        math.cos(2 * math.pi * k / sides) * normal
                        + math.sin(2 * math.pi * k / sides) * binormal
                    )
                )
                for k in range(sides)
            ]
        )
    for ring, following in zip(rings, rings[1:]):
        for k in range(sides):
            bm.faces.new((ring[k], ring[(k + 1) % sides], following[(k + 1) % sides], following[k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])


def helix(center, radius, z_top, z_bottom, turns, phase=0.0, steps_per_turn=None):
    steps = max(8, int(turns * (steps_per_turn or HELIX_STEPS_PER_TURN)))
    return [
        center
        + Vector(
            (
                radius * math.cos(phase + 2 * math.pi * turns * i / steps),
                radius * math.sin(phase + 2 * math.pi * turns * i / steps),
                z_top + (z_bottom - z_top) * i / steps,
            )
        )
        for i in range(steps + 1)
    ]


def polar(radius, angle, z=0.0, center=Vector()):
    return center + Vector((radius * math.cos(angle), radius * math.sin(angle), z))


def align_z(direction):
    """Rotation matrix turning the local Z axis into the given direction."""
    return Vector(direction).to_track_quat('Z', 'Y').to_matrix().to_4x4()


def boolean_difference(base_bm, cutter_bm):
    """Returns a new bmesh with the cutter subtracted from the base (both inputs are freed)."""
    meshes, objects = [], []
    for name, bm in (('tmp-base', base_bm), ('tmp-cutter', cutter_bm)):
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        meshes.append(mesh)
        objects.append(obj)
    base, cutter = objects
    modifier = base.modifiers.new('Perforate', 'BOOLEAN')
    modifier.operation = 'DIFFERENCE'
    modifier.object = cutter
    result = None
    for solver in ('MANIFOLD', 'EXACT'):
        try:
            modifier.solver = solver
        except TypeError:
            continue
        bpy.context.view_layer.update()
        evaluated = base.evaluated_get(bpy.context.evaluated_depsgraph_get())
        candidate = bmesh.new()
        candidate.from_mesh(evaluated.to_mesh())
        evaluated.to_mesh_clear()
        if candidate.faces:
            result = candidate
            break
        candidate.free()
    for obj in objects:
        bpy.data.objects.remove(obj)
    for mesh in meshes:
        bpy.data.meshes.remove(mesh)
    if result is None:
        raise RuntimeError('Boolean perforation failed')
    return result


def perforated(build_base, holes, hole_radius, depth):
    """Builds a solid with build_base(bm) and drills holes given as (center, direction)."""
    base = bmesh.new()
    build_base(base)
    if not holes:
        return base
    cutter = bmesh.new()
    for center, direction in holes:
        add_cylinder(cutter, hole_radius, depth, HOLE_SIDES, Matrix.Translation(center) @ align_z(direction))
    return boolean_difference(base, cutter)


def grid_holes(radius_min, radius_max, z, keep_out, center=Vector()):
    """Square grid of vertical holes inside an annulus, away from keep-out circles (x, y, r)."""
    holes = []
    count = int(radius_max / HOLE_PITCH) + 1
    for i in range(-count, count + 1):
        for j in range(-count, count + 1):
            x, y = i * HOLE_PITCH, j * HOLE_PITCH
            distance = math.hypot(x, y)
            if not radius_min <= distance <= radius_max:
                continue
            point = center + Vector((x, y, 0.0))
            if any(math.hypot(point.x - kx, point.y - ky) < kr for kx, ky, kr in keep_out):
                continue
            holes.append((point + Z(z), (0.0, 0.0, 1.0)))
    return holes


# ---------------------------------------------------------------------------
# Model


def rod_positions(stage_a, stage_b):
    rod_radius = min(stage_a[2], stage_b[2]) - 0.032
    return [polar(rod_radius, angle) for angle in ROD_ANGLES]


def bundle_lines():
    """Positions of the coaxial lines at the plates: (bundle angle, position)."""
    lines = []
    for angle in BUNDLE_ANGLES:
        radial = Vector((math.cos(angle), math.sin(angle), 0.0))
        tangential = Vector((-math.sin(angle), math.cos(angle), 0.0))
        for i in range(LINES_PER_BUNDLE):
            offset = (i - (LINES_PER_BUNDLE - 1) / 2) * LINE_SPACING
            lines.append((angle, radial * BUNDLE_RADIUS + tangential * offset))
    return lines


def tower_posts(tower):
    center, radius = tower
    return [polar(radius - 0.012, math.radians(45 + 90 * k), 0.0, center) for k in range(4)]


def build():
    collection = bpy.data.collections.new('Cryostat')
    bpy.context.scene.collection.children.link(collection)

    # Polished metals: low roughness, and the silver parts close to the white of silver.
    gold = make_material('gold', (1.0, 0.68, 0.24, 1.0), 1.0, 0.12)
    aluminium = make_material('aluminium', (0.95, 0.95, 0.96, 1.0), 1.0, 0.14)
    steel = make_material('steel', (0.8, 0.81, 0.83, 1.0), 1.0, 0.18)
    coax_metal = make_material('coax', (0.93, 0.93, 0.94, 1.0), 1.0, 0.16)
    coax_dark_metal = make_material('coax-dark', (0.42, 0.42, 0.44, 1.0), 1.0, 0.24)
    ceramic = make_material('ceramic', (0.86, 0.85, 0.82, 1.0), 0.0, 0.45)
    insulation = make_material('insulation', (0.015, 0.015, 0.018, 1.0), 0.0, 0.55)

    lines = bundle_lines()
    gold_parts = Part('gold-structure', gold)
    hardware = Part('steel', steel)
    coax = Part('coax', coax_metal)
    coax_dark = Part('coax-dark', coax_dark_metal)
    wires = Part('wires', insulation)
    connectors = Part('connectors', gold)  # small parts: no bevel, it would only add triangles

    # --- Main plates -------------------------------------------------------------------------
    for index, stage in enumerate(MAIN_STAGES):
        label, z, radius, thickness, is_perforated = stage
        keep_out = [(p.x, p.y, 0.016) for p in lines_positions(lines)]
        for angle in BUNDLE_ANGLES:
            bar = polar(BUNDLE_RADIUS, angle)
            keep_out.append((bar.x, bar.y, 0.045))
        for neighbour in (MAIN_STAGES[index - 1] if index else None, MAIN_STAGES[index + 1] if index + 1 < len(MAIN_STAGES) else None):
            if neighbour:
                keep_out += [(p.x, p.y, 0.016) for p in rod_positions(stage, neighbour)]
        if label == '4K':
            keep_out.append((STILL_CAN.x, STILL_CAN.y, 0.075))
        if label == '800mK':
            keep_out += [(p.x, p.y, 0.016) for tower in (SAMPLE_TOWER, LINE_TOWER) for p in tower_posts(tower)]
            for angle in BRACKET_ANGLES:
                foot = polar(0.16, angle)
                keep_out.append((foot.x, foot.y, 0.045))
        if label == '4K':
            for angle in BRACKET_ANGLES:
                foot = polar(0.16, angle)
                keep_out.append((foot.x, foot.y, 0.045))

        holes = grid_holes(BORE + 0.014, radius - 0.03, z - thickness / 2, keep_out) if is_perforated else []
        plate = Part(f'plate-{label}', gold)
        plate.bm = perforated(
            lambda bm: add_ring(bm, BORE, radius, z - thickness, z, PLATE_SEGMENTS),
            holes, 0.0045, thickness + 0.01,
        )
        add_ring(plate.bm, radius - 0.007, radius, z, z + 0.004, PLATE_SEGMENTS)
        for k in range(BOLTS_PER_PLATE):
            angle = 2 * math.pi * k / BOLTS_PER_PLATE
            add_cylinder(
                connectors.bm, 0.0042, 0.0036, 6,
                Matrix.Translation(polar(radius - 0.013, angle, z + 0.0018)) @ Matrix.Rotation(angle, 4, 'Z'),
            )
        # Connector bars: one row of gold SMA connectors per bundle.
        for angle in BUNDLE_ANGLES:
            length = LINES_PER_BUNDLE * LINE_SPACING + 0.014
            add_box(
                connectors.bm, (0.016, length, 0.008),
                Matrix.Translation(polar(BUNDLE_RADIUS, angle, z + 0.004)) @ Matrix.Rotation(angle, 4, 'Z'),
            )
        for _angle, position in lines:
            # SMA bulkhead: hex nut on the bar, connector body above it.
            add_cylinder(connectors.bm, 0.0042, 0.003, 6, Matrix.Translation(position + Z(z + 0.0095)))
            add_cylinder(connectors.bm, 0.0027, 0.012, 8 if HIGH else 6, Matrix.Translation(position + Z(z + 0.017)))
        if label == '300K':
            add_ring(plate.bm, radius - 0.022, radius + 0.010, z - thickness - 0.012, z - thickness + 0.004, PLATE_SEGMENTS)
        plate.finish(collection, bevel=None if is_perforated else 0.0018)

    # Gold posts with collars between the main plates.
    for stage_a, stage_b in zip(MAIN_STAGES, MAIN_STAGES[1:]):
        top, bottom = bottom_of(stage_a), stage_b[1]
        for position in rod_positions(stage_a, stage_b):
            add_cylinder(gold_parts.bm, 0.0055, top - bottom, ROUND_SEGMENTS, Matrix.Translation(position + Z((top + bottom) / 2)))
            for zc in (top - 0.006, bottom + 0.006):
                add_cylinder(gold_parts.bm, 0.0095, 0.012, ROUND_SEGMENTS, Matrix.Translation(position + Z(zc)))

    # Perforated L-shaped brackets between the 4K plate and the still.
    bracket_top, bracket_bottom = bottom_of(main_stage('4K')), main_stage('800mK')[1]
    height = bracket_top - bracket_bottom
    for angle in BRACKET_ANGLES:
        center = polar(0.16, angle, (bracket_top + bracket_bottom) / 2)
        rotation = Matrix.Rotation(angle, 4, 'Z')
        radial = rotation @ Vector((1, 0, 0))
        tangential = rotation @ Vector((0, 1, 0))
        rows = int(height / 0.016) - 1

        def bracket(bm, center=center, rotation=rotation, radial=radial, tangential=tangential):
            add_box(bm, (0.004, 0.062, height), Matrix.Translation(center) @ rotation)
            add_box(bm, (0.032, 0.004, height), Matrix.Translation(center + radial * 0.016 + tangential * 0.031) @ rotation)

        holes = []
        for row in range(rows):
            zr = bracket_bottom + 0.016 * (row + 1)
            for column in (-0.016, 0.0, 0.016):
                holes.append((Vector((center.x, center.y, zr)) + tangential * column, radial))
            holes.append((Vector((center.x, center.y, zr)) + radial * 0.018 + tangential * 0.031, tangential))
        gold_parts_bm = perforated(bracket, holes, 0.0035, 0.02)
        merge_into(gold_parts.bm, gold_parts_bm)

    # Perforated wall on the 4K plate, behind the line bundles.
    wall_center = polar(0.108, WALL_ANGLE, main_stage('4K')[1] + 0.07)
    wall_rotation = Matrix.Rotation(WALL_ANGLE, 4, 'Z')
    wall_normal = wall_rotation @ Vector((1, 0, 0))
    wall_tangent = wall_rotation @ Vector((0, 1, 0))
    wall_holes = [
        (wall_center + wall_tangent * (c * 0.016) + Z(r * 0.016), wall_normal)
        for c in range(-4, 5)
        for r in range(-3, 4)
    ]
    merge_into(
        gold_parts.bm,
        perforated(lambda bm: add_box(bm, (0.004, 0.16, 0.13), Matrix.Translation(wall_center) @ wall_rotation), wall_holes, 0.0035, 0.02),
    )

    # Pulse tube cold head: motor on top, two stages reaching the 50 K and 4 K plates.
    pt = lambda z: polar(PULSE_TUBE[0], PULSE_TUBE[1], z)
    add_cylinder(hardware.bm, 0.048, 0.12, ROUND_SEGMENTS * 2, Matrix.Translation(pt(0.06)))
    add_cylinder(hardware.bm, 0.056, 0.012, ROUND_SEGMENTS * 2, Matrix.Translation(pt(0.126)))
    for upper, lower, tube_radius in (('300K', '50K', 0.026), ('50K', '4K', 0.017)):
        top, bottom = bottom_of(main_stage(upper)), main_stage(lower)[1]
        add_cylinder(hardware.bm, tube_radius, top - bottom, ROUND_SEGMENTS * 2, Matrix.Translation(pt((top + bottom) / 2)))
        add_cylinder(gold_parts.bm, tube_radius + 0.018, 0.016, ROUND_SEGMENTS * 2, Matrix.Translation(pt(bottom + 0.008)))

    # Feedthroughs on the top plate, with flanges.
    count = 6 if HIGH else 4
    for k in range(count):
        angle = math.radians(80) + 2 * math.pi * k / count
        tube_height = 0.07 + 0.025 * (k % 2)
        base = polar(0.205, angle)
        add_cylinder(hardware.bm, 0.011, tube_height, ROUND_SEGMENTS, Matrix.Translation(base + Z(tube_height / 2)))
        add_cylinder(hardware.bm, 0.019, 0.008, ROUND_SEGMENTS, Matrix.Translation(base + Z(tube_height)))

    # Silver can with gold flanges on the 4K plate, topped by a heat-exchanger coil.
    can = Part('aluminium', aluminium)
    can_bottom = main_stage('4K')[1]
    add_cylinder(can.bm, 0.055, 0.085, ROUND_SEGMENTS * 3, Matrix.Translation(STILL_CAN + Z(can_bottom + 0.0425)))
    for zf in (can_bottom + 0.004, can_bottom + 0.083):
        add_cylinder(gold_parts.bm, 0.063, 0.008, ROUND_SEGMENTS * 3, Matrix.Translation(STILL_CAN + Z(zf)))
    coil_bottom, coil_top = can_bottom + 0.092, bottom_of(main_stage('50K')) - 0.012
    add_cylinder(hardware.bm, 0.009, coil_top - coil_bottom, ROUND_SEGMENTS, Matrix.Translation(STILL_CAN + Z((coil_top + coil_bottom) / 2)))
    add_tube(coax.bm, helix(STILL_CAN, 0.04, coil_top - 0.006, coil_bottom + 0.006, 7), 0.0042, TUBE_SIDES)

    # --- Towers below the still -------------------------------------------------------------
    still_bottom = bottom_of(main_stage('800mK'))
    tower_plates = {label: Part(f'plate-{label}', gold) for label, _z, _t in TOWER_STAGES}
    for tower in (SAMPLE_TOWER, LINE_TOWER):
        center, radius = tower
        posts = tower_posts(tower)
        for label, z, thickness in TOWER_STAGES:
            ring_holes = [
                (polar(r, 2 * math.pi * k / n + 0.2, z - thickness / 2, center), (0.0, 0.0, 1.0))
                for r, n in ((radius * 0.45, 8), (radius * 0.72, 14 if HIGH else 8))
            ]
            disc = perforated(
                lambda bm, center=center, radius=radius, z=z, thickness=thickness: add_disc(bm, radius, z - thickness, z, PLATE_SEGMENTS // 2, center),
                ring_holes, 0.0042, thickness + 0.01,
            )
            merge_into(tower_plates[label].bm, disc)
            add_ring(tower_plates[label].bm, radius - 0.005, radius, z, z + 0.003, PLATE_SEGMENTS // 2, center)
        bottom = -1.10 if tower is SAMPLE_TOWER else -1.07
        for position in posts:
            add_cylinder(gold_parts.bm, 0.005, still_bottom - bottom, ROUND_SEGMENTS, Matrix.Translation(position + Z((still_bottom + bottom) / 2)))
            for zc in [still_bottom - 0.006] + [z + 0.006 for _l, z, _t in TOWER_STAGES]:
                add_cylinder(gold_parts.bm, 0.0085, 0.010, ROUND_SEGMENTS, Matrix.Translation(position + Z(zc)))

    # Sample tower: aluminium discs and a gold frame at the bottom.
    sample_center, sample_radius = SAMPLE_TOWER
    for z in (-0.835, -0.99, -1.025):
        add_disc(can.bm, sample_radius - 0.004, z - 0.005, z, PLATE_SEGMENTS // 2, sample_center)
    add_ring(gold_parts.bm, sample_radius - 0.016, sample_radius, -1.108, -1.098, PLATE_SEGMENTS // 2, sample_center)

    # Lines from the bundles on the left go to the sample tower, the others to the line tower.
    line_center, line_radius = LINE_TOWER
    to_sample = [line for line in lines if math.cos(line[0]) < 0.2]
    to_lines = [line for line in lines if math.cos(line[0]) >= 0.2]
    line_targets = [
        polar(0.052, 2 * math.pi * k / len(to_lines) + 0.3, 0.0, line_center) for k in range(len(to_lines))
    ]
    sample_targets = [
        polar(0.042, 2 * math.pi * k / max(1, len(to_sample)) + 0.5, 0.0, sample_center)
        for k in range(len(to_sample))
    ]

    # Line tower: attenuators, twisted pairs and the gold can at the bottom (on the home page the
    # camera dives into this can, where the chip is shown: CHIP_CAN in src/components/hero/scene.ts).
    attenuators = Part('attenuators', ceramic)
    for target in line_targets:
        add_cylinder(attenuators.bm, 0.0048, 0.046, ROUND_SEGMENTS, Matrix.Translation(target + Z(-0.864)))
        add_cylinder(tower_plates['10mK'].bm, 0.0034, 0.012, 8 if HIGH else 6, Matrix.Translation(target + Z(-0.950 + 0.008)))
    for target in sample_targets:
        add_cylinder(tower_plates['10mK'].bm, 0.0034, 0.012, 8 if HIGH else 6, Matrix.Translation(target + Z(-0.950 + 0.008)))
    add_ring(gold_parts.bm, line_radius - 0.012, line_radius - 0.004, -0.884, -0.880, PLATE_SEGMENTS // 2, line_center)
    pair_count = 8 if HIGH else 4
    for k in range(pair_count):
        pair_center = polar(0.03, 2 * math.pi * k / pair_count, 0.0, line_center)
        for phase in (0.0, math.pi):
            add_tube(
                wires.bm, helix(pair_center, 0.0022, -0.962, -1.066, 6, phase, steps_per_turn=8 if HIGH else 4),
                0.0016, 5 if HIGH else 4,
            )
    for k in range(3):
        top = -1.070 - k * 0.022
        add_disc(gold_parts.bm, line_radius - 0.006, top - 0.019, top, PLATE_SEGMENTS // 2, line_center)
        add_disc(gold_parts.bm, line_radius - 0.010, top - 0.022, top - 0.019, PLATE_SEGMENTS // 2, line_center)

    # --- Coaxial lines -----------------------------------------------------------------------
    # Through the main plates each gap is crossed straight, with an S-bend or with a loop,
    # chosen at random per line and per gap, then a wide sweep into one of the towers.
    # Within each tower, lines and slots are matched by angle so the sweeps do not cross.
    top_z = MAIN_STAGES[0][1]
    for group, slots, tower_center in ((to_lines, line_targets, line_center), (to_sample, sample_targets, sample_center)):
        around = lambda point, c=tower_center: math.atan2(point.y - c.y, point.x - c.x)
        for (angle, position), target in zip(sorted(group, key=lambda line: around(line[1])), sorted(slots, key=around)):
            radial = Vector((math.cos(angle), math.sin(angle), 0.0))
            tangential = Vector((-math.sin(angle), math.cos(angle), 0.0))
            add_cylinder(coax.bm, 0.0036, 0.012, 8 if HIGH else 6, Matrix.Translation(position + Z(top_z + 0.05)))
            controls = [position + Z(top_z + 0.05)]
            for i, (_label, z, _r, thickness, _p) in enumerate(MAIN_STAGES):
                controls += [position + Z(z + 0.03), position + Z(z - thickness - 0.03)]
                if i == len(MAIN_STAGES) - 1:
                    break
                top, bottom = z - thickness, MAIN_STAGES[i + 1][1]
                gap = top - bottom
                style = RNG.random()
                swing = RNG.uniform(0.008, 0.03) * RNG.choice((-1, 1))
                if style < 0.35:
                    jitter = tangential * RNG.uniform(-0.004, 0.004)
                    controls.append(position + jitter + Z((top + bottom) / 2))
                elif style < 0.8:
                    out = radial * RNG.uniform(0.0, 0.016)
                    controls.append(position + tangential * swing + out + Z(top - gap * 0.34))
                    controls.append(position - tangential * swing + out + Z(bottom + gap * 0.34))
                else:
                    out = radial * RNG.uniform(0.02, 0.045)
                    controls.append(position + out * 0.5 + tangential * swing + Z(top - gap * 0.3))
                    controls.append(position + out + Z((top + bottom) / 2))
                    controls.append(position + out * 0.5 - tangential * swing + Z(bottom + gap * 0.3))
            controls.append(position * RNG.uniform(1.12, 1.35) + Z(still_bottom - RNG.uniform(0.06, 0.1)))
            controls.append(
                target + (target - tower_center) * RNG.uniform(0.6, 1.2) + Z(-0.758 + RNG.uniform(-0.012, 0.012))
            )
            for _label, z, thickness in TOWER_STAGES:
                controls += [target + Z(z + 0.018), target + Z(z - thickness - 0.012)]
            part = coax_dark if RNG.random() < 0.3 else coax
            add_tube(part.bm, catmull_rom(controls, CURVE_SAMPLES), 0.0013, COAX_SIDES)

    # Black wire looms running down along some of the posts, sagging and wobbling slightly.
    for rod in LOOM_RODS:
        angle = ROD_ANGLES[rod]
        controls = []
        for stage_a, stage_b in zip(MAIN_STAGES, MAIN_STAGES[1:]):
            loom_radius = min(stage_a[2], stage_b[2]) - 0.047
            top, bottom = bottom_of(stage_a), stage_b[1]
            for k in range(5):
                t = k / 4
                wobble = 0.004 * math.sin(t * math.pi * 3 + rod)
                sag = 0.006 * math.sin(t * math.pi)
                controls.append(polar(loom_radius - sag, angle + wobble * 4, top + 0.02 - (top - bottom + 0.04) * t))
        add_tube(wires.bm, catmull_rom(controls, CURVE_SAMPLES), 0.0034, COAX_SIDES)
        for neighbour in (-0.006, 0.006):
            add_tube(
                wires.bm,
                catmull_rom([point + Vector((neighbour, -neighbour, 0.0)) for point in controls], CURVE_SAMPLES),
                0.0018, 4,
            )

    for label, _z, _t in TOWER_STAGES:
        tower_plates[label].finish(collection)
    for part, kwargs in (
        (gold_parts, {}),
        (connectors, {}),
        (can, {'bevel': 0.0012 if HIGH else None}),
        (hardware, {'bevel': 0.0008 if HIGH else None}),
        (coax, {'sharp_angle': 80}),
        (coax_dark, {'sharp_angle': 80}),
        (attenuators, {}),
        (wires, {'sharp_angle': 80}),
    ):
        part.finish(collection, **kwargs)
    return collection


def lines_positions(lines):
    return [position for _angle, position in lines]


def merge_into(target_bm, source_bm):
    """Appends the geometry of source_bm to target_bm and frees source_bm."""
    mesh = bpy.data.meshes.new('tmp-merge')
    source_bm.to_mesh(mesh)
    source_bm.free()
    target_bm.from_mesh(mesh)
    bpy.data.meshes.remove(mesh)


# ---------------------------------------------------------------------------
# Output


def triangle_report(collection):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total = 0
    for obj in collection.objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        triangles = sum(len(polygon.vertices) - 2 for polygon in mesh.polygons)
        evaluated.to_mesh_clear()
        total += triangles
        print(f'  {obj.name:<16} {triangles:>8} triangles')
    print(f'  {"total":<16} {total:>8} triangles')


def export_glb(collection, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = collection.objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
    )
    print(f'Exported {path} ({path.stat().st_size / 1024:.0f} KB)')


def enable_gpu():
    preferences = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('OPTIX', 'CUDA'):
        try:
            preferences.compute_device_type = backend
        except TypeError:
            continue
        preferences.get_devices()
        devices = [d for d in preferences.devices if d.type == backend]
        if devices:
            for device in preferences.devices:
                device.use = device.type == backend
            bpy.context.scene.cycles.device = 'GPU'
            print(f'Cycles on GPU ({backend}): {", ".join(d.name for d in devices)}')
            return
    print('Cycles on CPU')


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def add_area_light(name, location, target, color, energy, size):
    light = bpy.data.lights.new(name, 'AREA')
    light.color = color[:3]
    light.energy = energy
    light.size = size
    obj = bpy.data.objects.new(name, light)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)


def add_surface_detail():
    """Uneven roughness and a faint bump on the metals, for renders only (glTF drops these nodes)."""
    for material in bpy.data.materials:
        if material.name not in ('gold', 'aluminium', 'steel', 'coax', 'coax-dark'):
            continue
        nodes, links = material.node_tree.nodes, material.node_tree.links
        bsdf = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
        roughness = bsdf.inputs['Roughness'].default_value
        coordinates = nodes.new('ShaderNodeTexCoord')
        noise = nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 60.0
        noise.inputs['Detail'].default_value = 6.0
        links.new(coordinates.outputs['Object'], noise.inputs['Vector'])
        remap = nodes.new('ShaderNodeMapRange')
        remap.inputs['To Min'].default_value = roughness * 0.85
        remap.inputs['To Max'].default_value = roughness * 1.15
        links.new(noise.outputs['Fac'], remap.inputs['Value'])
        links.new(remap.outputs['Result'], bsdf.inputs['Roughness'])
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.04
        bump.inputs['Distance'].default_value = 0.0005
        links.new(noise.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])


def render(path):
    scene = bpy.context.scene
    add_surface_detail()
    scene.render.engine = 'CYCLES'
    enable_gpu()
    scene.cycles.samples = ARGS.samples
    scene.cycles.use_denoising = True
    width, height = (int(v) for v in ARGS.resolution.split('x'))
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = ARGS.transparent
    try:
        scene.view_settings.view_transform = 'AgX'
    except TypeError:
        pass

    world = bpy.data.worlds.new('World')
    scene.world = world
    if world.node_tree is None:
        world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = hex_color('#05060d')

    target = Vector((0.0, 0.0, -0.50))
    views = {
        # (azimuth, elevation, distance)
        'hero': (math.radians(28), math.radians(-7), 3.6),
        'side': (math.radians(90), math.radians(0), 3.6),
        'low': (math.radians(12), math.radians(-24), 2.9),
        'above': (math.radians(24), math.radians(16), 3.6),
    }
    azimuth, elevation, distance = views[ARGS.view]
    camera_data = bpy.data.cameras.new('Camera')
    camera_data.lens = 50
    camera_data.sensor_fit = 'VERTICAL'
    camera_data.sensor_height = 24
    camera = bpy.data.objects.new('Camera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = target + distance * Vector(
        (
            math.sin(azimuth) * math.cos(elevation),
            -math.cos(azimuth) * math.cos(elevation),
            math.sin(elevation),
        )
    )
    look_at(camera, target)
    scene.camera = camera

    # The same lighting as the website: a warm key light, a cold rim light and a few small violet
    # lights where the particles would be. Energies in watts.
    add_area_light('Key', target + Vector((-1.7, -1.3, 1.7)), target, hex_color('#ffe2b0'), 1000, 2.0)
    add_area_light('Rim', target + Vector((1.9, 1.4, 0.5)), target, hex_color('#96acd4'), 650, 1.6)
    add_area_light('Fill', target + Vector((0.6, -2.4, -1.0)), target, hex_color('#ffd9a8'), 120, 2.6)
    add_area_light('Top', target + Vector((0.0, -0.5, 1.9)), target, hex_color('#ffffff'), 380, 1.2)
    particles = [
        ((-0.32, -0.30, -0.10), '#e891db'),
        ((0.34, -0.25, -0.35), '#751f72'),
        ((-0.28, -0.22, -0.62), '#751f72'),
        ((0.30, -0.30, -0.80), '#e891db'),
        ((-0.20, -0.28, -1.02), '#e891db'),
    ]
    for i, (location, color) in enumerate(particles):
        light = bpy.data.lights.new(f'Particle{i}', 'POINT')
        light.color = hex_color(color)[:3]
        light.energy = 40
        light.shadow_soft_size = 0.04
        obj = bpy.data.objects.new(f'Particle{i}', light)
        scene.collection.objects.link(obj)
        obj.location = location

    # Soft panel above the model: invisible to the camera, it gives the metals something to reflect.
    panel_mesh = bpy.data.meshes.new('Softbox')
    panel_bm = bmesh.new()
    bmesh.ops.create_grid(panel_bm, x_segments=1, y_segments=1, size=1.6)
    panel_bm.to_mesh(panel_mesh)
    panel_bm.free()
    panel_material = make_material('softbox', (1.0, 1.0, 1.0, 1.0), 0.0, 1.0, emission=hex_color('#fff1dc'), strength=3.0)
    panel_mesh.materials.append(panel_material)
    panel = bpy.data.objects.new('Softbox', panel_mesh)
    scene.collection.objects.link(panel)
    panel.location = target + Vector((0.4, -1.2, 2.4))
    panel.rotation_euler = (target - panel.location).to_track_quat('Z', 'Y').to_euler()
    panel.visible_camera = False

    scene.view_settings.exposure = 0.4
    for look_name in ('AgX - Punchy', 'Punchy'):
        try:
            scene.view_settings.look = look_name
            break
        except TypeError:
            continue

    path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    print(f'Rendered {path}')


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    collection = build()
    print(f'Detail: {ARGS.detail}')
    triangle_report(collection)
    if ARGS.glb:
        export_glb(collection, Path(ARGS.glb).resolve())
    if ARGS.render:
        render(Path(ARGS.render).resolve())
    if ARGS.blend:
        blend = Path(ARGS.blend).resolve()
        blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))


main()
