/**
 * <htb-difficulty-frame> — code-drawn diamond / circle / shield frame for HTB difficulty levels.
 *
 *   <htb-difficulty-frame shape="circle" difficulty="hard" src="art.png" size="200"></htb-difficulty-frame>
 *
 * Attributes
 *   difficulty  easy | medium | hard | insane      (default: easy)
 *   shape       diamond | circle | shield          (default: diamond)
 *   src         image shown inside the frame
 *   size        outer width/height in px            (default: 200)
 *   stroke      border thickness in px              (default: 4)
 *   alt         alt text for the image
 *
 * Colours can be themed with CSS custom properties:
 *   --htb-easy, --htb-medium, --htb-hard, --htb-insane, --htb-insane-accent,
 *   --htb-frame-bg (fill behind the art)
 */
(() => {
  const COLOR = {
    easy: 'var(--htb-easy, #9fef00)',
    medium: 'var(--htb-medium, #ffaf00)',
    hard: 'var(--htb-hard, #d41818)',
    insane: 'var(--htb-insane, #8a9bb5)',
  };

  // Spacing, as a multiple of the stroke so a 2px badge keeps the same proportions as a 4px one.
  const GAP = 2.5;             // medium / hard break
  const INSANE_GAP = 0.075;    // share of the whole perimeter, per opening
  const INSANE_ACCENT = 0.045; // share of the whole perimeter, per red sliver
  const ART_INSET = 2;         // dark ring between line and art (× stroke)

  // Each outline is drawn in a -1..1 box and starts on its first break, so the
  // path seam always hides inside a gap. `breaks` are compass bearings (0 = up,
  // clockwise) where the line opens; the actual spot is found by measuring.
  const SHAPES = {
    diamond: {
      path: (p) => `M${p(0.5, -0.5)} L${p(1, 0)} L${p(0, 1)} L${p(-1, 0)} L${p(0, -1)} Z`,
      breaks: { medium: [45, 225], hard: [45, 135, 225, 315] },
    },
    circle: {
      path: (p, r) => `M${p(Math.SQRT1_2, -Math.SQRT1_2)} A${r} ${r} 0 1 1 ${p(-Math.SQRT1_2, Math.SQRT1_2)} `
        + `A${r} ${r} 0 1 1 ${p(Math.SQRT1_2, -Math.SQRT1_2)} Z`,
      breaks: { medium: [45, 225], hard: [45, 135, 225, 315] },
    },
    shield: {
      // Heater shield: flat top, rounded shoulders, even taper to the point.
      // Breaks sit mid-way along each half of the top and low on the sides,
      // mirrored left/right so the badge stays balanced.
      // Drawn slimmer than its box (x × 0.84) so it reads as a shield, not a badge.
      path: (box) => { const p = (x, y) => box(x * 0.84, y); return `M${p(0.5, -0.86)} L${p(0.76, -0.86)} Q${p(1, -0.86)} ${p(1, -0.62)} L${p(1, -0.05)} `
        + `C${p(1, 0.48)} ${p(0.58, 0.8)} ${p(0, 1)} C${p(-0.58, 0.8)} ${p(-1, 0.48)} ${p(-1, -0.05)} `
        + `L${p(-1, -0.62)} Q${p(-1, -0.86)} ${p(-0.76, -0.86)} Z`; },
      breaks: { medium: [26, 206], hard: [26, 107, 253, 334] },
    },
  };
  // Insane always opens at the same four spots as hard.
  Object.values(SHAPES).forEach((s) => { s.breaks.insane = s.breaks.hard; });

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

  // Dash pattern with a `gap` centred on every point in `centres` (first one is 0).
  const gapsAt = (centres, total, gap) => {
    const pts = [...centres, total];
    const array = [];
    for (let i = 0; i < centres.length; i += 1) array.push(pts[i + 1] - pts[i] - gap, gap);
    return { array: array.join(' '), offset: -gap / 2 };
  };

  // Dash pattern with a short `dash` centred on every point in `centres`.
  const dashesAt = (centres, total, dash) => {
    const pts = [...centres, total];
    const array = [];
    for (let i = 0; i < centres.length; i += 1) array.push(dash, pts[i + 1] - pts[i] - dash);
    return { array: array.join(' '), offset: dash / 2 };
  };

  const applyDash = (path, { array, offset }) => {
    path.setAttribute('stroke-dasharray', array);
    path.setAttribute('stroke-dashoffset', offset);
  };

  class HtbDifficultyFrame extends HTMLElement {
    static observedAttributes = ['difficulty', 'shape', 'src', 'size', 'stroke', 'alt'];

    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }

    render() {
      const level = (this.getAttribute('difficulty') || 'easy').toLowerCase();
      const shape = SHAPES[this.getAttribute('shape')] || SHAPES.diamond;
      const size = Number(this.getAttribute('size')) || 200;
      const stroke = Number(this.getAttribute('stroke')) || 4;
      const src = this.getAttribute('src') || '';
      const alt = this.getAttribute('alt') || `${level} difficulty`;

      const c = size / 2;
      const r = c - stroke;
      const artR = r - stroke * ART_INSET;
      const color = COLOR[level] || COLOR.easy;
      const id = `htb-clip-${Math.random().toString(36).slice(2, 9)}`;

      this.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${alt}"
             style="display:block;overflow:visible">
          <defs><clipPath id="${id}"><path d="${shapePath(shape, c, artR)}"/></clipPath></defs>
          <path d="${shapePath(shape, c, artR)}" fill="var(--htb-frame-bg, #0b1e24)"/>
          ${src ? `<image href="${src}" x="${c - artR}" y="${c - artR}" width="${artR * 2}" height="${artR * 2}"
                    preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` : ''}
          <g fill="none" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="butt">
            <path data-line d="${shapePath(shape, c, r)}" stroke="${color}"/>
            ${level === 'insane' ? `<path data-accent d="${shapePath(shape, c, r)}"
                stroke="var(--htb-insane-accent, #d41818)"/>` : ''}
          </g>
        </svg>`;

      const bearings = shape.breaks[level];
      if (!bearings) return; // easy: solid line

      // Breaks need real path lengths, so measure once the SVG is in the DOM.
      const line = this.querySelector('[data-line]');
      const total = line.getTotalLength();
      const centres = bearings.map((b, i) => (i === 0 ? 0 : lengthAtBearing(line, c, b)));

      if (level === 'insane') {
        applyDash(line, gapsAt(centres, total, total * INSANE_GAP));
        // Accent rides the same outline, so it sits exactly in line with the grey.
        applyDash(this.querySelector('[data-accent]'), dashesAt(centres, total, total * INSANE_ACCENT));
      } else {
        applyDash(line, gapsAt(centres, total, stroke * GAP));
      }
    }
  }

  if (!customElements.get('htb-difficulty-frame')) {
    customElements.define('htb-difficulty-frame', HtbDifficultyFrame);
  }
})();
