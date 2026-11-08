"""
Procedural superconducting quantum chip in its sample holder, for the bottom of the descent on
the QubiTO home page.

The qubits follow the layout of the five-qubit chip of IQM Spark, the model of the PoliTo quantum
computer (Lagrange), adapted from Fig. 1 of J. Rönkkö et al., "On-premises superconducting
quantum computer for education and research", EPJ Quantum Technology 11, 32 (2024),
https://doi.org/10.1140/epjqt/s40507-024-00243-z, licensed under CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/); the home page credits it (see build_layout for
the changes). The design is IQM's, so the chip carries no name. The rest is generic: flux and
drive lines that hop over other lines on air bridges, ground straps along the lines, a ground
plane perforated against trapped flux, bond pads, wire bonds to a gold-plated board and the
holder around it.

The metal pattern of the chip and of the board is drawn into images (anti-aliased, with numpy)
and used as textures; everything else is geometry. Units are millimetres.

Run it with Blender, without its window, from the project root. All the commands that rebuild
the models of the site are in docs/developer-guide.md.

  blender --background --factory-startup --python scripts/blender/chip.py -- \
      --render scripts/blender/build/chip-macro.png --view macro

Options (all optional):
  --render PATH           render an image with Cycles
  --view top|macro|package  camera preset for the render
  --glow N                violet glow of the qubits (0 = off)
  --samples N             Cycles samples (default 128)
  --resolution WxH        render size (default 1600x1000)
  --texture-size N        size of the chip texture in pixels (default 8192)
  --textures DIR          where the textures are written (default scripts/blender/build)
  --glb PATH              export the model as binary glTF for the website: plain materials with
                          the pattern images (the site shades them) and an empty
                          "qubit-<row>-<col>" on each qubit
  --blend PATH            save a .blend file to open and edit by hand
"""

import argparse
import math
import random
import struct
import sys
import zlib
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description='Build the QubiTO quantum chip.')
    parser.add_argument('--render')
    parser.add_argument('--view', choices=['top', 'macro', 'package'], default='macro')
    parser.add_argument('--glow', type=float, default=0.0)
    parser.add_argument('--samples', type=int, default=128)
    parser.add_argument('--resolution', default='1600x1000')
    parser.add_argument('--texture-size', type=int, default=8192)
    parser.add_argument('--textures', default='scripts/blender/build')
    parser.add_argument('--glb')
    parser.add_argument('--blend')
    return parser.parse_args(argv)


ARGS = parse_args()
RNG = random.Random(1859)

# ---------------------------------------------------------------------------
# Chip layout (millimetres, chip centred on the origin, y up)

CHIP = 7.4  # side of the die
EDGE = CHIP / 2
BORDER = 0.06  # bare substrate along the edges (dicing lane)

# Coplanar waveguides: (centre conductor width, gap on each side)
COUPLER = (0.03, 0.02)
RESONATOR = (0.02, 0.012)
FEEDLINE = (0.04, 0.024)
FLUX = (0.015, 0.01)

PAD_HALF = (0.12, 0.15)  # bond pad: half width along the edge, half depth
PAD_CENTRE = EDGE - 0.45  # distance of the bond pads from the centre
PAD_GAP = 0.05
TAPER_END = EDGE - 0.85  # the line leaves the launcher here

HOLE = 0.008  # ground plane holes: side and pitch
HOLE_PITCH = 0.05
KEEPOUT = 0.03  # no holes this close to a gap

BRIDGE_WIDTH = 0.014
BRIDGE_EVERY = 0.30

DIE_THICKNESS = 0.5


def edge_point(edge, t, s):
    """Point at distance s from the centre towards an edge, t along that edge."""
    return {
        'top': (t, s),
        'bottom': (t, -s),
        'left': (-s, t),
        'right': (s, t),
    }[edge]


class Line:
    """Coplanar waveguide along a polyline."""

    def __init__(self, points, width, gap, kind, upper=False, straps=False):
        self.points = [tuple(p) for p in points]
        self.width = width
        self.gap = gap
        self.kind = kind
        self.upper = upper  # hops over the lines it crosses
        self.straps = straps  # ground straps along it

    @property
    def half(self):
        return self.width / 2 + self.gap


class Layout:
    def __init__(self):
        self.lines = []
        self.rects = []  # extra metal rectangles in their own gap: (cx, cy, hw, hh, gap)
        self.launchers = []  # (edge, t, line)
        self.bridges = []  # rectangles (cx, cy, hw, hh)
        self.qubits = []
        self.qubit_names = []  # (row, col) of each qubit, for the markers of the website
        self.discs = []  # round islands (cx, cy, radius, gap, qubit)
        self.details = []  # drawn over the islands: (carve | fill | qubit, disc | quad | segment, shape)
        self.signal_bonds = []  # (edge, t)
        self.ground_bonds = []  # (edge, t)
        self.focus = (0.0, 0.0)  # what the macro render frames


