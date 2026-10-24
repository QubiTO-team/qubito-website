// Home page behaviour: superposition text, Bloch sphere synced with the sections,
// countdown, application form (4 steps) and partner request dialog.
// Ported from demos/full-site-v3.html. Texts are rendered by the Astro components;
// only the short status messages below exist in both languages (T(en, it)).
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const MOBILE = () => innerWidth < 1000;
const lang = document.documentElement.lang === 'it' ? 'it' : 'en';
const T = (en, it) => lang === 'it' ? it : en;

const SECTIONS = [...document.querySelectorAll('[data-sec]')];
const N = SECTIONS.length;
const secName = k => SECTIONS[k].dataset.name || SECTIONS[k].id; // localised name, set by the page

// ---------- vector math ----------
const TAU = Math.PI * 2;
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const scale = (a, s) => [a[0]*s, a[1]*s, a[2]*s];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  function rot(p, n, a) {
  const c = Math.cos(a), s = Math.sin(a), k = dot(n, p) * (1 - c), x = cross(n, p);
  return [p[0]*c + x[0]*s + n[0]*k, p[1]*c + x[1]*s + n[1]*k, p[2]*c + x[2]*s + n[2]*k];
}
// shortest rotation taking a onto b
function axisAngle(a, b) {
  let ax = cross(a, b);
  const s = Math.hypot(ax[0], ax[1], ax[2]), c = clamp(dot(a, b), -1, 1);
  if (s < 1e-6) {
    if (c > 0) return { axis: [1, 0, 0], angle: 0 };
    ax = Math.abs(a[0]) < .9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0]);
    return { axis: norm(ax), angle: Math.PI };
  }
  return { axis: scale(ax, 1 / s), angle: Math.atan2(s, c) };
}
function slerp(a, b, t) {
  const { axis, angle } = axisAngle(a, b);
  return angle < 1e-6 ? b : norm(rot(a, axis, angle * t));
}

// Each section is a state on a spiral from |0⟩ (hero) down to |1⟩ (apply)
const STATES = SECTIONS.map((_, k) => {
  const th = k * Math.PI / (N - 1), ph = k * Math.PI / 2;
  return norm([Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]);
});
const nearest = p => STATES.reduce((best, s, k) => dot(p, s) > dot(p, STATES[best]) ? k : best, 0);
const deg = r => Math.round(r * 180 / Math.PI);
SECTIONS.forEach((sec, k) => {
  const idx = sec.querySelector('.idx');
  if (!idx) return;
  const th = k * Math.PI / (N - 1), ph = (k * Math.PI / 2) % TAU;
  idx.innerHTML = `<b>${String(k).padStart(2, '0')}</b> · θ=${deg(th)}° φ=${deg(ph)}°`;
});

const S2 = Math.SQRT1_2;
const GATES = {
  H:  { axis: [S2, 0, S2], angle: Math.PI,   label: 'H' },
  X:  { axis: [1, 0, 0],   angle: Math.PI,   label: 'X' },
  Y:  { axis: [0, 1, 0],   angle: Math.PI,   label: 'Y' },
  Z:  { axis: [0, 0, 1],   angle: Math.PI,   label: 'Z' },
  S:  { axis: [0, 0, 1],   angle: Math.PI/2, label: 'S' },
  SX: { axis: [1, 0, 0],   angle: Math.PI/2, label: '√X' },
};

// =====================================================================
//  Superposition text (from superposition-title.html)
// =====================================================================
const GLYPHS = [...'ψφθΨΦΩαβγλħΣΠ∂∇⊗⊕†∞01⟩⟨'];
const OBSERVE_R = 75;
const live = new Set();

