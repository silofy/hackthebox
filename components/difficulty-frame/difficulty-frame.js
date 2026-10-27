/**
 * <htb-difficulty-frame> — code-drawn diamond / circle / shield frame for HTB difficulty levels.
 *
 *   <htb-difficulty-frame shape="circle" difficulty="hard" src="art.png" size="96"></htb-difficulty-frame>
 *
 * Attributes
 *   difficulty  easy | medium | hard | insane      (default: easy)
 *   shape       diamond | circle | shield          (default: diamond)
 *   src         image shown inside the frame
 *   size        outer width/height in px            (default: 200)
 *   stroke      border thickness in px              (default: from the size step)
 *   label       accessible name                     (default: "<Level> difficulty")
 *   selected    boolean — persistent highlight (same look as hover, stronger glow)
 *   completed   boolean — a check medallion sits at the bottom point, knocked out of the frame
 *   static      boolean — skip the entrance animation
 *   context     detail | list                  (default: list)
 *   featured    boolean — a hero badge; gets the orbit hover
 *
 *   Recommended defaults, applied automatically:
 *     detail page  → split entrance          list / grid → trace entrance
 *     hover        → tighten                 featured or selected → orbit hover
 *
 *   Overrides (for one-offs):
 *   motion      entrance: trace | split | orbit | glitch
 *   hover       hover style: tighten | orbit | lift
 *
 * Methods
 *   play(kind?)  replay the entrance (defaults to the `motion` attribute)
 *
 * Theming (CSS custom properties, set on the element or any ancestor)
 *   --htb-easy, --htb-medium, --htb-hard, --htb-insane, --htb-insane-accent
 *   --htb-frame-bg        fill behind the art
 *   --htb-frame-stroke    border thickness in px (overrides the size step)
 *   --htb-frame-gap       medium / hard break length in px (overrides the size step)
 */