def finish_layout(layout):
    """Hops, ground straps and wire bonds, from the lines and launchers of a layout."""
    lines = layout.lines

    # Hops where an upper line crosses another one (vertical over horizontal segments).
    hops = []
    unders = lines
    for line in lines:
        if not line.upper:
            continue
        pieces, current = [], [line.points[0]]
        for a, b in zip(line.points, line.points[1:]):
            crossings = []
            if a[0] == b[0]:
                lo, hi = sorted((a[1], b[1]))
                for under in unders:
                    if under is line:
                        continue
                    for c, d in zip(under.points, under.points[1:]):
                        if c[1] == d[1] and lo < c[1] < hi and min(c[0], d[0]) < a[0] < max(c[0], d[0]):
                            crossings.append((c[1], under))
            crossings.sort(key=lambda item: item[0], reverse=b[1] < a[1])
            for yc, under in crossings:
                clear = under.half + 0.015 + line.half
                direction = 1 if b[1] > a[1] else -1
                current.append((a[0], yc - direction * clear))
                pieces.append(current)
                current = [(a[0], yc + direction * clear)]
                hops.append((a[0], yc, line.width / 2 + 0.004, clear + 0.004))
            current.append(b)
        pieces.append(current)
        line.pieces = pieces
    for line in lines:
        if not line.upper:
            line.pieces = [line.points]
    layout.bridges += hops

    # Ground straps across the long straight runs, away from bends and hops.
    for line in lines:
        if not line.straps:
            continue
        for piece in line.pieces:
            for a, b in zip(piece, piece[1:]):
                if a[0] != b[0] and a[1] != b[1]:
                    continue
                length = math.dist(a, b)
                count = int((length - 0.2) / BRIDGE_EVERY)
                for k in range(count):
                    f = (0.1 + (k + 0.5) * (length - 0.2) / count) / length
                    px, py = a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
                    across = line.half + 0.015
                    strap = (px, py, BRIDGE_WIDTH / 2, across) if a[1] == b[1] else (px, py, across, BRIDGE_WIDTH / 2)
                    if not any(abs(px - hx) < strap[2] + hw + 0.05 and abs(py - hy) < strap[3] + hh + 0.05
                               for hx, hy, hw, hh in hops):
                        layout.bridges.append(strap)

    # Wire bonds: two per signal pad, and ground bonds along the edges between the pads.
    for edge, t, _line in layout.launchers:
        layout.signal_bonds += [(edge, t - 0.05), (edge, t + 0.05)]
    for edge in ('top', 'bottom', 'left', 'right'):
        taken = [t for e, t, _l in layout.launchers if e == edge]
        t = 0.5 - EDGE
        while t <= EDGE - 0.5:
            if all(abs(t - u) > PAD_HALF[0] + PAD_GAP + 0.06 for u in taken):
                layout.ground_bonds.append((edge, t))
            t += 0.3


# ---------------------------------------------------------------------------
# Lagrange layout: the five qubits of the PoliTo quantum computer, redrawn from Fig. 1 of Rönkkö
# et al. (2024, CC BY 4.0, see the top of this file). Changes from the figure: drawn in 3D,
# simplified and scaled; the edges of the chip, which the figure does not show, are generic.
# Ring-shaped qubits in an X; the centre one (QB3) is coupled to each of the other four through
# a tunable coupler (TC).
# Each qubit has a readout resonator and a Purcell filter, folded side by side; the filters are
# coupled to one probe line that runs around the qubits and has a filter of its own. Drive lines
# come from the sides, flux lines from the top and bottom edges.
# Positions are those of the figure, in its pixels (x right, y down; 200 um is about 10 px),
# scaled to fit the die; the details of the four outer qubits are those of QB1, mirrored.

FIG_SCALE = 0.015  # mm per pixel of the figure: about 0.8 of the real size
FIG_CENTRE = (221, 130.5)  # QB3
FIG_SHIFT = -0.25  # mm: the filter of the probe line makes the layout wider on the right
QUBIT_RING = (0.05, 0.085)  # ring island of a qubit: inner and outer radius
QUBIT_CORE = 0.032  # island in the middle of the ring
QUBIT_OUTER = 0.125  # edge of the gap around a qubit
TC_RADIUS = 0.15
TC_GAP = 0.015
DRIVE = (0.015, 0.01)
FOLD = 0.07  # spacing of the turns of resonators and filters
FAN_Y = 1.9  # beyond this height the top and bottom lines bend towards their launchers

# The outer qubits: mirror of QB1 in x and y, name of the marker (row, col of a 3 x 3 grid, y up).
OUTER_QUBITS = {'QB1': (1, 1, (2, 0)), 'QB2': (-1, 1, (2, 2)), 'QB4': (1, -1, (0, 0)), 'QB5': (-1, -1, (0, 2))}
QB1 = (170, 56)
TC13 = (205.5, 86)
# Readout resonator and Purcell filter of QB1: centre, length, width; their long side at 45 degrees.
QB1_RESONATOR = (123, 63.5, 41, 21)
QB1_FILTER = (145.5, 88, 42, 21)
QB1_FILTER_PAD = (103.75, 112)  # by the probe line
QB3_RESONATOR = (265, 115.5, 42.5, 19)  # horizontal
QB3_FILTER = (265, 145.5, 42.5, 19)
QB3_PAD = (315.5, 130.5)
# Drive lines: launcher edge and the points before the qubit.
DRIVES = {
    'QB1': ('left', [(135, 22)]),
    'QB2': ('top', [(307.5, 22)]),
    'QB3': ('left', [(58.75, 158), (85, 130.5)]),
    'QB4': ('left', [(158, 233.75), (158, 217.5)]),
    'QB5': ('bottom', [(286.25, 220)]),
}
PROBE = [(110.75, 118), (110.75, 142.5), (88.75, 142.5), (88.75, 215), (98.75, 225), (326, 225),
         (347.5, 203.5), (347.5, 144), (322.5, 144), (322.5, 119.5), (400, 119.5), (407.5, 112.5)]
PROBE_FILTER = [(379, 119.5), (379, 135), (402, 135), (402, 165), (370.75, 165), (370.75, 149), (386, 149)]


def fig(point):
    """Figure pixels to millimetres on the die."""
    x, y = point
    return ((x - FIG_CENTRE[0]) * FIG_SCALE + FIG_SHIFT, (FIG_CENTRE[1] - y) * FIG_SCALE)


def mirror(point, sx, sy):
    x, y = point
    return (FIG_CENTRE[0] + sx * (x - FIG_CENTRE[0]), FIG_CENTRE[1] + sy * (y - FIG_CENTRE[1]))


def towards(a, b, distance):
    """Point at `distance` from a, towards b."""
    length = math.dist(a, b)
    return (a[0] + (b[0] - a[0]) * distance / length, a[1] + (b[1] - a[1]) * distance / length)


def polar(centre, radius, degrees):
    a = math.radians(degrees)
    return (centre[0] + radius * math.cos(a), centre[1] + radius * math.sin(a))


def rounded(points, radius, steps=4):
    """The polyline with its corners rounded off (straight runs stay exactly straight)."""
    out = [points[0]]
    for a, b, c in zip(points, points[1:], points[2:]):
        d = min(radius, math.dist(a, b) / 2, math.dist(b, c) / 2)
        if d <= 0:
            out.append(b)
            continue
        p, q = towards(b, a, d), towards(b, c, d)
        for k in range(steps + 1):
            t = k / steps
            out.append(tuple((1 - t) ** 2 * p[i] + 2 * (1 - t) * t * b[i] + t * t * q[i] for i in range(2)))
    out.append(points[-1])
    return out


