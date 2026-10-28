/*
 * Keeps the 3D smooth without giving up quality where the device can afford it.
 *
 * Pace: the scene is drawn about 30 times per second, enough for the slow turn and the particles.
 * On large screens, while the page scrolls or the model turns, at most about 60 (on a 120 Hz
 * screen every other refresh, on 144 Hz 72 times), so that it keeps up with the page. The page
 * itself always scrolls at the speed of the screen, and the graphics card keeps time for it.
 *
 * Resolution: it goes down one level when frames come late, or when the graphics card is busy for
 * most of each frame (measured where the browser allows it, Chrome on computers). It goes back up
 * only when the graphics card has plenty of room again.
 */

/**
 * On large screens the scene is drawn with at least this many pixels per CSS pixel, and the
 * browser scales it down: thin cables, reflections and the drawing of the chip get smooth edges,
 * like the text around them. Denser screens get their full resolution. At most PIXEL_BUDGET
 * pixels per frame.
 */
const SHARP_RATIO = 2;
const PIXEL_BUDGET = 20e6;
/** Frames per second drawn at most: while the page moves on large screens, and otherwise. */
export const MOVING_FPS = 60;
export const STILL_FPS = 30;
/**
 * The resolution goes down when the median frame of a window takes longer than SLOW times the
 * time a frame should take (20 ms at 60 frames per second, 40 ms at 30)...
 */
const SLOW = 1.2;
/** ...or when more than LATE_SHARE of the frames take LATE times the usual interval or longer... */
const LATE = 1.5;
const LATE_SHARE = 0.25;
/** ...or when the graphics card works for more than GPU_BUSY of the interval between frames. */
const GPU_BUSY = 0.7;
/**
 * It goes back up when, at the level above, the graphics card would work for less than GPU_ROOM
 * of the interval, for ROOM_WINDOWS windows in a row.
 */
const GPU_ROOM = 0.45;
const ROOM_WINDOWS = 3;

/**
 * Drawing resolutions to choose from, in pixels per CSS pixel, sharpest first. The last one is a
 * little below the screen's own resolution, for devices that cannot keep up even there.
 */
export function resolutionLevels(area: number, small: boolean): number[] {
  const device = window.devicePixelRatio;
  const screen = Math.min(device, small ? 1.5 : 2);
  const budget = Math.sqrt(PIXEL_BUDGET / Math.max(1, area));
  const top = small ? screen : Math.max(screen, Math.min(Math.max(device, SHARP_RATIO), budget));
  const levels = [top];
  if (top - screen >= 0.5) levels.push((top + screen) / 2);
  if (screen < top) levels.push(screen);
  if (screen > 1) levels.push(Math.max(1, screen * 0.75));
  return levels;
}

/**
 * Decides on which animation frames the scene is drawn: at most `fps` times per second, which can
 * change, never more than `fastest`.
 */
export class FramePacer {
  /** Time a frame should take at the current pace, in milliseconds. */
  target: number;
  private readonly deltas: number[] = [];
  /** Time between two refreshes of the screen: the median time between animation frames. */
  private refresh = 1000 / 60;
  private last = 0;
  private skipped = 0;

  constructor(private readonly fastest: number) {
    this.target = 1000 / fastest;
  }

  set fps(fps: number) {
    this.target = 1000 / Math.min(fps, this.fastest);
  }

  /** Refreshes of the screen between two drawn frames, for a frame that should take `target`. */
  private every(target = this.target) {
    return Math.max(1, Math.floor((target + 1) / this.refresh));
  }

  /** Usual time between two drawn frames, in milliseconds. */
  get interval() {
    return this.every() * this.refresh;
  }

  /** The same at the fastest pace: the time the graphics card has when the page moves. */
  get shortest() {
    return this.every(1000 / this.fastest) * this.refresh;
  }

  /** Called on every animation frame: whether the scene is drawn on this one. */
  due(now: number): boolean {
    const delta = now - this.last;
    this.last = now;
    if (delta > 0 && delta < 100) {
      this.deltas.push(delta);
      if (this.deltas.length === 60) {
        this.deltas.sort((a, b) => a - b);
        this.refresh = this.deltas[30] ?? this.refresh;
        this.deltas.length = 0;
      }
    }
    if (++this.skipped < this.every()) return false;
    this.skipped = 0;
    return true;
  }

  reset(now: number) {
    this.last = now;
    this.skipped = 0;
  }
}

