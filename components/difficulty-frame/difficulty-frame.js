/**
 * <htb-difficulty-frame> — code-drawn diamond / circle / shield frame for HTB difficulty levels.
 *
 *   <htb-difficulty-frame difficulty="hard" src="art.png" size="200"></htb-difficulty-frame>
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
  // Every outline uses pathLength=100, so one dash recipe fits every shape.
  // Each path starts at the "top-right" point and runs clockwise, which puts
  // the four break points at 0, 25, 50 and 75 — the side midpoints on a diamond.
  const GAP = 2.25;          // medium / hard break length
  const INSANE_GAP = 8.5;    // the opening each insane quarter gets
  const INSANE_ACCENT = 5;   // the red sliver inside that opening

  const COLOR = {
    easy: 'var(--htb-easy, #9fef00)',
    medium: 'var(--htb-medium, #ffaf00)',
    hard: 'var(--htb-hard, #d41818)',
    insane: 'var(--htb-insane, #8a9bb5)',
  };

  // Shape outlines: centre c, radius r (centre to furthest edge).
  const SHAPES = {
    diamond: (c, r) => {
      const h = r / 2;
      return `M${c + h} ${c - h} L${c + r} ${c} L${c} ${c + r} L${c - r} ${c} L${c} ${c - r} Z`;
    },
    circle: (c, r) => {
      const d = r * Math.SQRT1_2;
      return `M${c + d} ${c - d} A${r} ${r} 0 1 1 ${c - d} ${c + d} A${r} ${r} 0 0 1 ${c + d} ${c - d} Z`;
    },
    shield: (c, r) => {
      // Drawn in a -1..1 box, then scaled into place.
      const p = (x, y) => `${c + x * r} ${c + y * r}`;
      return `M${p(0.5, -0.83)} L${p(1, -0.74)} L${p(1, 0.05)} C${p(1, 0.55)} ${p(0.55, 0.8)} ${p(0, 1)} `
        + `C${p(-0.55, 0.8)} ${p(-1, 0.55)} ${p(-1, 0.05)} L${p(-1, -0.74)} L${p(0, -0.92)} Z`;
    },
  };

  // `count` evenly spaced breaks of length `gap`, each centred on a break point.
  const breaks = (count, gap) => ({ array: `${100 / count - gap} ${gap}`, offset: -gap / 2 });

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
      const r = c - stroke;                  // border radius (centre to vertex)
      const artR = r - stroke * 2.5;         // art sits inside with a dark breathing gap
      const color = COLOR[level] || COLOR.easy;
      const id = `htb-clip-${Math.random().toString(36).slice(2, 9)}`;

      const outline = (radius, attrs) =>
        `<path d="${shape(c, radius)}" pathLength="100" stroke="${attrs.color}" ${attrs.extra || ''}/>`;
      const dashed = (b) => `stroke-dasharray="${b.array}" stroke-dashoffset="${b.offset}"`;

      let border;
      if (level === 'medium' || level === 'hard') {
        border = outline(r, { color, extra: dashed(breaks(level === 'medium' ? 2 : 4, GAP)) });
      } else if (level === 'insane') {
        // Accent runs on a slightly smaller outline, so it reads as tucked inside the frame.
        border = outline(r, { color, extra: dashed(breaks(4, INSANE_GAP)) })
          + outline(r - stroke * 0.75, {
            color: 'var(--htb-insane-accent, #d41818)',
            extra: `stroke-width="${stroke * 0.75}" stroke-dasharray="${INSANE_ACCENT} ${25 - INSANE_ACCENT}" stroke-dashoffset="${INSANE_ACCENT / 2}"`,
          });
      } else {
        border = outline(r, { color });
      }

      this.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${alt}"
             style="display:block;overflow:visible">
          <defs><clipPath id="${id}"><path d="${shape(c, artR)}"/></clipPath></defs>
          <path d="${shape(c, artR)}" fill="var(--htb-frame-bg, #0d1b24)"/>
          ${src ? `<image href="${src}" x="${c - artR}" y="${c - artR}" width="${artR * 2}" height="${artR * 2}"
                    preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` : ''}
          <g fill="none" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="butt">${border}</g>
        </svg>`;
    }
  }

  if (!customElements.get('htb-difficulty-frame')) {
    customElements.define('htb-difficulty-frame', HtbDifficultyFrame);
  }
})();