def spiral(centre, length, width, angle, start_near, first='long'):
    """A folded resonator: a rectangular spiral that starts at the corner nearest `start_near`,
    runs along a long side (or a short one) and winds inwards, ending along the length. The long
    side is at `angle` degrees (y up)."""
    if first == 'short':
        length, width, angle = width, length, angle + 90
    x0, y0, x1, y1 = -length / 2, -width / 2, length / 2, width / 2
    local = [(x0, y0)]
    while min(x1 - x0, y1 - y0) > 2 * FOLD:
        local += [(x1, y0), (x1, y1), (x0, y1), (x0, y0 + FOLD)]
        x0, y0, x1, y1 = x0 + FOLD, y0 + FOLD, x1 - FOLD, y1 - FOLD
    local += [(x1, y0)] if x1 - x0 >= y1 - y0 else [(x0, y0), (x0, y1)]
    c, s_ = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    options = [[(centre[0] + fx * x * c - fy * y * s_, centre[1] + fx * x * s_ + fy * y * c) for x, y in local]
               for fx in (1, -1) for fy in (1, -1)]
    return min(options, key=lambda points: math.dist(points[0], start_near))


def fan_out(edge, lines, spacing, centre):
    """Top or bottom lines start at FAN_Y: add a 45 degree bend to evenly spaced launchers."""
    sign = 1 if edge == 'top' else -1
    lines = sorted(lines, key=lambda line: line.points[0][0])
    first = centre - spacing * (len(lines) - 1) / 2
    for k, line in enumerate(lines):
        x = line.points[0][0]
        pad = first + k * spacing
        line.points = [(pad, TAPER_END * sign), (pad, (FAN_Y + abs(pad - x)) * sign)] + line.points
    return lines


def build_layout():
    layout = Layout()
    lines = layout.lines
    details = layout.details
    attached = {}  # angles at which lines reach each qubit

    def touch(name, centre, toward, width):
        """End of a line of this width that reaches the qubit ring from `toward`."""
        attached.setdefault(name, []).append(math.degrees(math.atan2(toward[1] - centre[1], toward[0] - centre[0])))
        return towards(centre, toward, QUBIT_RING[1] + 0.012 + width / 2)

    def add(points, dims, kind, corner=0.02, **options):
        line = Line(rounded(points, corner) if corner else points, *dims, kind, **options)
        lines.append(line)
        return line

    qubits = {'QB3': fig(FIG_CENTRE)}
    couplers = {}
    for name, (sx, sy, _rc) in OUTER_QUBITS.items():
        qubits[name] = fig(mirror(QB1, sx, sy))
        couplers[name] = fig(mirror(TC13, sx, sy))
    names = {'QB3': (1, 1)} | {name: rc for name, (_sx, _sy, rc) in OUTER_QUBITS.items()}
    for name in ('QB1', 'QB2', 'QB3', 'QB4', 'QB5'):
        layout.qubits.append(qubits[name])
        layout.qubit_names.append(names[name])

    # Tunable couplers: a round island with its SQUID in a notch facing the two qubits.
    reach = TC_RADIUS + TC_GAP + 0.01 + COUPLER[0] / 2
    for name, centre in couplers.items():
        ends = [qubits[name], qubits['QB3']]
        ux, uy = (sum((q[i] - centre[i]) / math.dist(q, centre) for q in ends) for i in range(2))
        facing = math.degrees(math.atan2(uy, ux))
        layout.discs.append((*centre, TC_RADIUS, TC_GAP, False))
        apex = polar(centre, 0.02, facing)
        notch = [apex, polar(centre, TC_RADIUS, facing - 20), polar(centre, TC_RADIUS, facing + 20)]
        details.append(('carve', 'quad', notch))
        for da in (-11, 0, 11):
            details.append(('fill', 'segment', apex, polar(centre, TC_RADIUS * 0.95, facing + da), 0.0035))
        details.append(('carve', 'disc', *centre, 0.014))
        for qubit_name in (name, 'QB3'):
            qubit = qubits[qubit_name]
            # Each line comes in beside the notch, on the side of its own qubit.
            direction = math.degrees(math.atan2(qubit[1] - centre[1], qubit[0] - centre[0]))
            side = 1 if math.sin(math.radians(direction - facing)) > 0 else -1
            end = polar(centre, reach, facing + side * 32)
            knee = polar(centre, reach + 0.09, facing + side * 32)
            add([touch(qubit_name, qubit, knee, COUPLER[0]), knee, end], COUPLER, 'coupler', corner=0)

    # Readout of the outer qubits: the resonator starts from the qubit along its long side; the
    # Purcell filter beside it starts along a short side, coming from a pad by the probe line on a
    # 45 degree lead that ends near the far corner of the resonator.
    folded = dict(corner=FOLD / 2)
    for name, (sx, sy, _rc) in OUTER_QUBITS.items():
        qubit = qubits[name]
        angle = 45 if sx * sy > 0 else -45
        cx, cy, length, width = QB1_RESONATOR
        points = spiral(fig(mirror((cx, cy), sx, sy)), length * FIG_SCALE, width * FIG_SCALE, angle, qubit)
        add([touch(name, qubit, points[0], RESONATOR[0])] + points, RESONATOR, 'resonator', **folded)
        pad = fig(mirror(QB1_FILTER_PAD, sx, sy))
        cx, cy, length, width = QB1_FILTER
        points = spiral(fig(mirror((cx, cy), sx, sy)), length * FIG_SCALE, width * FIG_SCALE, angle, pad, first='short')
        lead = towards(points[0], points[1], -0.12)
        knee = (pad[0], lead[1] + math.copysign(abs(lead[0] - pad[0]), pad[1] - lead[1]))
        add([pad, knee, lead] + points, RESONATOR, 'resonator', **folded)
        layout.rects.append((*pad, 0.04, 0.035, 0.02))

    qubit = qubits['QB3']
    cx, cy, length, width = QB3_RESONATOR
    start = fig((240.5, 130.5))
    points = spiral(fig((cx, cy)), length * FIG_SCALE, width * FIG_SCALE, 0, start)
    add([touch('QB3', qubit, start, RESONATOR[0]), start] + points, RESONATOR, 'resonator', **folded)
    pad = fig(QB3_PAD)
    start = fig((290, 130.5))
    cx, cy, length, width = QB3_FILTER
    points = spiral(fig((cx, cy)), length * FIG_SCALE, width * FIG_SCALE, 0, start)
    add([pad, start] + points, RESONATOR, 'resonator', **folded)
    layout.rects.append((*pad, 0.035, 0.04, 0.02))

    # Probe line, from a launcher on the left edge around the qubits to one on the right edge.
    probe = [fig(point) for point in PROBE]
    probe = [(-TAPER_END, probe[0][1])] + probe + [(TAPER_END, probe[-1][1])]
    line = add(probe, FEEDLINE, 'feedline', corner=0.06, upper=True, straps=True)
    layout.launchers += [('left', probe[0][1], line), ('right', probe[-1][1], line)]
    add([fig(point) for point in PROBE_FILTER], FEEDLINE, 'feedline', corner=0.06)

    # Drive lines from the left edge; the top and bottom ones start at FAN_Y, like the flux lines.
    fanned = {'top': [], 'bottom': []}
    for name, (edge, path) in DRIVES.items():
        path = [fig(point) for point in path]
        end = touch(name, qubits[name], path[-1], DRIVE[0])
        if edge == 'left':
            line = add([(-TAPER_END, path[0][1])] + path + [end], DRIVE, 'drive', upper=True, straps=True)
            layout.launchers.append(('left', path[0][1], line))
        else:
            start = (path[0][0], FAN_Y if edge == 'top' else -FAN_Y)
            fanned[edge].append(Line([start] + path + [end], *DRIVE, 'drive', upper=True, straps=True))

    # Flux lines: to the outer qubits and the couplers from the nearer edge, to QB3 from below.
    targets = [(name, centre, False) for name, centre in qubits.items()]
    targets += [(name, centre, True) for name, centre in couplers.items()]
    for name, target, coupler in targets:
        edge = 'top' if target[1] > 0 else 'bottom'
        sign = 1 if edge == 'top' else -1
        if coupler:
            end = (target[0], target[1] + sign * (TC_RADIUS + TC_GAP + 0.025))
        else:
            end = touch(name, target, (target[0], target[1] + sign), FLUX[0])
        fanned[edge].append(Line([(target[0], FAN_Y * sign), end], *FLUX, 'flux', upper=True, straps=True))
    for edge, spacing, centre in (('top', 0.7, 0.0), ('bottom', 0.6, -0.1)):
        for line in fan_out(edge, fanned[edge], spacing, centre):
            lines.append(line)
            layout.launchers.append((edge, line.points[0][0], line))

    # Qubits: the ring and its core glow; ground spokes across the gap around the ring, away from
    # the lines that reach it.
    for name, centre in qubits.items():
        layout.discs.append((*centre, QUBIT_RING[1], QUBIT_OUTER - QUBIT_RING[1], True))
        details.append(('carve', 'disc', *centre, QUBIT_RING[0]))
        details.append(('qubit', 'disc', *centre, QUBIT_CORE))
        taken = attached.get(name, [])
        gap = lambda a: min(abs((a - t + 180) % 360 - 180) for t in taken) if taken else 180
        offset = max(range(60), key=lambda o: min(gap(o + 60 * k) for k in range(6)))
        for k in range(6):
            a = offset + 60 * k
            if gap(a) > 24:
                details.append(('fill', 'segment', polar(centre, QUBIT_RING[1] - 0.005, a),
                                polar(centre, QUBIT_OUTER + 0.005, a), 0.007))

    # Corners: alignment marks. Top right: test structures. No name: the design is IQM's.
    for sx in (-1, 1):
        for sy in (-1, 1):
            mx, my = (EDGE - 0.38) * sx, (EDGE - 0.38) * sy
            layout.rects += [(mx, my, 0.12, 0.012, 0.03), (mx, my, 0.012, 0.12, 0.03)]
    for y in (1.35, 2.05):
        for x in (2.15, 2.6):
            layout.rects.append((x, y, 0.07, 0.07, 0.03))
        layout.rects.append((2.375, y, 0.14, 0.004, 0.02))
    layout.focus = (qubits['QB3'][0] + 0.35, qubits['QB3'][1] + 0.15)

    finish_layout(layout)
    return layout