class QText {
  constructor(el) { this.el = el; this.letters = []; this.gen = 0; }
  set(text, superposed) {
    this.gen++;
    this.letters.forEach(l => live.delete(l));
    this.el.textContent = '';
    this.el.setAttribute('aria-label', text);
    this.letters = [];
    text.split(' ').forEach((word, i, words) => {
      const w = document.createElement('span');
      w.className = 'qw'; w.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const s = document.createElement('span');
        s.className = 'ql'; s.textContent = ch;
        w.appendChild(s);
        this.letters.push({ el: s, final: ch, sup: false, next: 0 });
      }
      this.el.appendChild(w);
      if (i < words.length - 1) this.el.appendChild(document.createTextNode(' '));
    });
    // lock each letter's width to its real glyph so flickering doesn't shift the layout
    const fs = parseFloat(getComputedStyle(this.el).fontSize);
    for (const l of this.letters) l.el.style.width = `${l.el.getBoundingClientRect().width / fs}em`;
    if (superposed && !RM) this.letters.forEach(decohere);
  }
  collapseWave(step = 45, delay = 0) {
    const gen = this.gen;
    this.letters.forEach((l, i) =>
      setTimeout(() => { if (this.gen === gen) collapse(l); }, delay + i * step + Math.random() * 40));
  }
  decohereAll() { this.gen++; this.letters.forEach(decohere); }
  get anySup() { return this.letters.some(l => l.sup); }
}
function decohere(l) {
  if (RM || l.sup) return;
  l.sup = true; l.next = 0;
  l.el.classList.remove('flash'); l.el.classList.add('sup');
  live.add(l);
}
function collapse(l) {
  if (!l.sup) return;
  l.sup = false; live.delete(l);
  l.el.textContent = l.final;
  l.el.classList.remove('sup');
  void l.el.offsetWidth;
  l.el.classList.add('flash');
}

const qEls = [...document.querySelectorAll('.q')];
const q = new Map(qEls.map(el => [el, new QText(el)]));
const heroQ = qEls.filter(el => el.hasAttribute('data-observe')).map(el => q.get(el));
const scrollQ = qEls.filter(el => el.hasAttribute('data-scroll')).map(el => q.get(el));

let autoTimer;
function scheduleAutoMeasure(ms) {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => heroQ.forEach((t, i) => t.anySup && t.collapseWave(45, i * 250)), ms);
}

function remeasureSection(k) {
  const targets = k === 0 ? [heroQ[1]] : [...SECTIONS[k].querySelectorAll('.q')].map(el => q.get(el));
  targets.forEach(t => { t.decohereAll(); t.collapseWave(45, 300); });
}

// mouse observation of the hero
const ring = document.querySelector('.observer');
let mx = -999, my = -999, rx = -999, ry = -999, pending = false;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  mx = e.clientX; my = e.clientY;
  if (rx < -900) { rx = mx; ry = my; }
  const overHero = SECTIONS[0].getBoundingClientRect().bottom > my && !e.target.closest('.dock, nav');
  ring.classList.toggle('on', overHero);
  if (overHero && !pending) { pending = true; requestAnimationFrame(observe); }
});
document.addEventListener('mouseleave', () => ring.classList.remove('on'));
function observe() {
  pending = false;
  let hot = false;
  for (const t of heroQ) for (const l of t.letters) {
    if (!l.sup) continue;
    const r = l.el.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my);
    if (d < OBSERVE_R) collapse(l);
    else if (d < OBSERVE_R * 2) hot = true;
  }
  ring.classList.toggle('hot', hot);
}
document.querySelector('h1.title').addEventListener('click', () => {
  if (!COARSE) return;
  const t = heroQ[1]; t.decohereAll(); t.collapseWave(60, 500);
});

// =====================================================================
//  Bloch sphere, synced with the sections
// =====================================================================
const dock = document.getElementById('dock');
const canvas = document.getElementById('bloch');
const ctx = canvas.getContext('2d');
let W = 1, H = 1, cx = 0, cy = 0, R = 1;

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = W / 2; cy = H / 2;
  R = Math.min(W, H) * (W < 200 ? 0.34 : 0.3);
}
new ResizeObserver(resize).observe(canvas);

let yaw = -0.6, pitch = 0.38;
function proj(p) {
  const ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
  const x1 = p[0]*ca - p[1]*sa, y1 = p[0]*sa + p[1]*ca, z1 = p[2];
  const y2 = y1*cb - z1*sb, z2 = y1*sb + z1*cb;
  return { x: cx + x1 * R, y: cy - z2 * R, d: y2 }; // d < 0 → facing the viewer
}

let v = STATES[0];
let active = 0;          // section the qubit is currently "in"
let anim = null;         // running rotation
let hold = null;         // after a gate jump, pin the qubit while the page scrolls
let flash = null;
const queue = [];
const trail = [];

// which section is on screen (the qubit never rests between sections)
function scrollSection() {
  if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) return N - 1;
  const line = innerHeight * 0.45;
  let k = 0;
  SECTIONS.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= line) k = i; });
  return k;
}
let settled = 0;         // section state the qubit is resting on

function sectionY(k) {
  const top = SECTIONS[k].getBoundingClientRect().top + scrollY;
  return clamp(k === 0 ? 0 : top, 0, document.documentElement.scrollHeight - innerHeight);
}
function scrollToSection(k) {
  const y = sectionY(k);
  hold = { k, y, until: performance.now() + 1800 };
  scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
}