(() => {
  const COLOR = {
    easy: 'var(--htb-easy, #9fef00)',
    medium: 'var(--htb-medium, #ffaf00)',
    hard: 'var(--htb-hard, #d41818)',
    insane: 'var(--htb-insane, #8a9bb5)',
  };
  const ACCENT = 'var(--htb-insane-accent, #d41818)';

  // Hand-tuned size steps, like an icon set. A badge uses the largest step that
  // fits its size. `compact` swaps the insane sliver for whole red segments,
  // because a ~9px red dash on a small badge reads as noise.
  const STEPS = [
    { min: 0, stroke: 2, gap: 7, clear: 3, compact: true },
    { min: 64, stroke: 2, gap: 8, clear: 4, compact: true },
    { min: 80, stroke: 3, gap: 12, clear: 6, compact: false },
    { min: 160, stroke: 4, gap: 16, clear: 8, compact: false },
  ];
  const INSANE_ACCENT = 0.045; // red sliver, as a share of the whole perimeter
  const HOVER_GAP = 0.55;      // gaps tighten to this share on hover / selected
  const ART_INSET = 2;         // dark ring between line and art (× stroke)

  // `ring` corrects the art inset so the dark ring is the same true width on
  // every shape: scaling a slanted or slimmed edge moves it in less than a circle's.
  // Each outline is drawn in a -1..1 box and starts on its first break, so the
  // path seam always hides inside a gap. `breaks` are compass bearings (0 = up,
  // clockwise) where the line opens; the actual spot is found by measuring.
  const SHAPES = {
    diamond: {
      ring: Math.SQRT2, // edges sit at 45°, so the inset needs √2 more to look the same
      path: (p) => `M${p(0.5, -0.5)} L${p(1, 0)} L${p(0, 1)} L${p(-1, 0)} L${p(0, -1)} Z`,
      breaks: { medium: [45, 225], hard: [45, 135, 225, 315] },
    },
    circle: {
      ring: 1,
      path: (p, r) => `M${p(Math.SQRT1_2, -Math.SQRT1_2)} A${r} ${r} 0 1 1 ${p(-Math.SQRT1_2, Math.SQRT1_2)} `
        + `A${r} ${r} 0 1 1 ${p(Math.SQRT1_2, -Math.SQRT1_2)} Z`,
      breaks: { medium: [45, 225], hard: [45, 135, 225, 315] },
    },
    shield: {
      // Heater shield: flat top, rounded shoulders, even taper to the point.
      // Breaks sit mid-way along each half of the top and low on the sides,
      // mirrored left/right so the badge stays balanced.
      // Drawn slimmer than its box (x × 0.84) so it reads as a shield, not a badge.
      ring: 1 / 0.84, // sides are slimmed to 0.84, so their inset is too
      path: (box) => { const p = (x, y) => box(x * 0.84, y); return `M${p(0.5, -0.86)} L${p(0.76, -0.86)} Q${p(1, -0.86)} ${p(1, -0.62)} L${p(1, -0.05)} `
        + `C${p(1, 0.48)} ${p(0.58, 0.8)} ${p(0, 1)} C${p(-0.58, 0.8)} ${p(-1, 0.48)} ${p(-1, -0.05)} `
        + `L${p(-1, -0.62)} Q${p(-1, -0.86)} ${p(-0.76, -0.86)} Z`; },
      breaks: { medium: [26, 206], hard: [26, 107, 253, 334] },
    },
  };
  // Insane always opens at the same four spots as hard.
  Object.values(SHAPES).forEach((s) => { s.breaks.insane = s.breaks.hard; });

  // One shared stylesheet: hover / selected states, the draw-in, reduced motion.
  const STYLE_ID = 'htb-difficulty-frame-style';
  const CSS = `
    htb-difficulty-frame { display: inline-block; line-height: 0; --glow: transparent; }
    htb-difficulty-frame svg { overflow: visible; transition: transform .25s cubic-bezier(.2, .8, .2, 1); }
    /* Glow sits on the border only: on the whole badge the art glowed through the gaps. */
    htb-difficulty-frame [data-border] { transition: filter .25s ease; filter: drop-shadow(0 0 0 transparent); }
    htb-difficulty-frame [data-line], htb-difficulty-frame [data-accent] {
      stroke-dasharray: var(--dash, none); stroke-dashoffset: var(--offset, 0);
      transition: stroke-dasharray .3s ease, stroke-dashoffset .3s ease;
    }
    htb-difficulty-frame:not([hover="lift"]):hover [data-line], htb-difficulty-frame[selected] [data-line],
    htb-difficulty-frame:not([hover="lift"]):hover [data-accent], htb-difficulty-frame[selected] [data-accent] {
      stroke-dasharray: var(--dash-hover, var(--dash, none)); stroke-dashoffset: var(--offset-hover, var(--offset, 0));
    }
    htb-difficulty-frame:hover [data-border] { filter: drop-shadow(0 0 var(--glow-r, 3px) var(--glow)); }
    htb-difficulty-frame[selected] [data-border] { filter: drop-shadow(0 0 calc(var(--glow-r, 3px) * 2) var(--glow)); }
    /* Hover: orbit — the breaks travel slowly round the outline. */
    htb-difficulty-frame:is([hover="orbit"], [featured]:not([hover]), [selected]:not([hover])):hover :is([data-line], [data-accent]) {
      animation: htb-frame-orbit 4s linear infinite;
    }
    @keyframes htb-frame-orbit {
      from { stroke-dashoffset: var(--offset-hover, var(--offset, 0)); }
      to { stroke-dashoffset: calc(var(--offset-hover, var(--offset, 0)) - var(--len, 0)); }
    }
    /* Hover: lift — the badge rises a touch; the frame keeps its exact pattern. */
    htb-difficulty-frame[hover="lift"]:hover svg { transform: translateY(-3px) scale(1.03); }
    @media (prefers-reduced-motion: reduce) {
      htb-difficulty-frame *, htb-difficulty-frame svg { animation: none !important; transition: none !important; }
    }`;
  const injectStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  };

  // Scale a -1..1 shape around centre c with radius r.
  const shapePath = (shape, c, r) => shape.path((x, y) => `${c + x * r} ${c + y * r}`, r);

  const FRACTIONS = new Map();

  // Distance along `path` that points toward `bearing` from the centre.
  const lengthAtBearing = (path, c, bearing) => {
    const total = path.getTotalLength();
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < 720; i += 1) {
      const len = (total * i) / 720;
      const pt = path.getPointAtLength(len);
      const a = (Math.atan2(pt.x - c, c - pt.y) * 180) / Math.PI;
      const diff = Math.abs(((a - bearing + 540) % 360) - 180);
      if (diff < bestDiff) { bestDiff = diff; best = len; }
    }
    return best;
  };

  // Round caps reach stroke/2 past each dash end, so dashes are drawn shorter
  // by one stroke and gaps longer by one — the visible gap is exactly `gap`.
  // Every helper returns { dash, offset } for the stroke-dasharray / -dashoffset pair.

  // A visible `gap` centred on every point in `centres` (first one is 0).
  const gapsAt = (centres, total, gap, cap) => {
    const pts = [...centres, total];
    const array = [];
    for (let i = 0; i < centres.length; i += 1) array.push(Math.max(pts[i + 1] - pts[i] - gap - cap, 0.01), gap + cap);
    return { dash: array.join(' '), offset: -(gap + cap) / 2 };
  };

  // A visible `dash` centred on every point in `centres`.
  const dashesAt = (centres, total, dash, cap) => {
    const pts = [...centres, total];
    const array = [];
    for (let i = 0; i < centres.length; i += 1) array.push(Math.max(dash - cap, 0.01), pts[i + 1] - pts[i] - dash + cap);
    return { dash: array.join(' '), offset: (dash - cap) / 2 };
  };

  // Every other run of line between breaks (2nd, 4th…), leaving `gap` clear at each end.
  // The pattern starts on the first red run (via offset) so no zero-length dash is
  // drawn — with round caps that would show up as a stray dot.
  const alternateRuns = (centres, total, gap, cap) => {
    const pts = [...centres, total];
    const runs = [];
    for (let i = 1; i < centres.length; i += 2) {
      runs.push([pts[i] + (gap + cap) / 2, pts[i + 1] - (gap + cap) / 2]);
    }
    const array = [];
    runs.forEach(([start, end], i) => {
      const next = runs[i + 1] ? runs[i + 1][0] : runs[0][0] + total;
      array.push(Math.max(end - start, 0.01), next - end);
    });
    return { dash: array.join(' '), offset: -runs[0][0] };
  };

  const setDash = (path, rest, hover) => {
    path.style.setProperty('--dash', rest.dash);
    path.style.setProperty('--offset', rest.offset);
    if (hover) {
      path.style.setProperty('--dash-hover', hover.dash);
      path.style.setProperty('--offset-hover', hover.offset);
    }
  };

  const cssNumber = (el, name) => {
    const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  class HtbDifficultyFrame extends HTMLElement {
    static observedAttributes = ['difficulty', 'shape', 'src', 'size', 'stroke', 'label', 'selected', 'completed', 'hover'];

    connectedCallback() { injectStyle(); this.render(); }
    attributeChangedCallback(name) {
      if (!this.isConnected) return;
      // Selected is pure CSS — no need to redraw.
      if (name === 'hover') return;
      if (name === 'selected') {
        this.setAttribute('aria-pressed', this.hasAttribute('selected'));
        return;
      }
      this.render();
    }

    render() {
      const level = COLOR[(this.getAttribute('difficulty') || '').toLowerCase()]
        ? this.getAttribute('difficulty').toLowerCase() : 'easy';
      const shape = SHAPES[this.getAttribute('shape')] || SHAPES.diamond;
      const size = Number(this.getAttribute('size')) || 200;
      const step = [...STEPS].reverse().find((s) => size >= s.min);
      const stroke = Number(this.getAttribute('stroke')) || cssNumber(this, '--htb-frame-stroke') || step.stroke;
      const gap = cssNumber(this, '--htb-frame-gap') || step.gap * (stroke / step.stroke);
      const clear = step.clear * (stroke / step.stroke);
      const completed = this.hasAttribute('completed');
      const src = this.getAttribute('src') || '';
      const name = `${level[0].toUpperCase()}${level.slice(1)} difficulty`;
      const label = this.getAttribute('label') || (completed ? `${name}, completed` : name);
      const animate = !this.hasAttribute('static') && !this.drawn;
      this.drawn = true;

      const c = size / 2;
      const r = c - stroke;
      const artR = r - stroke * ART_INSET * shape.ring;
      const color = COLOR[level];
      const id = `htb-clip-${Math.random().toString(36).slice(2, 9)}`;
      const insane = level === 'insane';
      // Completed medallion: bottom edge lines up with the frame's bottom edge so it never spills out.
      const medR = Math.max(size * 0.12, 8);
      const med = { x: c, y: c + r + stroke / 2 - medR };

      this.style.setProperty('--glow', color);
      this.style.setProperty('--glow-r', `${Math.max(stroke, 2)}px`);
      this.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
          <title>${label}</title>
          <defs>
            <clipPath id="${id}"><path d="${shapePath(shape, c, artR)}"/></clipPath>
            <mask id="${id}-m" maskUnits="userSpaceOnUse" x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}">
              <path data-mask d="${shapePath(shape, c, r)}" fill="none" stroke="#fff" stroke-width="${stroke * 4}"/>
            </mask>
            ${completed ? `<mask id="${id}-k" maskUnits="userSpaceOnUse" x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}">
              <rect x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}" fill="#fff"/>
              <circle cx="${med.x}" cy="${med.y}" r="${medR + Math.max(stroke * 1.25, 2)}" fill="#000"/>
            </mask>` : ''}
          </defs>
          <g ${completed ? `mask="url(#${id}-k)"` : ''}>
          <g data-art id="${id}-art">
            <path d="${shapePath(shape, c, artR)}" fill="var(--htb-frame-bg, #0b1e24)"/>
            ${src ? `<image href="${src}" x="${c - artR}" y="${c - artR}" width="${artR * 2}" height="${artR * 2}"
                      preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" alt=""/>` : ''}
          </g>
          <g data-border data-mask-id="${id}-m" fill="none" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round">
            <path data-line d="${shapePath(shape, c, r)}" stroke="${color}"/>
            ${insane ? `<path data-accent d="${shapePath(shape, c, r)}" stroke="${ACCENT}"/>` : ''}
          </g>
          </g>
          ${completed ? `<g data-check>
            <circle cx="${med.x}" cy="${med.y}" r="${medR}" fill="${color}"/>
            <path pathLength="1" d="M${med.x - medR * 0.42} ${med.y + medR * 0.02} L${med.x - medR * 0.12} ${med.y + medR * 0.32} L${med.x + medR * 0.44} ${med.y - medR * 0.3}"
                  fill="none" stroke="var(--htb-frame-bg, #0b1e24)" stroke-width="${Math.max(medR * 0.24, 2)}"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </g>` : ''}
        </svg>`;

      const line = this.querySelector('[data-line]');
      const total = line.getTotalLength();

      this.fx = { line, total, stroke, centres: null };
      line.style.setProperty('--len', total);
      // Entrance plays after the dash pattern below is in place.
      if (animate) queueMicrotask(() => this.play());

      const bearings = shape.breaks[level];
      if (!bearings) return; // easy: solid line
      // Break positions as a share of the outline don't change with size, so
      // measure once per shape + level and reuse — measuring is the slow part.
      const key = `${this.getAttribute('shape')}|${level}`;
      if (!FRACTIONS.has(key)) {
        FRACTIONS.set(key, bearings.map((b, i) => (i === 0 ? 0 : lengthAtBearing(line, c, b) / total)));
      }
      const centres = FRACTIONS.get(key).map((f) => f * total);
      const accent = this.querySelector('[data-accent]');
      this.fx.centres = centres;
      if (accent) accent.style.setProperty('--len', total);

      if (insane && step.compact) {
        // Small: same four breaks, alternate runs turn red.
        setDash(line, gapsAt(centres, total, gap, stroke), gapsAt(centres, total, gap * HOVER_GAP, stroke));
        setDash(accent, alternateRuns(centres, total, gap, stroke), alternateRuns(centres, total, gap * HOVER_GAP, stroke));
      } else if (insane) {
        const dash = total * INSANE_ACCENT;
        setDash(line, gapsAt(centres, total, dash + clear * 2, stroke),
          gapsAt(centres, total, dash + clear * 2 * HOVER_GAP, stroke));
        setDash(accent, dashesAt(centres, total, dash, stroke));
      } else {
        setDash(line, gapsAt(centres, total, gap, stroke), gapsAt(centres, total, gap * HOVER_GAP, stroke));
      }
    }

    // Glitch: a ~650ms burst of signal corruption that resolves into the clean badge.
    //  1. Channel split — cyan and magenta copies of the frame tear sideways and snap back.
    //  2. Scramble — the break pattern jumps to random positions before locking in.
    //  3. Slice tear — two horizontal bands of the art shift out of line, then rejoin.
    glitch() {
      const svg = this.querySelector('svg');
      const border = this.querySelector('[data-border]');
      const line = this.querySelector('[data-line]');
      const accent = this.querySelector('[data-accent]');
      const art = this.querySelector('[data-art]');
      const { total, stroke } = this.fx;
      const size = svg.viewBox.baseVal.width;
      const NS = 'http://www.w3.org/2000/svg';
      const hold = (frames) => frames.map((f) => ({ ...f, easing: 'steps(1, end)' }));
      const rand = (min, max) => min + Math.random() * (max - min);
      const temp = [];
      const DURATION = 650;

      // 1. Channel split.
      [['#00e5ff', -1], ['#ff2bd6', 1]].forEach(([tint, dir]) => {
        const ghost = border.cloneNode(true);
        ghost.removeAttribute('data-border');
        ghost.querySelectorAll('path').forEach((p) => { p.setAttribute('stroke', tint); p.removeAttribute('data-line'); p.removeAttribute('data-accent'); });
        ghost.style.mixBlendMode = 'screen';
        border.before(ghost);
        temp.push(ghost);
        const jumps = [0, 3, 1.5, 4, 0.5, 2.5, 0].map((k) => ({ transform: `translate(${dir * k * stroke}px, ${rand(-0.6, 0.6) * stroke}px)`, opacity: k ? 0.9 : 0 }));
        ghost.animate(hold(jumps), { duration: DURATION });
      });

      // 2. Scramble the breaks, then lock in.
      [line, accent].filter(Boolean).forEach((el) => {
        const restOffset = parseFloat(el.style.getPropertyValue('--offset') || 0);
        const frames = [0.31, 0.72, 0.12, 0.55, 0.9].map((f) => ({ strokeDashoffset: restOffset - f * total, opacity: 0.85 }));
        el.animate(hold([...frames, { strokeDashoffset: restOffset, opacity: 1 }]), { duration: DURATION * 0.8 });
      });
      border.animate(hold([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }]), { duration: DURATION * 0.4 });

      // 3. Slice tear on the art.
      const defs = svg.querySelector('defs');
      [[0.28, 0.1, 1], [0.62, 0.07, -1]].forEach(([y, h, dir], i) => {
        const clip = document.createElementNS(NS, 'clipPath');
        clip.id = `${art.id}-slice${i}`;
        const rect = document.createElementNS(NS, 'rect');
        Object.entries({ x: 0, y: y * size, width: size, height: h * size }).forEach(([k, v]) => rect.setAttribute(k, v));
        clip.append(rect);
        defs.append(clip);
        const slice = document.createElementNS(NS, 'use');
        slice.setAttribute('href', `#${art.id}`);
        slice.setAttribute('clip-path', `url(#${clip.id})`);
        art.after(slice);
        temp.push(clip, slice);
        const shift = (k) => ({ transform: `translateX(${dir * k * size * 0.04}px)` });
        slice.animate(hold([shift(0), shift(1), shift(-0.5), shift(1.4), shift(0.3), shift(0)]), { duration: DURATION * 0.7, delay: 80 });
      });

      // Whole badge: one hard jolt mid-burst.
      svg.animate(hold([{ transform: 'none' }, { transform: `translateX(${-stroke}px) skewX(-4deg)`, offset: 0.35 },
        { transform: 'none', offset: 0.45 }, { transform: 'none' }]), { duration: DURATION });

      setTimeout(() => temp.forEach((n) => n.remove()), DURATION + 100);
    }

    // Entrance concepts. All run on the Web Animations API, so they end exactly
    // on the resting pattern the CSS already holds and leave nothing behind.
    play(kind = this.getAttribute('motion') || (this.getAttribute('context') === 'detail' ? 'split' : 'trace')) {
      if (!this.fx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const { line, total, stroke, centres } = this.fx;
      const accent = this.querySelector('[data-accent]');
      const art = this.querySelector('[data-art]');
      const check = this.querySelector('[data-check]');
      const ease = 'cubic-bezier(.2, .8, .2, 1)';
      const rest = (el) => ({
        strokeDasharray: el.style.getPropertyValue('--dash') || 'none',
        strokeDashoffset: el.style.getPropertyValue('--offset') || '0',
      });
      // Easy has no breaks to animate, so every concept falls back to the trace.
      const mode = !centres && kind !== 'glitch' ? 'trace' : kind;

      art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease' });

      if (mode === 'trace') {
        // The line draws itself round the shape from the first break.
        const group = this.querySelector('[data-border]');
        const mask = this.querySelector('[data-mask]');
        group.setAttribute('mask', `url(#${group.dataset.maskId})`);
        mask.style.strokeDasharray = `${total} ${total}`;
        mask.animate([{ strokeDashoffset: total }, { strokeDashoffset: 0 }], { duration: 750, easing: ease, fill: 'both' })
          .finished.then(() => group.removeAttribute('mask'), () => {});
      } else if (mode === 'split') {
        // A closed outline cracks open at the breaks: the gaps grow from nothing.
        const closed = gapsAt(centres, total, 0, stroke);
        line.animate([{ strokeDasharray: closed.dash, strokeDashoffset: closed.offset }, rest(line)],
          { duration: 650, delay: 150, easing: ease, fill: 'backwards' });
        accent?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: 800, easing: 'ease' });
      } else if (mode === 'orbit') {
        // The pattern spins a half turn and settles into place.
        [line, accent].filter(Boolean).forEach((el) => {
          const r = rest(el);
          const from = parseFloat(r.strokeDashoffset) + total / 2;
          el.animate([{ strokeDashoffset: from, opacity: 0 }, { opacity: 1, offset: 0.25 }, { strokeDashoffset: r.strokeDashoffset, opacity: 1 }],
            { duration: 900, easing: ease });
        });
      } else if (mode === 'glitch') {
        this.glitch();
      }

      if (check) {
        // Medallion pops in after the frame, then the tick draws itself.
        const disc = check.querySelector('circle');
        const tick = check.querySelector('path');
        disc.style.transformBox = 'fill-box';
        disc.style.transformOrigin = 'center';
        disc.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.15)', offset: 0.7 }, { transform: 'scale(1)' }],
          { duration: 420, delay: 450, easing: 'ease-out', fill: 'backwards' });
        tick.style.strokeDasharray = '1';
        tick.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 300, delay: 750, easing: ease, fill: 'backwards' });
      }
    }
  }

  if (!customElements.get('htb-difficulty-frame')) {
    customElements.define('htb-difficulty-frame', HtbDifficultyFrame);
  }
})();