# ---------------------------------------------------------------------------
# Raster drawing: anti-aliased coverage from signed distances


class Canvas:
    def __init__(self, size, extent):
        self.n = size
        self.extent = extent
        self.px = 2 * extent / size
        self.metal = np.ones((size, size), np.float32)
        self.keep = np.zeros((size, size), bool)
        self.bridge = np.zeros((size, size), np.float32)
        self.qubit = np.zeros((size, size), np.float32)

    def window(self, xmin, xmax, ymin, ymax):
        n, e, px = self.n, self.extent, self.px
        i0 = max(0, int((xmin + e) / px) - 2)
        i1 = min(n, int((xmax + e) / px) + 3)
        j0 = max(0, int((e - ymax) / px) - 2)
        j1 = min(n, int((e - ymin) / px) + 3)
        if i0 >= i1 or j0 >= j1:
            return None
        xs = (np.arange(i0, i1, dtype=np.float32) + 0.5) * px - e
        ys = e - (np.arange(j0, j1, dtype=np.float32) + 0.5) * px
        return (slice(j0, j1), slice(i0, i1)), xs[None, :], ys[:, None]

    def coverage(self, distance):
        return np.clip(distance / self.px + 0.5, 0.0, 1.0)

    # Shapes return (window, signed distance: positive inside)

    def segment(self, a, b, radius):
        w = self.window(min(a[0], b[0]) - radius, max(a[0], b[0]) + radius,
                        min(a[1], b[1]) - radius, max(a[1], b[1]) + radius)
        if w is None:
            return None
        where, x, y = w
        dx, dy = b[0] - a[0], b[1] - a[1]
        length2 = dx * dx + dy * dy or 1e-12
        t = np.clip(((x - a[0]) * dx + (y - a[1]) * dy) / length2, 0.0, 1.0)
        distance = np.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy))
        return where, radius - distance

    def disc(self, cx, cy, radius):
        w = self.window(cx - radius, cx + radius, cy - radius, cy + radius)
        if w is None:
            return None
        where, x, y = w
        return where, radius - np.hypot(x - cx, y - cy)

    def rect(self, cx, cy, hw, hh):
        w = self.window(cx - hw, cx + hw, cy - hh, cy + hh)
        if w is None:
            return None
        where, x, y = w
        return where, np.minimum(hw - np.abs(x - cx), hh - np.abs(y - cy))

    def quad(self, points):
        """Convex polygon."""
        if sum(ax * by - bx * ay for (ax, ay), (bx, by) in zip(points, points[1:] + points[:1])) < 0:
            points = points[::-1]
        xs, ys = zip(*points)
        w = self.window(min(xs), max(xs), min(ys), max(ys))
        if w is None:
            return None
        where, x, y = w
        inside = None
        for (ax, ay), (bx, by) in zip(points, points[1:] + points[:1]):
            ex, ey = bx - ax, by - ay
            length = math.hypot(ex, ey)
            d = ((x - ax) * -ey + (y - ay) * ex) / length
            inside = d if inside is None else np.minimum(inside, d)
        return where, inside

    def carve(self, shape, keepout=True):
        if shape is None:
            return
        where, distance = shape
        self.metal[where] *= 1.0 - self.coverage(distance)
        if keepout:
            self.keep[where] |= distance > -KEEPOUT

    def fill(self, shape, layer=None):
        if shape is None:
            return
        where, distance = shape
        cover = self.coverage(distance)
        np.maximum(self.metal[where], cover, out=self.metal[where])
        if layer is not None:
            np.maximum(layer[where], cover, out=layer[where])

    def holes(self, size, pitch, offset=0.0):
        coords = (np.arange(self.n, dtype=np.float32) + 0.5) * self.px - self.extent + offset
        hx = np.mod(coords, pitch) < size
        hy = np.mod(-coords, pitch) < size
        grid = hy[:, None] & hx[None, :]
        self.metal[grid & ~self.keep] = 0.0

    def frame(self, inner):
        """Bare substrate outside |x|, |y| < inner."""
        coords = (np.arange(self.n, dtype=np.float32) + 0.5) * self.px - self.extent
        inside = np.abs(coords) < inner
        self.metal[~(inside[:, None] & inside[None, :])] = 0.0

    def save(self, path):
        rgb = np.stack([self.metal, self.bridge, self.qubit], axis=-1)
        write_png(path, (np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8))


