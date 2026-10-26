import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Fraction of the viewport height where a stage plate of the page lines up with the 3D plate. */
export const ALIGN_AT = 0.4;

export interface StageAnchor {
  /** Plate name suffix, e.g. "4K". */
  label: string;
  /** Page scroll progress (0–1) at which this stage is aligned. */
  progress: number;
  /** Fraction of the viewport height where the page plate is at that progress. */
  align: number;
}

/** Layout of the top of the page, as fractions of the viewport height. */
export interface PageTop {
  /** Where the first stage plate sits when the page opens. */
  plate: number;
  /** Where the content starts, below the header. */
  ceiling: number;
}

export interface ScrollTracker {
  /** Scroll progress smoothed by the ScrollTrigger scrub. */
  readonly progress: number;
  readonly anchors: StageAnchor[];
  readonly top: PageTop;
  /** Whether the page stops on one stage at a time (CSS scroll snap). */
  readonly snapping: boolean;
  dispose(): void;
}

/*
 * Tracks the scroll of the whole page. Anchors come from the stage plates in the page
 * ([data-stage-plate], measured at the gold line in their middle) and are measured again on
 * every ScrollTrigger refresh (resize, fonts). When the page stops on each stage (CSS scroll
 * snap), a stage is aligned where the page stops on it, with its plate wherever it is on screen;
 * otherwise when its plate reaches ALIGN_AT.
 */
export function createScrollTracker(): ScrollTracker {
  const state = { progress: 0 };
  let anchors: StageAnchor[] = [];
  let top: PageTop = { plate: ALIGN_AT, ceiling: 0 };
  let snapping = false;

  const tween = gsap.to(state, {
    progress: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 1.2 },
  });

  const measure = () => {
    const viewport = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - viewport);
    const plates = [...document.querySelectorAll<HTMLElement>('[data-stage-plate]')];
    const pageY = (element: Element, middle = false) => {
      const rect = element.getBoundingClientRect();
      return rect.top + (middle ? rect.height / 2 : 0) + window.scrollY;
    };
    snapping = getComputedStyle(document.documentElement).scrollSnapType !== 'none';
    // Where the page stops on the section of a plate, from its scroll-snap-align and margin.
    const stop = (element: Element) => {
      const area = element.closest('section, footer') ?? element;
      const style = getComputedStyle(area);
      return style.scrollSnapAlign.includes('end')
        ? pageY(area) + area.getBoundingClientRect().height - viewport
        : pageY(area) - parseFloat(style.scrollMarginTop);
    };
    anchors = plates.map((element, index) => {
      const plate = pageY(element, true);
      const target = snapping ? stop(element) : plate - viewport * ALIGN_AT;
      const scroll = index === 0 ? 0 : Math.min(max, Math.max(0, target));
      return {
        label: element.dataset.stagePlate ?? '',
        progress: scroll / max,
        align: snapping ? (plate - scroll) / viewport : ALIGN_AT,
      };
    });
    const first = plates[0];
    const section = first?.closest('section');
    top = {
      plate: first ? pageY(first, true) / viewport : ALIGN_AT,
      ceiling: section ? pageY(section) / viewport : 0,
    };
  };
  ScrollTrigger.addEventListener('refresh', measure);
  measure();

  return {
    get progress() {
      return state.progress;
    },
    get anchors() {
      return anchors;
    },
    get top() {
      return top;
    },
    get snapping() {
      return snapping;
    },
    dispose() {
      ScrollTrigger.removeEventListener('refresh', measure);
      tween.scrollTrigger?.kill();
      tween.kill();
    },
  };
}

/**
 * Position between the stages for a given progress: integer part = stage index,
 * fractional part = eased transition towards the next stage.
 */
export function stagePosition(anchors: StageAnchor[], progress: number): number {
  if (anchors.length < 2) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    const from = anchors[i].progress;
    const to = anchors[i + 1].progress;
    if (progress <= to || i === anchors.length - 2) {
      const t = to > from ? Math.min(1, Math.max(0, (progress - from) / (to - from))) : 1;
      return i + t * t * (3 - 2 * t);
    }
  }
  return anchors.length - 1;
}