function enqueue(item) {
  if (queue.length < 3) queue.push(item);
  setMode('you');
}

function startNext(now, direct) {
  const item = direct || queue.shift();
  if (item.type === 'gate') {
    const g = GATES[item.gate];
    anim = { axis: g.axis, angle: g.angle, from: v, start: now, dur: RM ? 1 : 850, label: g.label, then: 'collapse' };
  } else {
    const { axis, angle } = axisAngle(v, STATES[item.k]);
    anim = { axis, angle, from: v, start: now, dur: RM ? 1 : (item.collapse ? 480 : item.follow ? 650 : 850), label: null,
             then: { k: item.k, p: (1 + dot(v, STATES[item.k])) / 2, collapse: item.collapse, follow: item.follow } };
  }
}

function finishAnim(now) {
  const a = anim; anim = null;
  if (a.then === 'collapse') {
    queue.unshift({ type: 'goto', k: nearest(v), collapse: true });
    return;
  }
  const k = a.then.k;
  v = STATES[k]; settled = k;
  setActive(k);
  if (a.then.follow) return; // just following the scroll
  flash = { pole: v, start: now };
  els.result.textContent = a.then.collapse
    ? `${lang === 'it' ? 'misurato' : 'measured'} → |${secName(k)}⟩   (p = ${a.then.p.toFixed(2)})`
    : `→ |${secName(k)}⟩`;
  setActive(k);
  scrollToSection(k);
  remeasureSection(k);
}