def write_png(path, rgb):
    height, width, _ = rgb.shape
    raw = np.empty((height, 1 + width * 3), np.uint8)
    raw[:, 0] = 0
    raw[:, 1:] = rgb.reshape(height, -1)

    def chunk(tag, payload):
        body = tag + payload
        return struct.pack('>I', len(payload)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    data = zlib.compress(raw.tobytes(), 4)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', data) + chunk(b'IEND', b''))
    print(f'Wrote {path} ({path.stat().st_size / 1e6:.1f} MB)')


def launcher_shapes(edge, t, width, gap, pad_half=PAD_HALF, pad_centre=PAD_CENTRE, pad_gap=PAD_GAP, taper_end=TAPER_END):
    """Bond pad and taper towards the line: (carve shapes, fill shapes) as point lists."""
    pw, pd = pad_half
    inner = pad_centre - pd

    def poly(points):
        mapped = [edge_point(edge, t + dt, s) for s, dt in points]
        # Keep counter-clockwise order whatever the edge.
        area = sum(ax * by - bx * ay for (ax, ay), (bx, by) in zip(mapped, mapped[1:] + mapped[:1]))
        return mapped if area > 0 else mapped[::-1]

    pad = lambda grow: poly([(inner - grow, -pw - grow), (pad_centre + pd + grow, -pw - grow),
                             (pad_centre + pd + grow, pw + grow), (inner - grow, pw + grow)])
    taper = lambda grow, end: poly([(taper_end, -end - grow), (inner, -pw - grow),
                                   (inner, pw + grow), (taper_end, end + grow)])
    carve = [pad(pad_gap), taper(pad_gap, width / 2 + gap - pad_gap)]
    fill = [pad(0.0), taper(0.0, width / 2)]
    return carve, fill


def draw_chip(layout, size):
    canvas = Canvas(size, CHIP / 2)
    for line in layout.lines:
        for piece in line.pieces:
            for a, b in zip(piece, piece[1:]):
                canvas.carve(canvas.segment(a, b, line.half))
    for cx, cy, radius, gap, _qubit in layout.discs:
        canvas.carve(canvas.disc(cx, cy, radius + gap))
    for cx, cy, hw, hh, gap in layout.rects:
        canvas.carve(canvas.rect(cx, cy, hw + gap, hh + gap))
    for edge, t, line in layout.launchers:
        carve, _fill = launcher_shapes(edge, t, line.width, line.gap)
        for points in carve:
            canvas.carve(canvas.quad(points))

    for line in layout.lines:
        for piece in line.pieces:
            for a, b in zip(piece, piece[1:]):
                canvas.fill(canvas.segment(a, b, line.width / 2))
    for cx, cy, radius, _gap, qubit in layout.discs:
        canvas.fill(canvas.disc(cx, cy, radius), canvas.qubit if qubit else None)
    for cx, cy, hw, hh, _gap in layout.rects:
        canvas.fill(canvas.rect(cx, cy, hw, hh))
    for edge, t, line in layout.launchers:
        _carve, fill = launcher_shapes(edge, t, line.width, line.gap)
        for points in fill:
            canvas.fill(canvas.quad(points))

    for action, kind, *shape in layout.details:
        drawn = getattr(canvas, kind)(*shape)
        if action == 'carve':
            canvas.carve(drawn)
        else:
            canvas.fill(drawn, canvas.qubit if action == 'qubit' else None)
    canvas.qubit *= canvas.metal  # only the metal of a qubit glows
    canvas.holes(HOLE, HOLE_PITCH, offset=HOLE_PITCH / 2)
    for cx, cy, hw, hh in layout.bridges:
        canvas.fill(canvas.rect(cx, cy, hw, hh), canvas.bridge)
    canvas.frame(CHIP / 2 - BORDER)
    return canvas


# ---------------------------------------------------------------------------
# Board around the chip: gold ground plane, a landing pad and a straight trace for each signal
# pad, ending on staggered contacts; plated vias in the ground plane.

OPENING = EDGE + 0.3  # half size of the opening for the chip
BOARD = 2 * OPENING + 12.0
HOLDER = BOARD / 2 + 3.5  # half size of the gold-plated holder
LANDING = (OPENING + 0.18, OPENING + 0.65)  # landing pads, distance from the centre
BOARD_TRACE = (0.14, 0.08)
CONTACT_ROWS = (OPENING + 3.1, OPENING + 3.9)
CONTACT_RADIUS = 0.16


def board_signals(layout):
    """(edge, t, end) for every signal pad of the chip."""
    signals = []
    for edge in ('top', 'bottom', 'left', 'right'):
        ts = sorted(t for e, t, _l in layout.launchers if e == edge)
        signals += [(edge, t, CONTACT_ROWS[i % 2]) for i, t in enumerate(ts)]
    return signals


def draw_board(layout, size):
    canvas = Canvas(size, BOARD / 2)
    w, g = BOARD_TRACE
    signals = board_signals(layout)
    for edge, t, end in signals:
        canvas.carve(canvas.rect(*rect_on_edge(edge, t, (LANDING[0] - 0.07, LANDING[1]), PAD_HALF[0] + 0.07)))
        canvas.carve(canvas.segment(edge_point(edge, t, LANDING[1]), edge_point(edge, t, end), w / 2 + g))
        cx, cy = edge_point(edge, t, end)
        canvas.carve(canvas.segment((cx, cy), (cx, cy), CONTACT_RADIUS + 0.06))
    for edge, t, end in signals:
        canvas.fill(canvas.rect(*rect_on_edge(edge, t, LANDING, PAD_HALF[0])))
        canvas.fill(canvas.segment(edge_point(edge, t, LANDING[1] - 0.05), edge_point(edge, t, end), w / 2))
        cx, cy = edge_point(edge, t, end)
        canvas.fill(canvas.segment((cx, cy), (cx, cy), CONTACT_RADIUS))
    # Plated vias: a regular grid in the ground plane, away from the traces.
    canvas.keep |= canvas.metal < 0.99
    grow = np.zeros_like(canvas.keep)
    radius = int(0.12 / canvas.px)
    for d in range(-radius, radius + 1, max(1, radius // 3)):
        grow |= np.roll(canvas.keep, d, axis=0) | np.roll(canvas.keep, d, axis=1)
    canvas.keep = grow
    coords = (np.arange(canvas.n, dtype=np.float32) + 0.5) * canvas.px - canvas.extent
    near_x = np.abs(np.mod(coords + 0.3, 0.6) - 0.3)
    distance = np.hypot(near_x[None, :], near_x[:, None])
    vias = (distance < 0.07) & ~canvas.keep
    canvas.bridge[vias] = 1.0  # raised plated ring around each via
    canvas.metal[(distance < 0.05) & ~canvas.keep] = 0.0
    return canvas


def rect_on_edge(edge, t, span, half_width):
    s0, s1 = span
    (ax, ay), (bx, by) = edge_point(edge, t - half_width, s0), edge_point(edge, t + half_width, s1)
    return (ax + bx) / 2, (ay + by) / 2, abs(bx - ax) / 2, abs(by - ay) / 2


# ---------------------------------------------------------------------------
# Materials


def srgb_to_linear(value):
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def hex_color(code):
    code = code.lstrip('#')
    return tuple(srgb_to_linear(int(code[i : i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


def principled(material):
    if material.node_tree is None:
        material.use_nodes = True
    return next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')


def textured_material(name, image_path):
    """Plain material with the image as base colour, so the glTF exporter embeds it."""
    material = bpy.data.materials.new(name)
    bsdf = principled(material)
    bsdf.inputs['Roughness'].default_value = 0.5
    image = material.node_tree.nodes.new('ShaderNodeTexImage')
    image.image = bpy.data.images.load(str(image_path))
    material.node_tree.links.new(image.outputs['Color'], bsdf.inputs['Base Color'])
    return material


def make_material(name, color, metallic, roughness):
    material = bpy.data.materials.new(name)
    bsdf = principled(material)
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return material


def patterned_material(name, image_path, base, metal, bump_strength, glow=None, film=0.0):
    """Two Principled BSDFs mixed by the red channel of an image (metal), with bump from the
    red and green channels and, optionally, emission from the blue channel."""
    material = bpy.data.materials.new(name)
    principled(material)
    nodes, links = material.node_tree.nodes, material.node_tree.links
    output = next(node for node in nodes if node.type == 'OUTPUT_MATERIAL')
    for node in list(nodes):
        if node.type != 'OUTPUT_MATERIAL':
            nodes.remove(node)

    coords = nodes.new('ShaderNodeTexCoord')
    image = nodes.new('ShaderNodeTexImage')
    image.image = bpy.data.images.load(str(image_path))
    image.image.colorspace_settings.name = 'Non-Color'
    image.interpolation = 'Cubic'
    links.new(coords.outputs['Generated'], image.inputs['Vector'])
    channels = nodes.new('ShaderNodeSeparateColor')
    links.new(image.outputs['Color'], channels.inputs['Color'])

    def bsdf(spec):
        node = nodes.new('ShaderNodeBsdfPrincipled')
        color, metallic, roughness = spec
        node.inputs['Base Color'].default_value = color
        node.inputs['Metallic'].default_value = metallic
        node.inputs['Roughness'].default_value = roughness
        return node

    under, over = bsdf(base), bsdf(metal)
    if film:
        under.inputs['Thin Film Thickness'].default_value = film
        under.inputs['Thin Film IOR'].default_value = 1.46
    if glow:
        color, strength = glow
        over.inputs['Emission Color'].default_value = color
        scale = nodes.new('ShaderNodeMath')
        scale.operation = 'MULTIPLY'
        scale.inputs[1].default_value = strength
        links.new(channels.outputs['Blue'], scale.inputs[0])
        links.new(scale.outputs['Value'], over.inputs['Emission Strength'])

    height = nodes.new('ShaderNodeMath')
    height.operation = 'MULTIPLY_ADD'
    height.inputs[1].default_value = 3.0
    links.new(channels.outputs['Green'], height.inputs[0])
    links.new(channels.outputs['Red'], height.inputs[2])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = bump_strength
    bump.inputs['Distance'].default_value = 0.002
    links.new(height.outputs['Value'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], under.inputs['Normal'])
    links.new(bump.outputs['Normal'], over.inputs['Normal'])

    mix = nodes.new('ShaderNodeMixShader')
    links.new(channels.outputs['Red'], mix.inputs['Fac'])
    links.new(under.outputs['BSDF'], mix.inputs[1])
    links.new(over.outputs['BSDF'], mix.inputs[2])
    links.new(mix.outputs['Shader'], output.inputs['Surface'])
    return material


# ---------------------------------------------------------------------------
# Geometry


def add_object(name, bm, material, collection):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = False
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def add_box(bm, xmin, xmax, ymin, ymax, zmin, zmax):
    matrix = Matrix.Translation(((xmin + xmax) / 2, (ymin + ymax) / 2, (zmin + zmax) / 2))
    matrix = matrix @ Matrix.Diagonal((xmax - xmin, ymax - ymin, zmax - zmin, 1.0))
    bmesh.ops.create_cube(bm, size=1.0, matrix=matrix)


def add_frame(bm, inner, outer, zmin, zmax):
    """Square ring between half sizes inner and outer."""
    add_box(bm, -outer, outer, inner, outer, zmin, zmax)
    add_box(bm, -outer, outer, -outer, -inner, zmin, zmax)
    add_box(bm, -outer, -inner, -inner, inner, zmin, zmax)
    add_box(bm, inner, outer, -inner, inner, zmin, zmax)


def add_cylinder(bm, x, y, radius, zmin, zmax, segments=24):
    matrix = Matrix.Translation((x, y, (zmin + zmax) / 2))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius,
                          depth=zmax - zmin, matrix=matrix)


def add_tube(bm, points, radius, sides=6):
    rings = []
    for i, point in enumerate(points):
        forward = (points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]).normalized()
        side = forward.cross(Vector((0, 0, 1)))
        if side.length < 1e-6:
            side = forward.cross(Vector((1, 0, 0)))
        side.normalize()
        up = side.cross(forward)
        ring = []
        for k in range(sides):
            a = 2 * math.pi * k / sides
            ring.append(bm.verts.new(point + radius * (math.cos(a) * side + math.sin(a) * up)))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(sides):
            bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k]))


def bond_curve(start, end, height, samples=6):
    """Ball bond on the chip, steep rise, then a sloping span down to the wedge on the board."""
    start, end = Vector(start), Vector(end)
    flat = end - start
    flat.z = 0
    controls = [
        start,
        start + Vector((0, 0, height * 0.75)) + flat * 0.06,
        start + Vector((0, 0, height)) + flat * 0.3,
        start + Vector((0, 0, height * 0.55)) + flat * 0.75,
        end + Vector((0, 0, 0.004)),
    ]
    points = []
    for i in range(len(controls) - 1):
        p0 = controls[max(i - 1, 0)]
        p1, p2 = controls[i], controls[i + 1]
        p3 = controls[min(i + 2, len(controls) - 1)]
        for s in range(samples):
            t = s / samples
            points.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                                 + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t))
    points.append(controls[-1])
    return points