/** The WebGL extension that measures time on the graphics card (missing from the DOM types). */
interface TimerQueryExtension {
  readonly TIME_ELAPSED_EXT: GLenum;
  readonly GPU_DISJOINT_EXT: GLenum;
}

/** Time the graphics card spends on each frame, where the browser can measure it. */
export class GpuTimer {
  private readonly extension: TimerQueryExtension | null;
  private readonly free: WebGLQuery[] = [];
  private readonly pending: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.extension = gl.getExtension(
      'EXT_disjoint_timer_query_webgl2',
    ) as TimerQueryExtension | null;
  }

  begin() {
    if (!this.extension || this.active || this.pending.length > 4) return;
    const query = this.free.pop() ?? this.gl.createQuery();
    this.gl.beginQuery(this.extension.TIME_ELAPSED_EXT, query);
    this.active = query;
  }

  end() {
    if (!this.extension || !this.active) return;
    this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  /** Adds the times measured so far, in milliseconds, to `times`. */
  collect(times: number[]) {
    if (!this.extension) return;
    // A disjoint event (for example the GPU clock changing) makes the pending times unreliable.
    const disjoint = this.gl.getParameter(this.extension.GPU_DISJOINT_EXT) as boolean;
    while (this.pending.length > 0) {
      const query = this.pending[0]!;
      if (!this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE)) break;
      const nanoseconds = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT) as number;
      this.free.push(this.pending.shift()!);
      if (!disjoint) times.push(nanoseconds / 1e6);
    }
  }

  dispose() {
    for (const query of [...this.free, ...this.pending]) this.gl.deleteQuery(query);
    this.free.length = 0;
    this.pending.length = 0;
  }
}

/** Watches the drawn frames in windows of time and picks the level of resolution. */
export class QualityWatch {
  /** Index in the resolution levels: 0 is the sharpest. */
  level = 0;
  /** The sharpest level it may go back to: a level where frames came late is not tried again. */
  private ceiling = 0;
  /** Each frame's time, as a share of the time it should have taken. */
  private readonly frames: number[] = [];
  private lateFrames = 0;
  private readonly gpu: number[] = [];
  private elapsed = 0;
  private roomWindows = 0;

  /**
   * Adds a drawn frame, with the pace it was drawn at. At the end of a window of `span`
   * milliseconds returns what happened: "down" or "up" when the level changed, "steady"
   * otherwise; null in the middle of a window. The graphics card is judged against the fastest
   * pace, so that the page stays smooth when it moves. Before the model is shown only the median
   * frame and the graphics card count: the animation of the title can delay a few frames.
   */
  record(
    frame: number,
    pace: { target: number; interval: number; shortest: number },
    levels: number[],
    timer: GpuTimer,
    { span, early }: { span: number; early: boolean },
  ): 'down' | 'up' | 'steady' | null {
    this.frames.push(frame / pace.target);
    if (frame >= pace.interval * LATE) this.lateFrames++;
    this.elapsed += frame;
    timer.collect(this.gpu);
    if (this.elapsed < span) return null;

    const median = medianOf(this.frames);
    const late = this.lateFrames / this.frames.length;
    const gpu = this.gpu.length > 0 ? medianOf(this.gpu) : null;
    const framesSlow = median > SLOW || (!early && late > LATE_SHARE);
    const gpuBusy = gpu !== null && gpu > pace.shortest * GPU_BUSY;
    this.reset();

    if ((framesSlow || gpuBusy) && this.level < levels.length - 1) {
      // Far too slow: straight to the lightest level.
      const lowest = median > SLOW * 2;
      this.level = lowest ? levels.length - 1 : this.level + 1;
      if (framesSlow) this.ceiling = this.level;
      this.roomWindows = 0;
      return 'down';
    }
    // At the level above, the graphics card would draw (ratio above / ratio here)² as many pixels.
    const growth = ((levels[this.level - 1] ?? 0) / (levels[this.level] ?? 1)) ** 2;
    if (gpu !== null && this.level > this.ceiling && gpu * growth < pace.shortest * GPU_ROOM) {
      if (++this.roomWindows >= ROOM_WINDOWS) {
        this.level--;
        this.roomWindows = 0;
        return 'up';
      }
    } else {
      this.roomWindows = 0;
    }
    return 'steady';
  }

  /** Drops the current window, for example after the tab was hidden. */
  reset() {
    this.frames.length = 0;
    this.lateFrames = 0;
    this.gpu.length = 0;
    this.elapsed = 0;
  }
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? 0;
}
