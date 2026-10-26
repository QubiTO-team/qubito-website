/*
 * Turns the collapsed hero claim ("QubiTO") into the QubiTO logo once the collapse is over:
 * the "Q" becomes the Bloch sphere and grows its state vector, the "u" becomes the potential
 * well and fills its energy levels from the ground state up, "biTO" glides onto the letters of
 * the logo and the brackets close around the name. Hovering the logo goes back to
 * "Qubit + Torino". The logo is centred on the tagline ([data-claim-anchor]).
 *
 * Scrolling then hands the logo over to the header: it scrolls with the page until it touches
 * the header logo, then stays there and shrinks into it while its bottom edge keeps moving with
 * the page, so the content below never slides under it. The header logo does the shrinking
 * (it is drawn above the header background); the hero logo hides in the same frame.
 */

const VIEW_WIDTH = 3683.983;
/** Horizontal centre of the brackets, as a fraction of the logo width. */
const LOGO_CENTRE = 0.4968;
/** Morph durations, milliseconds: normal, when the page is already scrolled, and back. */
const MORPH_MS = 2600;
const HURRIED_MS = 1000;
const UNMORPH_MS = 900;

interface Move {
  /** Element that moves; `fade` is the one that fades out (they differ for the "O"). */
  element: HTMLElement;
  fade: HTMLElement;
  dx: number;
  dy: number;
  /** Final size relative to the text: height and width match the logo part. */
  scaleX: number;
  scaleY: number;
  origin: string;
  from: number;
  to: number;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Eased progress of `p` within the range [from, to]. */
const range = (p: number, from: number, to: number) => smooth(clamp((p - from) / (to - from)));

export function animateClaimLogo(claim: HTMLElement) {
  const rows = claim.querySelector<HTMLElement>('.claim-rows');
  const logo = claim.querySelector<SVGSVGElement>('[data-claim-logo]');
  if (!rows || !logo) return;
  const root = document.documentElement;
  const anchor = document.querySelector<HTMLElement>('[data-claim-anchor]');
  const headerLogo = document.querySelector<HTMLElement>('[data-site-logo] img');
  const canHover = window.matchMedia('(hover: hover)').matches;

  const piece = (name: string) => claim.querySelector<HTMLElement>(`[data-piece="${name}"]`)!;
  const parts = (name: string) => [
    ...logo.querySelectorAll<SVGGraphicsElement>(`[data-part="${name}"]`),
  ];
  const sphere = parts('sphere');
  const equator = parts('equator');
  const centre = parts('centre');
  const vector = parts('vector');
  const well = parts('well');
  const levels = parts('level');
  const letters = [...parts('b'), ...parts('i'), ...parts('T'), ...parts('O')];
  const brackets = [...parts('bracket-left'), ...parts('bracket-right')];

  let moves: Move[] = [];
  let measured = false;
  /** 0 = text, 1 = logo. */
  let morph = 0;
  /** The hero logo on the page (top in page coordinates) and the header logo on screen. */
  let logoBox = { left: 0, top: 0, height: 1 };
  let headerBox: DOMRect | undefined;

  /** Ink box of a text piece: horizontal extent of its box, vertical extent of its glyphs. */
  const inkBox = (element: HTMLElement): Box => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = context.measureText(element.textContent?.trim() ?? '');
    const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    const baseline = box.top + (box.height - fontHeight) / 2 + metrics.fontBoundingBoxAscent;
    return {
      x: box.left,
      y: baseline - metrics.actualBoundingBoxAscent,
      width: box.width,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
    };
  };