def build(layout, chip_texture, board_texture):
    collection = bpy.data.collections.new('chip')
    bpy.context.scene.collection.children.link(collection)
    glow = (hex_color('#e891db'), ARGS.glow) if ARGS.glow else None

    chip_top = textured_material('chip-pattern', chip_texture) if ARGS.glb else patterned_material(
        'chip-pattern',
        chip_texture,
        base=(hex_color('#0d0c12'), 0.0, 0.12),
        metal=(hex_color('#d9dbe0'), 1.0, 0.12),
        bump_strength=0.25,
        glow=glow,
        film=110.0,
    )
    board_top = textured_material('board-pattern', board_texture) if ARGS.glb else patterned_material(
        'board-pattern',
        board_texture,
        base=(hex_color('#2a1d20'), 0.0, 0.55),
        metal=(hex_color('#e8bd68'), 1.0, 0.24),
        bump_strength=0.4,
    )
    silicon = make_material('silicon', hex_color('#2b2c33'), 0.0, 0.3)
    board_core = make_material('board-core', hex_color('#3a2a22'), 0.0, 0.7)
    gold = make_material('gold', hex_color('#e2b65e'), 1.0, 0.28)
    aluminium = make_material('wire', hex_color('#d4d6db'), 1.0, 0.3)
    steel = make_material('steel', hex_color('#9a9ca2'), 1.0, 0.32)

    half = CHIP / 2
    top = DIE_THICKNESS

    # Die: the patterned top face is its own object so the texture maps onto it exactly.
    die = bmesh.new()
    add_box(die, -half, half, -half, half, 0.0, top - 0.0005)
    add_object('die', die, silicon, collection)
    face = bmesh.new()
    bmesh.ops.create_grid(face, x_segments=1, y_segments=1, size=half, matrix=Matrix.Translation((0, 0, top)))
    planar_uvs(add_object('chip-top', face, chip_top, collection), half)

    # Board around the opening, with its patterned top face.
    board = bmesh.new()
    add_frame(board, OPENING, BOARD / 2, -0.1, top - 0.0005)
    add_object('board', board, board_core, collection)
    board_face = bmesh.new()
    add_board_face(board_face)
    planar_uvs(add_object('board-top', board_face, board_top, collection), BOARD / 2)

    # Gold-plated holder: base, raised floor under the chip, frame with screws.
    holder = bmesh.new()
    add_box(holder, -HOLDER, HOLDER, -HOLDER, HOLDER, -2.6, -0.1)
    add_box(holder, -OPENING, OPENING, -OPENING, OPENING, -0.1, 0.0)
    add_frame(holder, BOARD / 2 + 0.2, HOLDER, -0.1, 1.8)
    add_object('holder', holder, gold, collection)
    screws = bmesh.new()
    for sx in (-1, 1):
        for sy in (-1, 1):
            corner = HOLDER - 1.65
            add_cylinder(screws, corner * sx, corner * sy, 0.9, 1.8, 2.2, 32)
    add_object('screws', screws, steel, collection)

    # Contacts at the end of the board traces.
    contacts = bmesh.new()
    for edge, t, end in board_signals(layout):
        x, y = edge_point(edge, t, end)
        add_cylinder(contacts, x, y, CONTACT_RADIUS * 0.75, top, top + 0.7, 16)
    add_object('contacts', contacts, gold, collection)

    # Wire bonds (lighter for the website, where they are seen from further away).
    samples, sides = (3, 4) if ARGS.glb else (6, 6)
    bonds = bmesh.new()
    for edge, t in layout.signal_bonds:
        start = (*edge_point(edge, t, PAD_CENTRE + 0.02), top)
        end = (*edge_point(edge, t, LANDING[0] + 0.24), top)
        add_tube(bonds, bond_curve(start, end, RNG.uniform(0.2, 0.26), samples), 0.0125, sides)
    for edge, t in layout.ground_bonds:
        start = (*edge_point(edge, t, CHIP / 2 - 0.16), top)
        end = (*edge_point(edge, t, OPENING + 0.12), top)
        add_tube(bonds, bond_curve(start, end, RNG.uniform(0.14, 0.18), samples), 0.0125, sides)
    add_object('bonds', bonds, aluminium, collection)

    for (row, col), (x, y) in zip(layout.qubit_names, layout.qubits):
        marker = bpy.data.objects.new(f'qubit-{row}-{col}', None)
        marker.location = (x, y, top)
        collection.objects.link(marker)
    return collection