// ---------- drawing ----------
function strokeCurve(fn, frontA, backA, width) {
  const n = 72, front = new Path2D(), back = new Path2D();
  let p0 = proj(fn(0));
  for (let i = 1; i <= n; i++) {
    const p1 = proj(fn(i / n * TAU));
    const path = (p0.d + p1.d) / 2 < 0 ? front : back;
    path.moveTo(p0.x, p0.y); path.lineTo(p1.x, p1.y);
    p0 = p1;
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = `rgba(250,249,250,${backA})`; ctx.stroke(back);
  ctx.strokeStyle = `rgba(250,249,250,${frontA})`; ctx.stroke(front);
}
function line(a, b, style, width, dash) {
  ctx.save();
  ctx.strokeStyle = style; ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.restore();
}

let hoverMarker = -1;
const MONO = '"JetBrains Mono", monospace';
function square(p, size, fill, stroke) {
  const h = size / 2;
  if (fill) { ctx.fillStyle = fill; ctx.fillRect(p.x - h, p.y - h, size, size); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(p.x - h + .5, p.y - h + .5, size - 1, size - 1); }
}
function draw(now) {
  ctx.clearRect(0, 0, W, H);
  const small = W < 200;

      ctx.fillStyle = 'rgba(42,11,40,.28)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); // flat disc, no shading
  // wireframe
  for (const d of [30, 60, 120, 150]) {
    const th = d * Math.PI / 180, st = Math.sin(th), ct = Math.cos(th);
    strokeCurve(t => [st * Math.cos(t), st * Math.sin(t), ct], .22, .07, 1);
  }
  for (let k = 0; k < 6; k++) {
    const ph = k * Math.PI / 6, cp = Math.cos(ph), sp = Math.sin(ph);
    strokeCurve(t => [Math.sin(t) * cp, Math.sin(t) * sp, Math.cos(t)], .18, .05, 1);
  }
  strokeCurve(t => [Math.cos(t), Math.sin(t), 0], .55, .15, 1);
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();

  const o = proj([0, 0, 0]);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const dir of [[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]]) {
    const end = proj(scale(dir, 1.15));
    line(o, end, `rgba(250,249,250,${end.d < 0 ? .25 : .1})`, 1, [2, 4]);
  }
  if (!small) {
    ctx.font = `11px ${MONO}`;
    for (const [dir, lab] of [[[0,0,1], '|0⟩'], [[0,0,-1], '|1⟩']]) {
      const p = proj(scale(dir, 1.52));
      ctx.fillStyle = `rgba(255,255,255,${p.d < 0 ? .8 : .45})`;
      ctx.fillText(lab, p.x, p.y);
    }
  }

  // the spiral path through the sections
  ctx.save();
  ctx.setLineDash([1, 4]); ctx.lineWidth = 1;
  for (let k = 0; k < N - 1; k++) {
    let prev = proj(STATES[k]);
    for (let i = 1; i <= 16; i++) {
      const p = proj(slerp(STATES[k], STATES[k + 1], i / 16));
      ctx.strokeStyle = `rgba(201,214,239,${(prev.d + p.d) / 2 < 0 ? .85 : .3})`;
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      prev = p;
    }
  }
  ctx.restore();

  // section markers: squares, filled = front, outlined = behind
  ctx.font = `11px ${MONO}`;
  STATES.forEach((s, k) => {
    const p = proj(s), front = p.d < 0, on = k === active, hov = k === hoverMarker;
    if (small) { square(p, on ? 5 : 3, on ? '#fff' : `rgba(250,249,250,${front ? .7 : .3})`); return; }
    if (on) { square(p, 9, '#fff'); square(p, 20, null, 'rgba(255,255,255,.85)'); }
    else square(p, hov ? 8 : 6, front ? 'rgba(250,249,250,.9)' : null, front ? null : 'rgba(250,249,250,.35)');
    const lp = proj(scale(s, 1.22));
    const dx = lp.x - cx;
    ctx.textAlign = Math.abs(dx) < 8 ? 'center' : dx > 0 ? 'left' : 'right';
    ctx.fillStyle = on ? '#fff' : `rgba(250,249,250,${hov ? 1 : front ? .7 : .4})`;
    ctx.fillText(secName(k).toUpperCase(), lp.x + Math.sign(dx) * 4, lp.y + (k === 0 ? -16 : k === N - 1 ? 16 : 0));
  });
  ctx.textAlign = 'center';

  // gate rotation axis
  if (anim && anim.label) {
    const t = clamp((now - anim.start) / anim.dur, 0, 1), a = Math.sin(Math.PI * t);
    const p1 = proj(scale(anim.axis, 1.4)), p2 = proj(scale(anim.axis, -1.4));
    line(p2, p1, `rgba(150,172,212,${(.9 * a).toFixed(3)})`, 1);
    if (!small) {
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#5e195b'; ctx.fillRect(p1.x - 16, p1.y - 13, 32, 26);
      ctx.strokeStyle = '#96acd4'; ctx.lineWidth = 1; ctx.strokeRect(p1.x - 15.5, p1.y - 12.5, 31, 25);
      ctx.fillStyle = '#96acd4'; ctx.font = `600 13px ${MONO}`;
      ctx.fillText(anim.label, p1.x, p1.y + 1);
      ctx.restore();
    }
  }

  // trail
  if (trail.length > 1) {
    ctx.lineWidth = 1;
    let prev = proj(trail[0]);
    for (let i = 1; i < trail.length; i++) {
      const p = proj(trail[i]);
      ctx.strokeStyle = `rgba(255,255,255,${(Math.pow(i / trail.length, 1.5) * (p.d < 0 ? .8 : .3)).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      prev = p;
    }
  }

  // state vector: one flat line with a head
  const tip = proj(v), foot = proj([v[0], v[1], 0]);
  line(tip, foot, 'rgba(250,249,250,.25)', 1, [2, 3]);
  line(o, foot, 'rgba(250,249,250,.18)', 1, [2, 3]);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = small ? 1.5 : 2.5;
  ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  const dx = tip.x - o.x, dy = tip.y - o.y, len = Math.hypot(dx, dy);
  if (len > 14) {
    const ux = dx / len, uy = dy / len, s = small ? 7 : 11;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - ux * s - uy * s * .45, tip.y - uy * s + ux * s * .45);
    ctx.lineTo(tip.x - ux * s + uy * s * .45, tip.y - uy * s - ux * s * .45);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#faf9fa'; ctx.fillRect(o.x - 2, o.y - 2, 4, 4);

  // measurement: a square that expands from the landed section
  if (flash) {
    const t = (now - flash.start) / 700;
    if (t > 1) flash = null;
    else {
      const p = proj(flash.pole), size = 18 + ease(t) * (small ? 30 : 70);
      square(p, size, null, `rgba(255,255,255,${(1 - t).toFixed(3)})`);
    }
  }
}

// ---------- readout ----------
const $ = id => document.getElementById(id);
const els = { ket: $('ket'), secprob: $('secprob'), mode: $('mode'), result: $('result') };
const f3 = x => (Math.abs(x) < 5e-4 ? 0 : x).toFixed(3);
function readout() {
  const th = Math.acos(clamp(v[2], -1, 1)), ph = Math.atan2(v[1], v[0]);
  const a = Math.cos(th / 2), b = Math.sin(th / 2);
  const br = b * Math.cos(ph), bi = b * Math.sin(ph);
  const ket = `${f3(a)}|0⟩ + (${f3(br)} ${bi < -5e-4 ? '−' : '+'} ${f3(Math.abs(bi))}i)|1⟩`;
  if (els.ket.textContent !== ket) els.ket.textContent = ket;
  const k = nearest(v), p = (1 + dot(v, STATES[k])) / 2;
  const sp = `|⟨${secName(k)}|ψ⟩|² = ${p.toFixed(2)}`;
  if (els.secprob.textContent !== sp) els.secprob.textContent = sp;
}
function setMode(m) { if (els.mode.textContent !== m) els.mode.textContent = m; }

const navLinks = [...document.querySelectorAll('.navlinks a')];
function setActive(k) {
  if (k === active) return;
  active = k;
  navLinks.forEach(a => a.classList.toggle('active', +a.dataset.k === k));
}

// ---------- main loop ----------
let prev = performance.now();
let nextFluct = prev + 4000;
function frame(now) {
  const dt = Math.min(.05, (now - prev) / 1000); prev = now;

  if (hold && (now > hold.until || Math.abs(scrollY - hold.y) < 3)) hold = null;
  const sk = hold ? hold.k : scrollSection();

  if (anim && anim.then && anim.then.follow && sk !== anim.then.k) {
    anim = null; // scrolled on to another section mid-move: retarget from here
    startNext(now, { type: 'goto', k: sk, follow: true });
  }
  if (anim) {
    const t = clamp((now - anim.start) / anim.dur, 0, 1);
    v = rot(anim.from, anim.axis, anim.angle * ease(t));
    if (t >= 1) { v = norm(v); finishAnim(now); }
  } else if (queue.length) {
    startNext(now);
  } else if (sk !== settled) {
    setMode('scroll');
    startNext(now, { type: 'goto', k: sk, follow: true });
  }

  trail.push(v);
  if (trail.length > 90) trail.shift();

  // flicker superposed letters
  for (const l of live) {
    if (now < l.next) continue;
    l.next = now + 45 + Math.random() * 110;
    l.el.textContent = Math.random() < .22 ? l.final : GLYPHS[Math.random() * GLYPHS.length | 0];
    l.el.style.setProperty('--gx', `${((Math.random() * 2 - 1) * .08).toFixed(3)}em`);
    l.el.style.setProperty('--o', (.45 + Math.random() * .5).toFixed(2));
  }
  // occasional fluctuation of one hero letter
  if (!RM && now > nextFluct) {
    nextFluct = now + 2500 + Math.random() * 3000;
    const title = heroQ[1];
    if (title.letters.every(l => !l.sup) && active === 0) {
      const l = title.letters[Math.random() * title.letters.length | 0];
      decohere(l);
      setTimeout(() => collapse(l), 350 + Math.random() * 300);
    }
  }
  if (rx > -900) {
    rx += (mx - rx) * .25; ry += (my - ry) * .25;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
  }

  draw(now);
  readout();
  requestAnimationFrame(frame);
}

// ---------- input ----------
function markerAt(x, y) {
  let best = -1, bd = 18;
  STATES.forEach((s, k) => {
    const p = proj(s), d = Math.hypot(p.x - x, p.y - y) - (p.d < 0 ? 4 : 0);
    if (d < bd) { bd = d; best = k; }
  });
  return best;
}
let dragging = false, moved = 0, px = 0, py = 0;
canvas.addEventListener('pointerdown', e => {
  dragging = true; moved = 0; px = e.clientX; py = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  if (!dragging) {
    hoverMarker = W < 200 ? -1 : markerAt(e.clientX - r.left, e.clientY - r.top);
    canvas.classList.toggle('over-marker', hoverMarker >= 0);
    return;
  }
  const dx = e.clientX - px, dy = e.clientY - py;
  moved += Math.abs(dx) + Math.abs(dy);
  if (moved > 5) canvas.classList.add('dragging');
  yaw += dx * 0.008;
  pitch = clamp(pitch + dy * 0.006, -1.2, 1.2);
  px = e.clientX; py = e.clientY;
});
canvas.addEventListener('pointerup', e => {
  dragging = false; canvas.classList.remove('dragging');
  if (moved > 5) return;
  // a click: jump to a marker, or (on the small mobile dock) open the panel
  const r = canvas.getBoundingClientRect();
  const k = W < 200 ? -1 : markerAt(e.clientX - r.left, e.clientY - r.top);
  if (k >= 0) { queue.length = 0; enqueue({ type: 'goto', k }); }
  else if (MOBILE()) dock.classList.toggle('open');
});
canvas.addEventListener('pointercancel', () => { dragging = false; canvas.classList.remove('dragging'); });
canvas.addEventListener('pointerleave', () => { hoverMarker = -1; canvas.classList.remove('over-marker'); });

document.querySelectorAll('[data-gate]').forEach(b =>
  b.addEventListener('click', () => enqueue({ type: 'gate', gate: b.dataset.gate })));

addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  const k = e.key.toUpperCase();
  if (GATES[k]) enqueue({ type: 'gate', gate: k });
});

// nav links: let the scroll drive the qubit through the sections on the way
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const k = SECTIONS.findIndex(s => '#' + s.id === a.getAttribute('href'));
  if (k < 0) return;
  e.preventDefault();
  hold = null;
  scrollTo({ top: sectionY(k), behavior: RM ? 'auto' : 'smooth' });
}));


// ---------- section headings collapse when scrolled into view ----------
function setupScroll() {
  const byEl = new Map(scrollQ.map(t => [t.el, t]));
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const t = byEl.get(e.target);
      if (e.isIntersecting) t.collapseWave(55, 150);
      else t.decohereAll();
    }
  }, { threshold: .6 });
  scrollQ.forEach(t => io.observe(t.el));
}

// ---------- countdown ----------
const cd = $('cd');
const T0 = new Date(cd.dataset.target).getTime();
const pad = n => String(n).padStart(2, '0');
function countdown() {
  let s = Math.max(0, Math.floor((T0 - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  cd.innerHTML = `<span class="br">|</span>${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s<span class="br">⟩</span>`;
}

// ---------- applications close at the deadline ----------
// The Apply buttons open the Google Form. If the deadline passes while the page is open (or the build is
// older than the deadline), they go to the Apply section instead, which shows "Applications are closed".
const applySec = $('apply');
const DEADLINE = applySec.dataset.deadline ? Date.parse(applySec.dataset.deadline) : null;
function checkDeadline() {
  if (DEADLINE === null || Date.now() < DEADLINE) return;
  $('apply-open-card').hidden = true;
  $('apply-closed').hidden = false;
  document.querySelectorAll('[data-apply-link]').forEach(a => {
    a.href = a.dataset.fallback || '#apply';
    a.removeAttribute('target');
    a.textContent = T('Apply', 'Candidati');
  });
}
checkDeadline(); setInterval(checkDeadline, 60000);

// ---------- phones: the floating qubit must not cover the form buttons ----------
new IntersectionObserver(([e]) => {
  const away = e.isIntersecting && MOBILE();
  dock.classList.toggle('away', away);
  if (away) dock.classList.remove('open');
}, { threshold: 0.15 }).observe(document.querySelector('#apply .apply-wrap'));

// ---------- phones: programme one day at a time ----------
const days = $('days');
const dayTabs = [...document.querySelectorAll('.day-tab')];
const dayArrows = [...document.querySelectorAll('.day-arrow')];
const dayIndex = () => Math.round(days.scrollLeft / Math.max(days.clientWidth, 1));
function showDay(i) {
  i = clamp(i, 0, dayTabs.length - 1);
  days.scrollTo({ left: days.children[i].offsetLeft - days.offsetLeft, behavior: RM ? 'auto' : 'smooth' });
}
function markDay() {
  const i = dayIndex();
  dayTabs.forEach((b, k) => b.setAttribute('aria-selected', k === i ? 'true' : 'false'));
  dayArrows[0].disabled = i === 0;
  dayArrows[1].disabled = i === dayTabs.length - 1;
}
dayTabs.forEach((b, k) => b.addEventListener('click', () => showDay(k)));
dayArrows.forEach(b => b.addEventListener('click', () => showDay(dayIndex() + Number(b.dataset.dir))));
days.addEventListener('scroll', () => requestAnimationFrame(markDay), { passive: true });
markDay();

// ---------- init ----------
function init() {
  for (const t of q.values()) t.set(t.el.textContent.trim(), true);
  scheduleAutoMeasure(COARSE ? 1200 : 5000);
  setupScroll();
  countdown(); setInterval(countdown, 1000);
  resize();
  requestAnimationFrame(frame);
}
(document.fonts ? document.fonts.ready : Promise.resolve()).then(init);
