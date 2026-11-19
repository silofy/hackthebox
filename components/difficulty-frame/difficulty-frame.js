/**
 * <htb-difficulty-frame> — code-drawn diamond / circle / shield frame for HTB difficulty levels.
 *
 *   <htb-difficulty-frame shape="circle" difficulty="hard" src="art.png" size="96"></htb-difficulty-frame>
 *
 * Every frame is two lines:
 *   rail    a muted, tier-tinted outline, cut beside the accents at more places as difficulty rises
 *   accent  a bright tier-coloured line tucked against the rail's inner edge, centred on
 *           each side and longer as difficulty rises
 *
 *   tier     cut accent ends   accent length (share of a side)   entrance / hover weight
 *   easy     0           16%                               light
 *   medium   2           24%                               ↓
 *   hard     4           32%                               ↓
 *   insane   8           40%                               heaviest
 *
 * Attributes
 *   difficulty  easy | medium | hard | insane      (default: easy)
 *   shape       diamond | circle | shield          (default: diamond)
 *   src         image shown inside the frame
 *   size        outer width/height in px            (default: 200)
 *   stroke      rail thickness in px                (default: from the size step)
 *   label       accessible name                     (default: "<Level> difficulty")
 *   selected    boolean — holds the hover state
 *   completed   boolean — a check medallion sits at the bottom point, knocked out of the frame
 *   static      boolean — skip the entrance animation
 *
 * Methods
 *   play()      replay the entrance
 *
 * Theming (CSS custom properties, set on the element or any ancestor)
 *   --htb-easy, --htb-medium, --htb-hard, --htb-insane                       accent colours
 *   --htb-easy-rail, --htb-medium-rail, --htb-hard-rail, --htb-insane-rail   rail colours
 *   --htb-frame-bg        fill behind the art
 *   --htb-frame-stroke    rail thickness in px (overrides the size step)
 */