def planar_uvs(obj, half):
    """UVs from the position on a square of side 2 * half centred on the origin."""
    mesh = obj.data
    layer = mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        x, y, _z = mesh.vertices[loop.vertex_index].co
        layer.data[loop.index].uv = (min(1, max(0, (x + half) / (2 * half))), min(1, max(0, (y + half) / (2 * half))))


def add_board_face(bm):
    """Top face of the board: a square frame; its bounds span the whole board, so the generated
    texture coordinates match the board texture."""
    half, inner = BOARD / 2, OPENING
    z = DIE_THICKNESS
    corners = lambda h: [Vector((-h, -h, z)), Vector((h, -h, z)), Vector((h, h, z)), Vector((-h, h, z))]
    outer_v = [bm.verts.new(v) for v in corners(half)]
    inner_v = [bm.verts.new(v) for v in corners(inner)]
    for k in range(4):
        bm.faces.new((outer_v[k], outer_v[(k + 1) % 4], inner_v[(k + 1) % 4], inner_v[k]))


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


# ---------------------------------------------------------------------------
# Render


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


def add_area_light(name, location, target, color, energy, size, size_y=None):
    light = bpy.data.lights.new(name, 'AREA')
    light.color = color[:3]
    light.energy = energy
    light.size = size
    if size_y:
        light.shape = 'RECTANGLE'
        light.size_y = size_y
    obj = bpy.data.objects.new(name, light)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.visible_camera = False
    look_at(obj, target)