  /** Box of some logo parts on screen, from their geometry (their own transforms ignored). */
  const partsBox = (elements: SVGGraphicsElement[]): Box => {
    const view = logo.getBoundingClientRect();
    const unit = view.width / VIEW_WIDTH;
    const boxes = elements.map((element) => element.getBBox());
    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));
    const right = Math.max(...boxes.map((b) => b.x + b.width));
    const bottom = Math.max(...boxes.map((b) => b.y + b.height));
    return {
      x: view.left + x * unit,
      y: view.top + y * unit,
      width: (right - x) * unit,
      height: (bottom - y) * unit,
    };
  };

  /** Centres the logo on the longest line of the tagline. */
  const centreLogo = () => {
    if (!anchor) return;
    const text = document.createRange();
    text.selectNodeContents(anchor);
    const lines = [...text.getClientRects()];
    if (!lines.length) return;
    const middle =
      (Math.min(...lines.map((r) => r.left)) + Math.max(...lines.map((r) => r.right))) / 2;
    const width = logo.getBoundingClientRect().width;
    logo.style.left = `${middle - rows.getBoundingClientRect().left - LOGO_CENTRE * width}px`;
  };

  /** Measures every move on the collapsed title, with no transform applied. */
  const measure = () => {
    const sources = ['q', 'u', 'bi', 'T', 'O'].map(piece);
    for (const element of sources) element.style.transform = '';
    if (headerLogo) headerLogo.style.transform = '';
    centreLogo();
    const targets = [sphere, well, [...parts('b'), ...parts('i')], parts('T'), parts('O')];
    const timing = [
      [0, 0.45],
      [0.04, 0.48],
      [0.1, 0.6],
      [0.13, 0.63],
      [0.16, 0.66],
    ];
    moves = sources.map((element, index) => {
      const box = element.getBoundingClientRect();
      const ink = inkBox(element);
      const target = partsBox(targets[index]);
      const [from, to] = timing[index];
      const inkX = ink.x + ink.width / 2;
      const inkY = ink.y + ink.height / 2;
      return {
        element,
        fade: (element.firstElementChild as HTMLElement | null) ?? element,
        dx: target.x + target.width / 2 - inkX,
        dy: target.y + target.height / 2 - inkY,
        scaleX: target.width / box.width,
        scaleY: target.height / ink.height,
        origin: `${inkX - box.left}px ${inkY - box.top}px`,
        from,
        to,
      };
    });
    const view = logo.getBoundingClientRect();
    logoBox = { left: view.left, top: view.top + window.scrollY, height: view.height };
    // The header is sticky at the top, so its logo never moves on screen.
    headerBox = headerLogo?.getBoundingClientRect();
    measured = true;
  };

  const show = (elements: Element[], opacity: number, transform = '', clip = '') => {
    for (const element of elements as (HTMLElement | SVGElement)[]) {
      element.style.opacity = opacity > 0 ? String(opacity) : '';
      element.style.transform = transform;
      element.style.clipPath = clip;
    }
  };

  /** Hands the logo over to the header once the page pushes it against the header logo. */
  const dock = () => {
    let handedOver = false;
    if (morph >= 1 && headerLogo && headerBox) {
      const pushed = headerBox.top - (logoBox.top - window.scrollY);
      if (pushed >= 0) {
        handedOver = true;
        const travel = Math.max(1, logoBox.height - headerBox.height);
        const t = clamp(pushed / travel);
        const scale = (logoBox.height - t * travel) / headerBox.height;
        const x = (logoBox.left - headerBox.left) * (1 - t);
        headerLogo.style.transformOrigin = '0 0';
        headerLogo.style.transform = t < 1 ? `translate(${x}px, 0) scale(${scale})` : '';
      }
    }
    if (!handedOver && headerLogo) headerLogo.style.transform = '';
    rows.style.visibility = handedOver ? 'hidden' : '';
    root.classList.toggle('site-logo-shown', handedOver);
  };

  const render = () => {
    const p = morph;
    claim.classList.toggle('is-morphing', p > 0);
    for (const move of moves) {
      const t = range(p, move.from, move.to);
      const scaleX = 1 + (move.scaleX - 1) * t;
      const scaleY = 1 + (move.scaleY - 1) * t;
      move.element.style.transformOrigin = move.origin;
      move.element.style.transform =
        t > 0 ? `translate(${move.dx * t}px, ${move.dy * t}px) scale(${scaleX}, ${scaleY})` : '';
    }
    // The "Q" and the "u" hand over early; "biTO" crossfades once on the logo letters.
    const [q, u, ...bito] = moves;
    if (q) q.fade.style.opacity = String(1 - range(p, 0.12, 0.36));
    if (u) u.fade.style.opacity = String(1 - range(p, 0.14, 0.38));
    for (const move of bito) move.fade.style.opacity = String(1 - range(p, 0.58, 0.74));

    show(sphere, range(p, 0.14, 0.4), `scale(${0.88 + 0.12 * range(p, 0.1, 0.45)})`);
    show(equator, range(p, 0.32, 0.36), `scaleX(${range(p, 0.32, 0.58)})`);
    show(centre, range(p, 0.4, 0.5), `scale(${range(p, 0.4, 0.5)})`);
    show(vector, range(p, 0.46, 0.5), `scale(${range(p, 0.46, 0.72)})`);
    show(well, range(p, 0.22, 0.26), '', `inset(0 0 ${100 - 100 * range(p, 0.22, 0.56)}% 0)`);
    levels.forEach((level, index) => {
      const t = range(p, 0.46 + 0.08 * index, 0.66 + 0.08 * index);
      show([level], t > 0 ? 1 : 0, '', `inset(0 ${100 - 100 * t}% 0 0)`);
    });
    show(letters, range(p, 0.56, 0.72));
    const close = range(p, 0.6, 0.92);
    brackets.forEach((bracket, index) => {
      const side = index === 0 ? -1 : 1;
      show(
        [bracket],
        close,
        `translateX(${side * 260 * (1 - close)}px) scaleY(${0.7 + 0.3 * close})`,
      );
    });
    dock();
  };

  /** Resolves once the collapse (or any other transition of the title) is over. */
  const collapsedAndSettled = async () => {
    claim.classList.add('is-collapsed');
    await document.fonts.ready;
    await Promise.all(claim.getAnimations({ subtree: true }).map((a) => a.finished));
    if (!measured) measure();
  };

  /*
   * Moves `morph` towards `to` at the speed of the current duration, which is shorter while
   * the page is scrolled. A new call replaces the running one (which then resolves).
   */
  let frame = 0;
  let target = 0;
  let finish: (() => void) | undefined;
  const tween = (to: number) =>
    new Promise<void>((resolve) => {
      cancelAnimationFrame(frame);
      finish?.();
      finish = resolve;
      target = to;
      let previous = performance.now();
      const step = (now: number) => {
        const elapsed = now - previous;
        previous = now;
        const duration = to < morph ? UNMORPH_MS : window.scrollY > 0 ? HURRIED_MS : MORPH_MS;
        const delta = elapsed / duration;
        morph = to > morph ? Math.min(to, morph + delta) : Math.max(to, morph - delta);
        render();
        if (morph !== to) {
          frame = requestAnimationFrame(step);
        } else {
          frame = 0;
          finish = undefined;
          resolve();
        }
      };
      frame = requestAnimationFrame(step);
    });

  let pending: Promise<void> | undefined;
  const toLogo = () =>
    (pending ??= (async () => {
      try {
        await collapsedAndSettled();
        if (!(canHover && claim.matches(':hover'))) await tween(1);
      } finally {
        pending = undefined;
      }
    })());

  window.setTimeout(() => void toLogo(), Number(claim.dataset.delay ?? 1800) + 400);

  if (canHover) {
    claim.addEventListener('mouseenter', () => {
      if (target > 0) void tween(0);
    });
    claim.addEventListener('mouseleave', () => {
      if (measured) void toLogo();
    });
  }

  let scrollFrame = 0;
  window.addEventListener(
    'scroll',
    () => {
      // Scrolling early starts the morph right away (and faster, see tween()).
      if (target === 0 && !(canHover && claim.matches(':hover'))) void toLogo();
      if (!scrollFrame && measured) {
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          dock();
        });
      }
    },
    { passive: true },
  );

  // measure() clears the transforms itself; render() puts them back with the new sizes.
  window.addEventListener('resize', () => {
    if (!measured) return;
    measure();
    render();
  });
}
