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
 *   completed   boolean — gaps close up and a check sits in the top-right break
 *   static      boolean — skip the draw-in animation
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
    htb-difficulty-frame svg { overflow: visible; transition: filter .25s ease; filter: drop-shadow(0 0 0 var(--glow)); }
    htb-difficulty-frame [data-line], htb-difficulty-frame [data-accent] {
      stroke-dasharray: var(--dash, none); stroke-dashoffset: var(--offset, 0);
      transition: stroke-dasharray .3s ease, stroke-dashoffset .3s ease;
    }
    htb-difficulty-frame:hover [data-line], htb-difficulty-frame[selected] [data-line],
    htb-difficulty-frame:hover [data-accent], htb-difficulty-frame[selected] [data-accent] {
      stroke-dasharray: var(--dash-hover, var(--dash, none)); stroke-dashoffset: var(--offset-hover, var(--offset, 0));
    }
    htb-difficulty-frame:hover svg { filter: drop-shadow(0 0 4px var(--glow)); }
    htb-difficulty-frame[selected] svg { filter: drop-shadow(0 0 8px var(--glow)); }
    htb-difficulty-frame [data-draw] { animation: htb-frame-draw .7s cubic-bezier(.4, 0, .2, 1) both; }
    htb-difficulty-frame [data-art-in] { animation: htb-frame-fade .5s ease both; }
    @keyframes htb-frame-draw { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: 0; } }
    @keyframes htb-frame-fade { from { opacity: 0; } }
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
    static observedAttributes = ['difficulty', 'shape', 'src', 'size', 'stroke', 'label', 'selected', 'completed'];

    connectedCallback() { injectStyle(); this.render(); }
    attributeChangedCallback(name) {
      if (!this.isConnected) return;
      // Selected is pure CSS — no need to redraw.
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
      const insane = level === 'insane' && !completed;

      this.style.setProperty('--glow', color);
      this.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
          <title>${label}</title>
          <defs>
            <clipPath id="${id}"><path d="${shapePath(shape, c, artR)}"/></clipPath>
            <mask id="${id}-m" maskUnits="userSpaceOnUse" x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}">
              <path data-mask d="${shapePath(shape, c, r)}" fill="none" stroke="#fff" stroke-width="${stroke * 4}"/>
            </mask>
          </defs>
          <g ${animate ? 'data-art-in' : ''}>
            <path d="${shapePath(shape, c, artR)}" fill="var(--htb-frame-bg, #0b1e24)"/>
            ${src ? `<image href="${src}" x="${c - artR}" y="${c - artR}" width="${artR * 2}" height="${artR * 2}"
                      preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" alt=""/>` : ''}
          </g>
          <g fill="none" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"
             ${animate ? `mask="url(#${id}-m)"` : ''}>
            <path data-line d="${shapePath(shape, c, r)}" stroke="${color}"/>
            ${insane ? `<path data-accent d="${shapePath(shape, c, r)}" stroke="${ACCENT}"/>` : ''}
          </g>
          <g data-check></g>
        </svg>`;

      const line = this.querySelector('[data-line]');
      const total = line.getTotalLength();

      if (animate) {
        const mask = this.querySelector('[data-mask]');
        mask.style.strokeDasharray = `${total} ${total}`;
        mask.style.setProperty('--len', total);
        mask.setAttribute('data-draw', '');
        // Drop the mask afterwards so hover glows and transitions aren't clipped.
        mask.addEventListener('animationend', () => line.parentNode.removeAttribute('mask'), { once: true });
      }

      if (completed) {
        // Gaps close; one opening stays at the first break to hold the check.
        const checkR = Math.max(stroke * 2.5, 6);
        setDash(line, gapsAt([0], total, checkR * 2 + stroke * 1.5, stroke));
        const at = line.getPointAtLength(0);
        this.querySelector('[data-check]').innerHTML = `
          <circle cx="${at.x}" cy="${at.y}" r="${checkR}" fill="${color}"/>
          <path d="M${at.x - checkR * 0.45} ${at.y + checkR * 0.02} l${checkR * 0.3} ${checkR * 0.3} l${checkR * 0.55} ${-checkR * 0.6}"
                fill="none" stroke="var(--htb-frame-bg, #0b1e24)" stroke-width="${Math.max(checkR * 0.28, 1.5)}"
                stroke-linecap="round" stroke-linejoin="round"/>`;
        return;
      }

      const bearings = shape.breaks[level];
      if (!bearings) return; // easy: solid line
      const centres = bearings.map((b, i) => (i === 0 ? 0 : lengthAtBearing(line, c, b)));
      const accent = this.querySelector('[data-accent]');

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
  }

  if (!customElements.get('htb-difficulty-frame')) {
    customElements.define('htb-difficulty-frame', HtbDifficultyFrame);
  }
})();