def render(path, layout):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    enable_gpu()
    scene.cycles.samples = ARGS.samples
    scene.cycles.use_denoising = True
    width, height = (int(v) for v in ARGS.resolution.split('x'))
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.exposure = 0.2

    world = bpy.data.worlds.new('World')
    scene.world = world
    if world.node_tree is None:
        world.use_nodes = True
    background = world.node_tree.nodes['Background']
    background.inputs['Color'].default_value = hex_color('#05060d')
    background.inputs['Strength'].default_value = 1.0

    camera_data = bpy.data.cameras.new('Camera')
    camera_data.clip_start = 0.05
    camera_data.clip_end = 400
    camera = bpy.data.objects.new('Camera', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    if ARGS.view == 'top':
        camera_data.type = 'ORTHO'
        camera_data.ortho_scale = CHIP + 0.6
        camera.location = (0, 0, 40)
        look_at(camera, (0, 0, 0))
        # A large soft panel above, all around the camera: the metal mirrors it.
        add_area_light('Above', (0, 0, 60), (0, 0, 0), hex_color('#fff6ea'), 5.0e4, 140)
        add_area_light('Violet', (-30, 40, 25), (0, 0, 0), hex_color('#b876b0'), 2.5e3, 40)
    else:
        target = Vector((*layout.focus, DIE_THICKNESS)) if ARGS.view == 'macro' else Vector((0, 0, 0))
        azimuth, elevation, distance, lens = {
            'macro': (math.radians(-28), math.radians(32), 10.0, 60),
            'package': (math.radians(-30), math.radians(48), 2.7 * BOARD, 50),
        }[ARGS.view]
        camera_data.lens = lens
        camera.location = target + distance * Vector((
            math.sin(azimuth) * math.cos(elevation),
            -math.cos(azimuth) * math.cos(elevation),
            math.sin(elevation),
        ))
        look_at(camera, target)
        if ARGS.view == 'macro':
            camera_data.dof.use_dof = True
            camera_data.dof.focus_distance = (camera.location - target).length
            camera_data.dof.aperture_fstop = 0.15

        # Lights placed relative to the camera. The metal is a mirror: it shows a light only in
        # the mirrored direction of the view, so a narrow strip there draws one bright band
        # across the chip and the rest of the metal stays dark.
        away = math.atan2(-math.sin(azimuth), math.cos(azimuth))

        def toward(turn, rise, distance):
            a, e = away + math.radians(turn), math.radians(rise)
            return target + distance * Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))

        strip_rise = math.degrees(elevation) + (3 if ARGS.view == 'macro' else 4)
        add_area_light('Strip', toward(0, strip_rise, 60), target, hex_color('#fff4e6'), 1.2e3, 44, 3.5)
        add_area_light('Key', toward(-75, 38, 60), target, hex_color('#ffe2b0'), 2.6e3, 30)
        add_area_light('Violet', toward(95, 14, 50), target, hex_color('#b876b0'), 1.6e3, 22)
        add_area_light('Fill', toward(180, 40, 60), target, hex_color('#96acd4'), 300, 40)

    path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    print(f'Rendered {path}')


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    layout = build_layout()
    print(f'{len(layout.qubits)} qubits, {len(layout.lines)} lines, {len(layout.bridges)} bridges, '
          f'{len(layout.signal_bonds) + len(layout.ground_bonds)} wire bonds')
    textures = Path(ARGS.textures).resolve()
    chip_texture = textures / 'chip-pattern.png'
    board_texture = textures / 'chip-board.png'
    draw_chip(layout, ARGS.texture_size).save(chip_texture)
    draw_board(layout, 2048 if ARGS.glb else 4096).save(board_texture)
    collection = build(layout, chip_texture, board_texture)
    if ARGS.glb:
        export_glb(collection, Path(ARGS.glb).resolve())
    if ARGS.render:
        render(Path(ARGS.render).resolve(), layout)
    if ARGS.blend:
        blend = Path(ARGS.blend).resolve()
        blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))


main()