(() => {
  // Accent = the bright line; rail = the muted outline in the same family.
  const TIERS = {
    easy: { accent: ['--htb-easy', '#22ff66'], rail: ['--htb-easy-rail', '#5f8f7c'], cuts: 0, length: 0.16 },
    medium: { accent: ['--htb-medium', '#ff9f2e'], rail: ['--htb-medium-rail', '#a8906f'], cuts: 2, length: 0.24 },
    hard: { accent: ['--htb-hard', '#ff4a3d'], rail: ['--htb-hard-rail', '#9e2229'], cuts: 4, length: 0.32 },
    insane: { accent: ['--htb-insane', '#cf3a2f'], rail: ['--htb-insane-rail', '#8393b0'], cuts: 8, length: 0.4 },
  };
  const LEVELS = Object.keys(TIERS);
  const cssColor = ([name, fallback]) => `var(${name}, ${fallback})`;

  // Hand-tuned size steps, like an icon set. A badge uses the largest step that fits its size.
  const STEPS = [
    { min: 0, stroke: 2, gap: 6 },
    { min: 64, stroke: 2, gap: 7 },
    { min: 80, stroke: 3, gap: 10 },
    { min: 160, stroke: 4, gap: 13 },
  ];
  // Which accent ends get cut, as [side, end] with end 0 = before the side's
  // centre and 1 = after it. Pairs stay point-symmetric as they're added.
  const CUT_ORDER = [[0, 1], [2, 1], [1, 0], [3, 0], [0, 0], [2, 0], [1, 1], [3, 1]];
  const ART_CLEAR = 1;         // dark ring between accent and art (× stroke)

  // Each outline is drawn in a -1..1 box and starts on its first side midpoint,
  // so the path seam hides inside a cut. `sides` are compass bearings (0 = up,
  // clockwise) of the four side midpoints; the matching spot on any outline is
  // found by measuring. `ring` converts an inward offset to a radius change, so a
  // line inset by d px sits d px in on every edge: slanted or slimmed edges need more.
  const SHAPES = {
    diamond: {
      ring: Math.SQRT2,
      path: (p) => `M${p(0.5, -0.5)} L${p(1, 0)} L${p(0, 1)} L${p(-1, 0)} L${p(0, -1)} Z`,
      sides: [45, 135, 225, 315],
    },
    circle: {
      ring: 1,
      path: (p, r) => `M${p(Math.SQRT1_2, -Math.SQRT1_2)} A${r} ${r} 0 1 1 ${p(-Math.SQRT1_2, Math.SQRT1_2)} `
        + `A${r} ${r} 0 1 1 ${p(Math.SQRT1_2, -Math.SQRT1_2)} Z`,
      sides: [45, 135, 225, 315],
    },
    shield: {
      // Heater shield: flat top, rounded shoulders, even taper to the point.
      // Drawn slimmer than its box (x × 0.84) so it reads as a shield, not a badge.
      // Its "sides" sit mid-way along each half of the top and low on each flank, mirrored.
      ring: 1 / 0.84,
      path: (box) => { const p = (x, y) => box(x * 0.84, y); return `M${p(0.5, -0.86)} L${p(0.76, -0.86)} Q${p(1, -0.86)} ${p(1, -0.62)} L${p(1, -0.05)} `
        + `C${p(1, 0.48)} ${p(0.58, 0.8)} ${p(0, 1)} C${p(-0.58, 0.8)} ${p(-1, 0.48)} ${p(-1, -0.05)} `
        + `L${p(-1, -0.62)} Q${p(-1, -0.86)} ${p(-0.76, -0.86)} Z`; },
      sides: [26, 107, 253, 334],
    },
  };

  // Hover weight escalates with difficulty:
  //   easy    accents glow
  //   medium  + accents press out onto the rail
  //   hard    + rail cuts tighten, stronger glow
  //   insane  + accents travel round the outline
  const STYLE_ID = 'htb-difficulty-frame-style';
  const CSS = `
    htb-difficulty-frame { display: inline-block; line-height: 0; }
    htb-difficulty-frame svg { overflow: visible; }
    htb-difficulty-frame [data-rail], htb-difficulty-frame [data-accent] {
      stroke-dasharray: var(--dash, none); stroke-dashoffset: var(--offset, 0);
      transition: stroke-dasharray .35s cubic-bezier(.3, .8, .3, 1), stroke-dashoffset .35s cubic-bezier(.3, .8, .3, 1);
    }
    htb-difficulty-frame [data-accents] {
      transform-box: view-box; transform-origin: var(--c) var(--c);
      transition: transform .3s cubic-bezier(.3, 1.4, .5, 1), filter .3s ease;
    }
    htb-difficulty-frame:is(:hover, [selected]) [data-accents] { filter: drop-shadow(0 0 var(--glow-r) var(--glow)); }
    htb-difficulty-frame:not([difficulty="easy"]):is(:hover, [selected]) [data-accents] { transform: scale(var(--press)); }
    htb-difficulty-frame:is([difficulty="hard"], [difficulty="insane"]):is(:hover, [selected]) [data-rail] {
      stroke-dasharray: var(--dash-hover, var(--dash, none)); stroke-dashoffset: var(--offset-hover, var(--offset, 0));
    }
    htb-difficulty-frame:is([difficulty="hard"], [difficulty="insane"]):is(:hover, [selected]) [data-accents] {
      filter: drop-shadow(0 0 calc(var(--glow-r) * 1.8) var(--glow));
    }
    htb-difficulty-frame[difficulty="insane"]:is(:hover, [selected]) [data-accent] {
      animation: htb-frame-orbit 3.2s cubic-bezier(.6, 0, .4, 1) .35s infinite;
    }
    @keyframes htb-frame-orbit {
      from { stroke-dashoffset: var(--offset); }
      to { stroke-dashoffset: calc(var(--offset) - var(--len) / 4); }
    }
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

  // Side positions as a share of the outline don't change with size, so they are
  // measured once per shape and reused — measuring is the slow part.
  const FRACTIONS = new Map();
  const sideFractions = (key, path, c, bearings) => {
    if (!FRACTIONS.has(key)) {
      const total = path.getTotalLength();
      FRACTIONS.set(key, bearings.map((b, i) => (i === 0 ? 0 : lengthAtBearing(path, c, b) / total)));
    }
    return FRACTIONS.get(key);
  };

  // Rail length at the point closest to `pt`, searched within ±window of `around`.
  const nearestLength = (path, pt, around, window, total) => {
    let best = around;
    let bestD = Infinity;
    for (let i = -60; i <= 60; i += 1) {
      const len = (around + (window * i) / 60 + total) % total;
      const q = path.getPointAtLength(len);
      const d = (q.x - pt.x) ** 2 + (q.y - pt.y) ** 2;
      if (d < bestD) { bestD = d; best = len; }
    }
    return best;
  };

  // For each side, the rail positions [before, after] that sit square to the accent's
  // two ends. Shares of the outline, cached per shape + tier + inset like the sides.
  const ENDS = new Map();
  const railEnds = (key, rail, accent, aSides, aLen, total, aTotal) => {
    if (!ENDS.has(key)) {
      const centre = aSides.map((a) => nearestLength(rail, accent.getPointAtLength(a), (a / aTotal) * total, total / 8, total));
      ENDS.set(key, aSides.map((a, i) => [-1, 1].map((dir) => {
        const tip = accent.getPointAtLength((a + (dir * aLen) / 2 + aTotal) % aTotal);
        return nearestLength(rail, tip, centre[i] + (dir * aLen) / 2, aLen / 2, total) / total;
      })));
    }
    return ENDS.get(key).map((pair) => pair.map((f) => f * total));
  };

  // Round caps reach stroke/2 past each dash end, so every pattern below allows
  // for `cap` (= stroke width) to keep visible gaps and dashes at their exact size.
  // Each returns { dash, offset } for a stroke-dasharray / stroke-dashoffset pair.

  // A visible `gap` centred on every point in `centres` (sorted ascending).
  // A rail stub shorter than 2.5 line widths left between two cuts reads as a
  // stray dot, so it is folded into the cuts around it.
  const gapsAt = (centres, total, gap, cap) => {
    if (!centres.length) return { dash: 'none', offset: 0 };
    const pts = [...centres, centres[0] + total];
    const runs = centres.map((p, i) => pts[i + 1] - p - gap - cap);
    const array = [];
    let pending = gap + cap;
    // Start on the first run that survives, so the list begins with a dash.
    const first = runs.findIndex((r) => r >= cap * 2.5);
    if (first < 0) return { dash: 'none', offset: 0 };
    for (let k = 1; k <= runs.length; k += 1) {
      const i = (first + k) % runs.length;
      if (k === 1) array.push(runs[first]);
      if (runs[i] >= cap * 2.5 || k === runs.length) {
        array.push(pending);
        if (k < runs.length) array.push(runs[i]);
        pending = gap + cap;
      } else {
        pending += runs[i] + gap + cap;
      }
    }
    // Even-length list: an odd one repeats with dashes and gaps swapped.
    return { dash: array.join(' '), offset: -(centres[first] + (gap + cap) / 2) };
  };

  // A visible `dash` centred on every point in `centres`.
  const dashesAt = (centres, total, dash, cap) => {
    const pts = [...centres, centres[0] + total];
    const array = [];
    const d = Math.max(dash - cap, 0.01);
    for (let i = 0; i < centres.length; i += 1) array.push(d, pts[i + 1] - pts[i] - d);
    return { dash: array.join(' '), offset: -(centres[0] - d / 2) };
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
      const asked = (this.getAttribute('difficulty') || '').toLowerCase();
      const level = TIERS[asked] ? asked : 'easy';
      if (asked !== level) { this.setAttribute('difficulty', level); return; }
      const tier = TIERS[level];
      const shapeName = SHAPES[this.getAttribute('shape')] ? this.getAttribute('shape') : 'diamond';
      const shape = SHAPES[shapeName];
      const size = Number(this.getAttribute('size')) || 200;
      const step = [...STEPS].reverse().find((s) => size >= s.min);
      const stroke = Number(this.getAttribute('stroke')) || cssNumber(this, '--htb-frame-stroke') || step.stroke;
      const gap = step.gap * (stroke / step.stroke);
      const accentW = stroke; // both lines share one weight
      const completed = this.hasAttribute('completed');
      const src = this.getAttribute('src') || '';
      const name = `${level[0].toUpperCase()}${level.slice(1)} difficulty`;
      const label = this.getAttribute('label') || (completed ? `${name}, completed` : name);
      const animate = !this.hasAttribute('static') && !this.drawn;
      this.drawn = true;

      const c = size / 2;
      const r = c - stroke;
      // The accent touches the rail's inner edge; the art clears the accent by one stroke.
      const accentR = r - (stroke / 2 + accentW / 2) * shape.ring;
      const artR = r - (stroke / 2 + accentW + stroke * ART_CLEAR) * shape.ring;
      const accent = cssColor(tier.accent);
      const rail = cssColor(tier.rail);
      const id = `htb-clip-${Math.random().toString(36).slice(2, 9)}`;
      const medR = Math.max(size * 0.12, 8);
      const med = { x: c, y: c + r + stroke / 2 - medR };

      this.style.setProperty('--glow', accent);
      this.style.setProperty('--glow-r', `${Math.max(stroke, 2)}px`);
      this.style.setProperty('--c', `${c}px`);
      this.style.setProperty('--press', r / accentR);
      this.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
          <title>${label}</title>
          <defs>
            <clipPath id="${id}"><path d="${shapePath(shape, c, artR)}"/></clipPath>
            <mask id="${id}-m" maskUnits="userSpaceOnUse" x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}">
              <path data-mask d="${shapePath(shape, c, r)}" fill="none" stroke="#fff" stroke-width="${stroke * 3}"/>
            </mask>
            ${completed ? `<mask id="${id}-k" maskUnits="userSpaceOnUse" x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}">
              <rect x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}" fill="#fff"/>
              <circle cx="${med.x}" cy="${med.y}" r="${medR + Math.max(stroke * 1.25, 2)}" fill="#000"/>
            </mask>` : ''}
          </defs>
          <g ${completed ? `mask="url(#${id}-k)"` : ''}>
            <g data-art>
              <path d="${shapePath(shape, c, artR)}" fill="var(--htb-frame-bg, #16262c)"/>
              ${src ? `<image href="${src}" x="${c - artR}" y="${c - artR}" width="${artR * 2}" height="${artR * 2}"
                        preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` : ''}
            </g>
            <g fill="none" stroke-linejoin="round" stroke-linecap="round">
              <path data-rail data-mask-id="${id}-m" d="${shapePath(shape, c, r)}" stroke="${rail}" stroke-width="${stroke}"/>
              <g data-accents>
                <path data-accent d="${shapePath(shape, c, accentR)}" stroke="${accent}" stroke-width="${accentW}"/>
              </g>
            </g>
          </g>
          ${completed ? `<g data-check>
            <circle cx="${med.x}" cy="${med.y}" r="${medR}" fill="${accent}"/>
            <path pathLength="1" d="M${med.x - medR * 0.42} ${med.y + medR * 0.02} L${med.x - medR * 0.12} ${med.y + medR * 0.32} L${med.x + medR * 0.44} ${med.y - medR * 0.3}"
                  fill="none" stroke="var(--htb-frame-bg, #16262c)" stroke-width="${Math.max(medR * 0.24, 2)}"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </g>` : ''}
        </svg>`;

      const railPath = this.querySelector('[data-rail]');
      const accentPath = this.querySelector('[data-accent]');
      const total = railPath.getTotalLength();
      const aTotal = accentPath.getTotalLength();
      const sides = sideFractions(`${shapeName}|rail`, railPath, c, shape.sides).map((f) => f * total);
      const aSides = sideFractions(`${shapeName}|accent`, accentPath, c, shape.sides).map((f) => f * aTotal);

      // Accent: one bright line centred on each side, its length set by the tier.
      const aLen = (aTotal / 4) * tier.length;
      setDash(accentPath, dashesAt(aSides, aTotal, aLen, accentW));
      accentPath.style.setProperty('--len', aTotal);

      // Rail cuts always sit at the ends of an accent, so each cut frees an accent
      // end from the rail. Difficulty sets how many ends are cut, opening in
      // symmetric pairs: medium 2, hard 4, insane all 8.
      // Each accent end is projected straight across onto the rail (its closest
      // point); the cut starts exactly there and runs away from the accent.
      const ends = railEnds(`${shapeName}|${level}|${(accentR / r).toFixed(3)}`, railPath, accentPath, aSides, aLen, total, aTotal);
      const cutsFor = (g) => CUT_ORDER.slice(0, tier.cuts)
        .map(([side, end]) => (ends[side][end] + (end ? g / 2 : -g / 2) + total) % total)
        .sort((x, y) => x - y);
      const cutGap = gap * 0.75;
      const cuts = cutsFor(cutGap);
      setDash(railPath, gapsAt(cuts, total, cutGap, stroke), gapsAt(cutsFor(cutGap * 0.5), total, cutGap * 0.5, stroke));

      this.fx = { railPath, accentPath, total, aTotal, aSides, aLen, cuts, stroke, accentW, level };
      if (animate) queueMicrotask(() => this.play());
    }

    // Entrance. Weight escalates with difficulty, each tier adding a beat to the one before:
    //   easy    accents grow out from each side's centre                         ~0.4s
    //   medium  + the rail traces itself round the shape first                   ~0.8s
    //   hard    + the rail starts closed and cracks open at its cuts,
    //             then the accents press out onto the rail once and settle       ~1.3s
    //   insane  + the accents arrive a quarter turn early and sweep into place,
    //             and the lock lands twice                                       ~1.8s
    play() {
      if (!this.fx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const { railPath, accentPath, total, aTotal, aSides, cuts, stroke, accentW, level } = this.fx;
      const weight = LEVELS.indexOf(level); // 0 easy … 3 insane
      const ease = 'cubic-bezier(.2, .8, .2, 1)';
      const snap = 'cubic-bezier(.3, 1.5, .5, 1)';
      const art = this.querySelector('[data-art]');
      const accents = this.querySelector('[data-accents]');
      const check = this.querySelector('[data-check]');
      const rest = (el) => ({
        strokeDasharray: el.style.getPropertyValue('--dash') || 'none',
        strokeDashoffset: el.style.getPropertyValue('--offset') || '0',
      });

      art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 + weight * 100, easing: 'ease' });

      // Rail.
      let accentDelay = 0;
      if (weight >= 1) {
        const mask = this.querySelector('[data-mask]');
        railPath.setAttribute('mask', `url(#${railPath.dataset.maskId})`);
        mask.style.strokeDasharray = `${total} ${total}`;
        const trace = 380 + weight * 60;
        mask.animate([{ strokeDashoffset: total }, { strokeDashoffset: 0 }], { duration: trace, easing: ease, fill: 'both' })
          .finished.then(() => railPath.removeAttribute('mask'), () => {});
        accentDelay = trace * 0.6;
        if (weight >= 2) {
          // Closed first, then the cuts crack open as the trace finishes.
          const closed = gapsAt(cuts, total, 0, 0);
          railPath.animate([{ strokeDasharray: closed.dash, strokeDashoffset: closed.offset },
            { strokeDasharray: closed.dash, strokeDashoffset: closed.offset, offset: 0.6 }, rest(railPath)],
          { duration: trace + 320, easing: snap });
          accentDelay = trace;
        }
      }

      // Accents grow from each side's centre (insane: sweeping in from a quarter turn back).
      const settled = rest(accentPath);
      const seed = dashesAt(aSides, aTotal, accentW, accentW);
      const grow = 320 + weight * 80;
      const sweep = weight === 3;
      const frames = sweep
        ? [{ strokeDasharray: seed.dash, strokeDashoffset: seed.offset + aTotal / 4, opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { strokeDasharray: seed.dash, strokeDashoffset: seed.offset, offset: 0.55 },
          { ...settled, opacity: 1 }]
        : [{ strokeDasharray: seed.dash, strokeDashoffset: seed.offset, opacity: 0 }, { opacity: 1, offset: 0.2 }, { ...settled, opacity: 1 }];
      const growFor = sweep ? grow + 300 : grow;
      accentPath.animate(frames, { duration: growFor, delay: accentDelay, easing: ease, fill: 'backwards' });

      // Lock: accents press out onto the rail and settle (hard once, insane twice).
      const lockAt = accentDelay + growFor;
      if (weight >= 2) {
        const press = getComputedStyle(this).getPropertyValue('--press');
        const glow = getComputedStyle(accentPath).stroke;
        const hit = { transform: `scale(${press})`, filter: `drop-shadow(0 0 ${stroke * 2}px ${glow})` };
        const calm = { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 transparent)' };
        const lock = sweep
          ? [calm, { ...hit, offset: 0.2 }, { ...calm, offset: 0.45 }, { ...hit, offset: 0.65 }, calm]
          : [calm, { ...hit, offset: 0.35 }, calm];
        accents.animate(lock, { duration: sweep ? 720 : 440, delay: lockAt, easing: 'ease-out' });
      }

      if (check) {
        // Medallion pops in once the frame has settled, then the tick draws itself.
        const disc = check.querySelector('circle');
        const tick = check.querySelector('path');
        const at = lockAt + (weight >= 2 ? 220 : 0);
        disc.style.transformBox = 'fill-box';
        disc.style.transformOrigin = 'center';
        disc.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.15)', offset: 0.7 }, { transform: 'scale(1)' }],
          { duration: 400, delay: at, easing: 'ease-out', fill: 'backwards' });
        tick.style.strokeDasharray = '1';
        tick.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 280, delay: at + 260, easing: ease, fill: 'backwards' });
      }
    }
  }

  if (!customElements.get('htb-difficulty-frame')) {
    customElements.define('htb-difficulty-frame', HtbDifficultyFrame);
  }
})();
