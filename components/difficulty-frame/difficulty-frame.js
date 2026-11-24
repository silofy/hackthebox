/**
 * <htb-difficulty-frame> — code-drawn diamond / circle / shield frame for HTB difficulty levels.
 *
 *   <htb-difficulty-frame shape="circle" difficulty="hard" src="art.png" size="96"></htb-difficulty-frame>
 *
 * Every frame is two lines:
 *   rail    a muted, tier-tinted outline
 *   inner   bright tier-coloured lines, each sitting in an opening cut into the rail,
 *           inset from it; they exist only where the rail opens
 *
 *   tier     inner lines / openings                      entrance / hover weight
 *   easy     2, top and bottom                           light
 *   medium   2, left and right                           ↓
 *   hard     4, all anchors                              ↓
 *   insane   4, all anchors, longest                     heaviest
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
 *   state       idle | spawning | spawned | despawning   (default: idle) — machine lifecycle;
 *               combines with completed, and changes animate without a redraw
 *   spawn-time  expected spawn duration in seconds   (default: 60) — paces the boot bar
 *   despawn-time  expected shutdown duration in seconds (default: 20)
 *   progress    0–100 — real spawn progress, if known; overrides the estimate
 *   cuts        keystone | keystone-soft | angled | square   (default: keystone) — slanted ends shared
 *               by the rail and the inner line: keystone 45° (the inner line is the cut-out piece
 *               pushed straight in), keystone-soft 30°, angled 45° splayed the other way
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
    // open: anchors (0 top, 1 right, 2 bottom, 3 left) that carry an inner line ·
    // length: each inner line, as a share of a side
    easy: { accent: ['--htb-easy', '#22ff66'], rail: ['--htb-easy-rail', '#5f8f7c'], open: [0, 2], length: 0.26 },
    medium: { accent: ['--htb-medium', '#ff9f2e'], rail: ['--htb-medium-rail', '#a8906f'], open: [1, 3], length: 0.26 },
    hard: { accent: ['--htb-hard', '#ff4a3d'], rail: ['--htb-hard-rail', '#9e2229'], open: [0, 1, 2, 3], length: 0.26 },
    insane: { accent: ['--htb-insane', '#cf3a2f'], rail: ['--htb-insane-rail', '#8393b0'], open: [0, 1, 2, 3], length: 0.4 },
  };
  const LEVELS = Object.keys(TIERS);
  const cssColor = ([name, fallback]) => `var(${name}, ${fallback})`;

  // Hand-tuned size steps, like an icon set. A badge uses the largest step that fits its size.
  // Small steps get whole-pixel gaps, lighter blocks and a gentler slant, so the
  // notches stay crisp instead of blurring into the art.
  //   space  gap between rail and block, px · block  block thickness (× stroke) ·
  //   lean   keystone slant (tan of its angle: 1 = 45°, 0.58 = 30°) ·
  //   reach  inner line length multiplier, so small notches still read ·
  //   medal  completed medallion radius (× size) · ring  its knockout gap, px ·
  //   compact  the simplified style for the smallest step only: no recess or slant, the inner pieces are
  //            bright segments of the rail itself, and the completed check sits in the
  //            badge's bottom-right corner instead of cutting into the frame
  const STEPS = [
    { min: 0, stroke: 2, space: 2, block: 1, lean: 0, reach: 1.45, medal: 0.16, ring: 0, compact: true },
    { min: 64, stroke: 2, space: 2, block: 1.25, lean: 0.58, reach: 1.3, medal: 0.13, ring: 1.5 },
    { min: 80, stroke: 3, space: 2, block: 1.5, lean: 1, reach: 1, medal: 0.12, ring: 3 },
    { min: 160, stroke: 4, space: 3, block: 1.5, lean: 1, reach: 1, medal: 0.12, ring: 5 },
  ];
  const SPACING = 0.75;        // space between the rail's inner edge and the inner line (× stroke), never under 1.5px
  const STRAIGHT_BOOST = 1.6;  // inner lines on straight or curved stretches run this much longer than chevrons
  const SPIKE_HEIGHT = 1.75;   // insane spikes: height beyond the rail (× stroke)
  const SPIKE_BASE = 3.25;     // and base width (× stroke)
  const BLOCK_WEIGHT = 1.5;    // thickness of a resting inner block (× stroke)

  // Each outline is drawn in a -1..1 box. `sides` are the compass bearings (0 = up,
  // clockwise) of its four anchors: top, right, bottom, left. The matching spot on
  // any outline is found by measuring. `ring` converts an inward offset to a radius change, so a
  // line inset by d px sits d px in on every edge: slanted or slimmed edges need more.
  const SHAPES = {
    diamond: {
      ring: Math.SQRT2,
      path: (p) => `M${p(0.5, -0.5)} L${p(1, 0)} L${p(0, 1)} L${p(-1, 0)} L${p(0, -1)} Z`,
      // Anchored on its four points, so each inner line is a chevron wrapping round a point.
      sides: [0, 90, 180, 270],
      points: [0, 1, 2, 3],
    },
    circle: {
      ring: 1,
      path: (p, r) => `M${p(Math.SQRT1_2, -Math.SQRT1_2)} A${r} ${r} 0 1 1 ${p(-Math.SQRT1_2, Math.SQRT1_2)} `
        + `A${r} ${r} 0 1 1 ${p(Math.SQRT1_2, -Math.SQRT1_2)} Z`,
      sides: [0, 90, 180, 270],
      points: [],
      // Insane's arcs would leave only slivers of grey between them; cap them so each
      // grey run is long enough to carry its spike.
      maxLen: { 0: 0.5, 1: 0.5, 2: 0.5, 3: 0.5 },
      // Double ring: a second grey ring runs at the blocks' recessed radius, so the
      // bright arcs sit on a full circle of their own instead of pinching the outline.
      doubleRing: true,
      spike: 1.25, // spikes a touch larger: a curve makes them read smaller than on a straight edge
    },
    shield: {
      // Shield: flat top, sharp shoulders, straight sides and a faceted bottom.
      // Drawn slimmer than its box (x × 0.84) so it reads as a shield, not a badge.
      // The facets meet the sides at y 0.45, an angle that puts them as far from the
      // centre as the sides, so the inner line keeps the same spacing all round.
      // Anchors: top centre, mid-way up each side, and the bottom point (a chevron).
      ring: 1 / 0.84,
      path: (box) => { const p = (x, y) => box(x * 0.84, y); return `M${p(0.5, -0.86)} L${p(1, -0.86)} L${p(1, 0.45)} `
        + `L${p(0, 1)} L${p(-1, 0.45)} L${p(-1, -0.86)} Z`; },
      sides: [0, 77, 180, 283],
      points: [2], // the bottom point carries a chevron
      boost: { 0: 1.4 }, // the top line runs a little shorter so the shoulders stay clear
      // Longest line each anchor can carry (share of a quarter of the outline) before it
      // would wrap a corner: the top and sides are short straight edges.
      maxLen: { 0: 0.6, 1: 0.55, 3: 0.55, 2: 0.95 },
      // Insane spikes on the upper runs sit on the shoulder corners, pointing straight up.
      shoulders: { x: 0.84, y: -0.86 },
    },
  };

  // Hover: on every tier each inner block thins to the rail's width and slides out into
  // its opening, closing the frame, and a bloom fades in. Weight escalates on top:
  //   hard    + full-strength bloom
  //   insane  + the inner lines travel round the outline
  const STYLE_ID = 'htb-difficulty-frame-style';
  const CSS = `
    htb-difficulty-frame { display: inline-block; line-height: 0; }
    htb-difficulty-frame svg { overflow: visible; }
    htb-difficulty-frame [data-rail], htb-difficulty-frame [data-accent], htb-difficulty-frame [data-accent-glow], htb-difficulty-frame [data-accent-back] {
      stroke-dasharray: var(--dash, none); stroke-dashoffset: var(--offset, 0);
      transition: stroke-dasharray .35s cubic-bezier(.3, .8, .3, 1), stroke-dashoffset .35s cubic-bezier(.3, .8, .3, 1);
    }
    htb-difficulty-frame :is([data-accent], [data-accent-glow]) {
      stroke-width: var(--thick);
      transition: stroke-width .3s cubic-bezier(.3, .8, .3, 1), stroke-dasharray .35s cubic-bezier(.3, .8, .3, 1), stroke-dashoffset .35s cubic-bezier(.3, .8, .3, 1);
    }
    htb-difficulty-frame:is(:hover, [selected]) :is([data-accent], [data-accent-glow]) { stroke-width: var(--thin); }
    htb-difficulty-frame [data-accent-back] { stroke-width: calc(var(--thick) + 2px); transition: stroke-width .3s cubic-bezier(.3, .8, .3, 1); }
    htb-difficulty-frame:is(:hover, [selected]) [data-accent-back] { stroke-width: var(--thin); }
    /* Insane spikes extend a little on hover. */
    htb-difficulty-frame [data-spikes] polygon { transform-box: fill-box; transform-origin: center; transition: transform .3s cubic-bezier(.3, 1.4, .5, 1); }
    htb-difficulty-frame:is(:hover, [selected]) [data-spikes] polygon { transform: scale(1.25); }
    /* Split pieces (hard, insane) move in layers: each waits its --delay. */
    htb-difficulty-frame [data-accents][data-split],
    htb-difficulty-frame [data-accents][data-split] :is([data-accent], [data-accent-glow], [data-accent-back]) { transition-delay: var(--delay, 0s); }
    htb-difficulty-frame [data-accents] {
      transform-box: view-box; transform-origin: var(--c) var(--c);
      transition: transform .3s cubic-bezier(.3, 1.4, .5, 1);
    }
    /* Glow: a separate bloom layer (tight core + wide halo, see the SVG filter) that
       fades in, so it is never clipped and never snaps on. Stronger on harder tiers. */
    htb-difficulty-frame [data-glow] { opacity: 0; transition: opacity .35s ease; }
    htb-difficulty-frame:is(:hover, [selected]) [data-glow] { opacity: .6; }
    htb-difficulty-frame:is([difficulty="hard"], [difficulty="insane"]):is(:hover, [selected]) [data-glow] { opacity: 1; }
    htb-difficulty-frame:is(:hover, [selected]) [data-accents] { transform: scale(var(--press)); }
    htb-difficulty-frame[difficulty="insane"]:is(:hover, [selected]) :is([data-accent], [data-accent-glow]) {
      animation: htb-frame-orbit 3.2s cubic-bezier(.6, 0, .4, 1) .35s infinite;
    }
    @keyframes htb-frame-orbit {
      from { stroke-dashoffset: var(--offset); }
      to { stroke-dashoffset: calc(var(--offset) - var(--len) / 4); }
    }
    /* Machine states (the state attribute). Switching animates; nothing redraws.
       spawning     a percentage counts up, centred over the art; the
                    outline fills clockwise from the top in step with it. It follows
                    the progress attribute, or an estimate paced by spawn-time that never
                    reaches 100% until the state moves on
       spawned      the count completes and fades; the outline stays lit in the tier
                    colour and breathes
       despawning   the count runs down, the fill drains and the
                    art goes grey */
    htb-difficulty-frame [data-boot], htb-difficulty-frame [data-readout] { opacity: 0; transition: opacity .4s ease .4s; }
    htb-difficulty-frame:is([state="spawning"], [state="despawning"]) :is([data-boot], [data-readout]) { opacity: 1; transition-delay: 0s; }
    htb-difficulty-frame [data-readout] text { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }
    htb-difficulty-frame [data-art] { transition: filter .6s ease; }
    htb-difficulty-frame[state="spawning"] [data-art] { filter: brightness(.5); }
    htb-difficulty-frame[state="despawning"] [data-art] { filter: grayscale(.85) brightness(.45); }
    htb-difficulty-frame:is([state="spawning"], [state="despawning"]) [data-glow] { opacity: 0 !important; }
    /* Spawned: the whole outline powers on in the tier colour and breathes. Hover still
       closes the frame on top of it. */
    htb-difficulty-frame :is([data-rail], [data-inner-rail]) { transition: stroke .5s ease, opacity .5s ease; }
    htb-difficulty-frame[state="spawned"] :is([data-rail], [data-inner-rail]) { stroke: var(--glow); }
    htb-difficulty-frame[state="spawned"] [data-glow] { opacity: .8; animation: htb-frame-breathe 2.6s ease-in-out infinite; }
    htb-difficulty-frame[state="spawned"] svg { animation: htb-frame-live 2.6s ease-in-out infinite; }
    @keyframes htb-frame-breathe { 50% { opacity: .35; } }
    @keyframes htb-frame-live {
      0%, 100% { filter: drop-shadow(0 0 0 transparent); }
      50% { filter: drop-shadow(0 0 var(--glow-r) var(--glow)); }
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
      FRACTIONS.set(key, bearings.map((b) => lengthAtBearing(path, c, b) / total));
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

  // Rail openings behind inner lines: each inner line's two ends are projected
  // straight across onto the rail (its closest point), so the opening matches the
  // line exactly. Returned as [centre, length] pairs; cached as shares of the outline.
  const SPANS = new Map();
  const railSpans = (key, rail, accent, aCentres, aLen, total, aTotal) => {
    if (!SPANS.has(key)) {
      SPANS.set(key, aCentres.map((a, i) => {
        const len0 = Array.isArray(aLen) ? aLen[i] : aLen;
        const mid = nearestLength(rail, accent.getPointAtLength(a), (a / aTotal) * total, total / 8, total);
        const [s, e] = [-1, 1].map((dir) => nearestLength(rail,
          accent.getPointAtLength((a + (dir * len0) / 2 + aTotal) % aTotal), mid + (dir * len0) / 2, len0 / 2, total));
        const len = (e - s + total) % total;
        return [((s + len / 2) % total) / total, len / total];
      }));
    }
    return SPANS.get(key).map(([m, l]) => [m * total, l * total]);
  };

  // An opening between rail lengths `from` and `to`, as a polygon that follows the
  // outline (so it wraps points and curves) with both ends slanted. `k` is the slant
  // (tan of its angle from square): positive leans the ends together going inward
  // (keystone), negative leans them apart (splayed). Reaches `inward` px in and `outward` px out
  // from the rail's centreline.
  const slantedQuad = (path, c, from, to, total, inward, outward, k = -1) => {
    const at = (len) => {
      const l = (len + total) % total;
      const p = path.getPointAtLength(l);
      const q = path.getPointAtLength((l + 0.5) % total);
      let tx = q.x - p.x; let ty = q.y - p.y;
      const n = Math.hypot(tx, ty) || 1; tx /= n; ty /= n;
      // Inward normal: the perpendicular that points at the centre.
      let nx = -ty; let ny = tx;
      if (nx * (c - p.x) + ny * (c - p.y) < 0) { nx = -nx; ny = -ny; }
      return { p, tx, ty, nx, ny };
    };
    const offset = (len, d, lean) => {
      const { p, tx, ty, nx, ny } = at(len);
      return [p.x + nx * d + tx * lean * Math.abs(d), p.y + ny * d + ty * lean * Math.abs(d)];
    };
    const span = (to - from + total) % total;
    const steps = Math.max(2, Math.ceil(span / 2));
    const inner = [];
    const outer = [];
    for (let i = 0; i <= steps; i += 1) {
      const len = from + (span * i) / steps;
      // Only the two ends lean; the run between follows the outline.
      const lean = i === 0 ? k : i === steps ? -k : 0;
      inner.push(offset(len, inward, lean));
      outer.push(offset(len, -outward, -lean));
    }
    return [...inner, ...outer.reverse()];
  };

  // Where a spike goes on the rail run [from, to]: the middle of its longest straight
  // stretch, pointing along that stretch's outward normal. If the run has no straight
  // stretch worth using (a curve), its midpoint, pointing away from the centre.
  const spikeSpot = (path, c, from, to, total) => {
    const N = 48;
    const span = to - from;
    const tan = (len) => {
      const a = path.getPointAtLength(((len - 0.5) % total + total) % total);
      const b = path.getPointAtLength(((len + 0.5) % total + total) % total);
      return Math.atan2(b.y - a.y, b.x - a.x);
    };
    let best = null;
    let start = 0;
    for (let i = 1; i <= N; i += 1) {
      const turn = i < N ? Math.abs(Math.sin(tan(from + (span * i) / N) - tan(from + (span * start) / N))) : 1;
      if (turn > 0.03) {
        const run = (span * (i - 1 - start)) / N;
        if (!best || run > best.run) best = { run, mid: from + (span * (start + i - 1)) / (2 * N) };
        start = i;
      }
    }
    const radial = (len) => {
      const p = path.getPointAtLength(((len % total) + total) % total);
      const d = Math.hypot(p.x - c, p.y - c) || 1;
      return [(p.x - c) / d, (p.y - c) / d];
    };
    if (!best || best.run < span * 0.2) return { at: ((from + to) / 2) % total, dir: radial((from + to) / 2) };
    const a = tan(best.mid);
    let n = [Math.sin(a), -Math.cos(a)];
    const p = path.getPointAtLength(best.mid % total);
    if (n[0] * (p.x - c) + n[1] * (p.y - c) < 0) n = [-n[0], -n[1]];
    return { at: best.mid % total, dir: n };
  };

  // Round caps reach stroke/2 past each dash end, so every pattern below allows
  // for `cap` (= stroke width) to keep visible gaps and dashes at their exact size.
  // Each returns { dash, offset } for a stroke-dasharray / stroke-dashoffset pair.

  // A visible gap centred on every point in `centres` (sorted ascending); `gap` is
  // one length for all, or a list with one per centre.
  // A rail stub shorter than `minRun` (2.5 line widths) left between two gaps reads
  // as a stray dot, so it is folded into the gaps around it.
  const gapsAt = (centres, total, gap, cap, minRun = cap * 2.5) => {
    if (!centres.length) return { dash: 'none', offset: 0 };
    const g = (i) => (Array.isArray(gap) ? gap[i % centres.length] : gap);
    const pts = [...centres, centres[0] + total];
    const runs = centres.map((p, i) => pts[i + 1] - p - (g(i) + g(i + 1)) / 2 - cap);
    const array = [];
    // Start on the first run that survives, so the list begins with a dash.
    const first = runs.findIndex((r) => r >= minRun);
    if (first < 0) return { dash: 'none', offset: 0 };
    let pending = g(first + 1) + cap;
    for (let k = 1; k <= runs.length; k += 1) {
      const i = (first + k) % runs.length;
      if (k === 1) array.push(runs[first]);
      if (runs[i] >= minRun || k === runs.length) {
        array.push(pending);
        if (k < runs.length) array.push(runs[i]);
        pending = g(i + 1) + cap;
      } else {
        pending += runs[i] + g(i + 1) + cap;
      }
    }
    // Even-length list: an odd one repeats with dashes and gaps swapped.
    return { dash: array.join(' '), offset: -(centres[first] + (g(first) + cap) / 2) };
  };

  // A visible `dash` centred on every point in `centres`.
  // `dash` is one length for all, or a list with one per centre.
  const dashesAt = (centres, total, dash, cap) => {
    const d = (i) => Math.max((Array.isArray(dash) ? dash[i % centres.length] : dash) - cap, 0.01);
    const pts = [...centres, centres[0] + total];
    const array = [];
    for (let i = 0; i < centres.length; i += 1) array.push(d(i), pts[i + 1] - pts[i] - d(i) / 2 - d(i + 1) / 2);
    return { dash: array.join(' '), offset: -(centres[0] - d(0) / 2) };
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
    static observedAttributes = ['difficulty', 'shape', 'src', 'size', 'stroke', 'label', 'selected', 'completed', 'cuts', 'state', 'progress', 'spawn-time', 'despawn-time'];

    connectedCallback() { injectStyle(); this.render(); }
    disconnectedCallback() { cancelAnimationFrame(this.raf); }
    attributeChangedCallback(name) {
      if (!this.isConnected) return;
      // Selected is pure CSS — no need to redraw.
      if (name === 'selected') {
        this.setAttribute('aria-pressed', this.hasAttribute('selected'));
        return;
      }
      // State is pure CSS too, so changes animate; only the accessible name updates.
      if (['state', 'progress', 'spawn-time', 'despawn-time'].includes(name)) {
        const svg = this.querySelector('svg');
        if (svg) svg.setAttribute('aria-label', this.accessibleName());
        this.runProgress();
        return;
      }
      this.render();
    }

    // Drives the spawn readout: one value f (0–1) sets both the percentage and the
    // outline fill. Spawning follows the progress attribute, or estimates: 85% at
    // spawn-time, then creeping towards 97%; it reaches 100% only when the state moves
    // on. Despawning counts down over despawn-time. Nothing loops.
    runProgress() {
      const fill = this.querySelector('[data-fill]');
      if (!fill) return;
      const len = Number(fill.dataset.len);
      const pct = this.querySelector('[data-pct]');
      const show = (f) => {
        this.f = f;
        // Period of exactly one outline, so a fill that starts at the top wraps past the path's end.
        fill.setAttribute('stroke-dasharray', `${len * f} ${len * (1 - f)}`);
        if (pct) pct.textContent = `${Math.floor(f * 100)}%`;
      };
      const state = this.getAttribute('state');
      const was = this.lastState;
      this.lastState = state;
      cancelAnimationFrame(this.raf);
      const from = this.f ?? 0;
      // Runs fn(elapsed ms) every frame until it returns true.
      const loop = (fn) => {
        const t0 = performance.now();
        const tick = (now) => { if (!fn(now - t0)) this.raf = requestAnimationFrame(tick); };
        this.raf = requestAnimationFrame(tick);
      };
      const tween = (a, b, ms) => loop((t) => {
        const k = Math.min(t / ms, 1);
        show(a + (b - a) * (1 - (1 - k) ** 3));
        return k === 1;
      });
      if (state === 'spawning') {
        const p = this.getAttribute('progress');
        if (p !== null) { tween(was === 'spawning' ? from : 0, Math.min(Math.max(+p, 0), 100) / 100, 600); return; }
        if (was === 'spawning') return; // already estimating
        const T = (Number(this.getAttribute('spawn-time')) || 60) * 1000;
        show(0);
        loop((t) => {
          const f = t <= T
            ? 0.85 * (1 - (1 - t / T) ** 2.2)
            : 0.85 + 0.12 * (1 - Math.exp(-(t - T) / T));
          show(f);
          return false;
        });
      } else if (state === 'despawning') {
        const T = (Number(this.getAttribute('despawn-time')) || 20) * 1000;
        const start = was === 'spawning' ? from : 1;
        loop((t) => { const k = Math.min(t / T, 1); show(start * (1 - k)); return k === 1; });
      } else if (was === 'spawning') {
        // Up: the count completes, then the frame locks in.
        tween(from, 1, 400);
        if (state === 'spawned') setTimeout(() => this.lockIn(), 420);
      } else {
        show(0);
      }
    }

    // Lock-in, played once when spawning finishes: the blocks slam into the rail and
    // spring back, the bloom flashes, and the whole badge gives a small punch.
    lockIn() {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const press = getComputedStyle(this).getPropertyValue('--press');
      const thin = getComputedStyle(this).getPropertyValue('--thin');
      const ease = 'cubic-bezier(.2, .9, .3, 1.3)';
      this.querySelectorAll('[data-accents]').forEach((g) => g.animate(
        [{ transform: 'scale(1)' }, { transform: `scale(${press})`, offset: 0.25 }, { transform: `scale(${press})`, offset: 0.55 }, { transform: 'scale(1)' }],
        { duration: 700, easing: ease },
      ));
      this.querySelectorAll('[data-accent], [data-accent-glow], [data-accent-back]').forEach((el) => el.animate(
        [{}, { strokeWidth: thin, offset: 0.25 }, { strokeWidth: thin, offset: 0.55 }, {}],
        { duration: 700, easing: ease },
      ));
      this.querySelector('[data-glow]')?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0.8 }], { duration: 900, easing: 'ease-out' });
      this.querySelector('svg').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.3 }, { transform: 'scale(1)' }],
        { duration: 520, easing: 'cubic-bezier(.3, 1.6, .5, 1)' });
    }

    // e.g. "Hard difficulty, spawning, completed"
    accessibleName() {
      const level = this.getAttribute('difficulty') || 'easy';
      const STATES = { spawning: 'spawning', spawned: 'spawned', despawning: 'shutting down' };
      return this.getAttribute('label') || [`${level[0].toUpperCase()}${level.slice(1)} difficulty`,
        STATES[this.getAttribute('state')], this.hasAttribute('completed') && 'completed'].filter(Boolean).join(', ');
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
      const accentW = stroke; // both lines share one weight
      // Slanted cut ends: lean > 0 narrows the opening going inward (keystone: the inner
      // line is the cut-out piece pushed straight in), < 0 widens it (splayed).
      const LEANS = { angled: -1, keystone: 1, 'keystone-soft': Math.tan(Math.PI / 6) };
      const compact = !!step.compact;
      const lean = compact || this.getAttribute('cuts') === 'square' ? 0 : LEANS[this.getAttribute('cuts')] ?? step.lean;
      const angled = lean !== 0;
      const cap = 0; // flat line ends: dashes and gaps need no allowance
      const form = shapeName;
      const completed = this.hasAttribute('completed');
      const src = this.getAttribute('src') || '';
      const name = `${level[0].toUpperCase()}${level.slice(1)} difficulty`;
      const label = this.accessibleName();
      const animate = !this.hasAttribute('static') && !this.drawn;
      this.drawn = true;

      const c = size / 2;
      const r = c - stroke;
      // At rest each inner piece is a thick block sitting one level down: it starts
      // `space` below the rail's inner edge, so the indent reads. On hover it thins to
      // the rail's own width and slides up into the opening, closing the frame.
      // The art keeps its full size and the blocks overlap its edge.
      const custom = stroke !== step.stroke; // an explicit stroke scales the step's tuning
      const space = custom ? Math.max(Math.round(stroke * SPACING), 2) : step.space;
      const blockW = stroke * (custom ? BLOCK_WEIGHT : step.block);
      // Compact: the block is the rail itself, recoloured.
      const blockOffset = compact ? 0
        : shape.flush ? (blockW - stroke) / 2 // outer edge on the rail's outer edge
          : stroke / 2 + space + blockW / 2; // block centreline, inward from the rail's
      const accentR = r - blockOffset * shape.ring;
      // The art runs right up to the gap inside the rail, under the recessed blocks.
      // Double ring: the art keeps the same dark gap inside the inner ring that the
      // other shapes keep inside their rail.
      const artR = shape.doubleRing && !compact
        ? accentR - (stroke / 2 + space) * shape.ring
        : r - (stroke / 2 + space) * shape.ring;
      const accent = cssColor(tier.accent);
      const rail = cssColor(tier.rail);
      const id = `htb-clip-${Math.random().toString(36).slice(2, 9)}`;
      const medR = size * step.medal;
      const med = compact
        ? { x: size - medR, y: size - medR } // corner of the box, clear of the frame
        : { x: c, y: c + r + stroke / 2 - medR };

      // Completed medallion: a sharp-pointed diamond, scaled up a touch so it carries
      // the weight of a disc of radius `rad`.
      const medallion = ({ x, y }, rad, fill) => {
        const d = rad * 1.18;
        return `<polygon data-disc points="${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}" fill="${fill}"/>`;
      };
      this.style.setProperty('--glow', accent);
      this.style.setProperty('--glow-r', `${Math.max(stroke, 2)}px`);
      this.style.setProperty('--c', `${c}px`);
      this.style.setProperty('--press', r / accentR);
      this.style.setProperty('--thick', `${blockW}px`);
      // Scaling out to the rail also widens the stroke a touch, so thin by that much less.
      this.style.setProperty('--thin', `${stroke / (r / accentR)}px`);
      this.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
          <title>${label}</title>
          <defs>
            <clipPath id="${id}"><path d="${shapePath(shape, c, artR)}"/></clipPath>
            <mask id="${id}-m" maskUnits="userSpaceOnUse" x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}">
              <path data-mask d="${shapePath(shape, c, r)}" fill="none" stroke="#fff" stroke-width="${stroke * 3}"/>
            </mask>
            <filter id="${id}-glow" filterUnits="userSpaceOnUse" x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}">
              <feGaussianBlur in="SourceGraphic" stdDeviation="${Math.max(stroke * 0.8, 1.5)}" result="core"/>
              <feGaussianBlur in="SourceGraphic" stdDeviation="${Math.max(stroke * 2.6, 4)}" result="wide"/>
              <feComponentTransfer in="wide" result="halo"><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
              <feMerge><feMergeNode in="halo"/><feMergeNode in="core"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            ${completed ? `<mask id="${id}-k" maskUnits="userSpaceOnUse" x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}">
              <rect x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}" fill="#fff"/>
              ${medallion(med, medR + step.ring, '#000')}
            </mask>` : ''}
          </defs>
          <g ${completed && !compact ? `mask="url(#${id}-k)"` : ''}>
            <g data-art>
              <path d="${shapePath(shape, c, artR)}" fill="var(--htb-frame-bg, #16262c)"/>
              ${src ? `<image href="${src}" x="${c - artR}" y="${c - artR}" width="${artR * 2}" height="${artR * 2}"
                        preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` : ''}
            </g>
            <g fill="none" stroke-linejoin="miter" stroke-miterlimit="10" stroke-linecap="butt">
              <g ${angled ? `mask="url(#${id}-cut)"` : ''}>
                <path data-rail data-mask-id="${id}-m" d="${shapePath(shape, c, r)}" stroke="${rail}" stroke-width="${stroke}"/>
              </g>
              ${shape.doubleRing && !compact ? `<path data-inner-rail d="${shapePath(shape, c, accentR)}" stroke="${rail}" stroke-width="${stroke}"/>` : ''}
              <g data-boot ${angled ? `mask="url(#${id}-cut)"` : ''}>
                <path data-fill d="${shapePath(shape, c, r)}" stroke="${accent}" stroke-width="${stroke}" stroke-dasharray="0 1"/>
              </g>
              <g data-spikes fill="${rail}" stroke="none"></g>
              <!-- Slot masks sit outside the moving groups, so a piece pushed out on hover
                   slides into its fixed slot instead of carrying the slot with it. -->
              <g data-glow filter="url(#${id}-glow)">
                <g ${angled ? `mask="url(#${id}-keep)"` : ''}>
                  <g data-accents>
                    <path data-accent-glow d="${shapePath(shape, c, accentR)}" stroke="${accent}" stroke-width="${blockW}" stroke-linecap="butt"/>
                  </g>
                </g>
              </g>
              <g ${angled ? `mask="url(#${id}-keep)"` : ''}>
                <g data-accents>
                  <!-- A thin outline in the frame colour keeps the block crisp against the art. -->
                  <path data-accent-back d="${shapePath(shape, c, accentR)}" stroke="var(--htb-frame-bg, #16262c)" stroke-linecap="butt"/>
                  <path data-accent d="${shapePath(shape, c, accentR)}" stroke="${accent}" stroke-width="${blockW}" stroke-linecap="butt"/>
                </g>
              </g>
            </g>
          </g>
          ${completed ? `<g data-check>
            ${medallion(med, medR, accent)}
            <path pathLength="1" d="M${med.x - medR * 0.42} ${med.y + medR * 0.02} L${med.x - medR * 0.12} ${med.y + medR * 0.32} L${med.x + medR * 0.44} ${med.y - medR * 0.3}"
                  fill="none" stroke="var(--htb-frame-bg, #16262c)" stroke-width="${Math.max(medR * 0.24, 2)}"
                  stroke-linecap="square" stroke-linejoin="miter"/>
          </g>` : ''}
          <g data-readout text-anchor="middle" pointer-events="none" aria-hidden="true">
            <text data-pct x="${c}" y="${c}" dominant-baseline="central" font-size="${size * 0.13}" font-weight="700" fill="#fff">0%</text>
          </g>
        </svg>`;

      const railPath = this.querySelector('[data-rail]');
      const accentPath = this.querySelector('[data-accent]');
      const total = railPath.getTotalLength();
      const aTotal = accentPath.getTotalLength();
      const bearings = shape.sides;
      const aSides = sideFractions(`${form}|accent`, accentPath, c, bearings).map((f) => f * aTotal);

      // Inner lines: one centred on each open anchor.
      const aLen = (aTotal / 4) * tier.length * step.reach;
      const placed = aSides.map((a, side) => ({ at: a, side }));
      const order = (list) => [...list].sort((x, y) => x.at - y.at);
      // Inner lines exist only where the rail opens: on the tier's open sides the rail
      // is cut away behind each one, so it sits in the opening, inset by `space`.
      // On a completed badge the medallion takes the bottom point's place, so that
      // anchor drops its inner line and opening instead of piling up under the check.
      const opened = order(placed).filter((p) => tier.open.includes(p.side) && !(completed && !compact && p.side === 2));
      const aCentres = opened;
      // Chevrons on points stay at the tier length; lines on straight or curved
      // stretches run longer, so they carry as much weight as a chevron.
      // A keystone slant trims each inner line by its inset at both ends; add that
      // back so the visible length stays true to the tier.
      const slantTrim = lean > 0 ? 2 * lean * blockOffset : 0;
      const lenFor = (p) => {
        const want = shape.points.includes(p.side) ? aLen : aLen * (shape.boost?.[p.side] ?? STRAIGHT_BOOST);
        const cap = shape.maxLen?.[p.side];
        return (cap ? Math.min(want, (aTotal / 4) * cap) : want) + slantTrim;
      };
      const lens = opened.map(lenFor);
      // Spans are cached per layout, so the key names which anchors are open.
      const spanKey = (list) => `${form}|${level}|${(accentR / r).toFixed(3)}|${list.map((p) => p.side).join('')}`;
      const glowPath = this.querySelector('[data-accent-glow]');
      let pieceLens = lens;
      if (opened.length) setDash(accentPath, dashesAt(opened.map((p) => p.at), aTotal, lens, 0));
      else { accentPath.remove(); glowPath.remove(); this.querySelector('[data-accent-back]').remove(); } // a tier with no open sides is a closed outline
      accentPath.style.setProperty('--len', aTotal);
      // Spawn readout: the fill line starts at the top of the outline.
      const fill = this.querySelector('[data-fill]');
      fill.dataset.len = total;
      fill.setAttribute('stroke-dashoffset', -sideFractions(`${form}|rail`, railPath, c, [0])[0] * total);
      this.hideReadout = compact; // too small to read a number
      if (compact) this.querySelector('[data-readout]').remove();
      this.lastState = null;
      this.runProgress();

      const spans = railSpans(spanKey(opened), railPath, accentPath, opened.map((p) => p.at), lens, total, aTotal)
        .sort((x, y) => x[0] - y[0]);
      const cuts = spans.map(([m]) => m);

      // Insane: a spike in the middle of each steel run of the rail. Runs are taken
      // from the full layout (all four openings, even when the medallion replaces the
      // bottom one), so a completed badge keeps the same spikes. Each spike sits at the
      // middle of its run's longest straight stretch and points square off it; on a
      // curve (circle) it points straight out from the centre. The shield's upper two
      // become horns on the shoulder corners.
      if (level === 'insane' && spans.length) {
        const grow = shape.spike ?? 1;
        const h = stroke * (compact ? 1.25 : SPIKE_HEIGHT) * grow;
        const half = (stroke * (compact ? 1 : SPIKE_BASE) / 2) * grow;
        const full = order(placed).filter((p) => tier.open.includes(p.side));
        const fullSpans = railSpans(spanKey(full), railPath, accentPath, full.map((p) => p.at), full.map(lenFor), total, aTotal)
          .sort((x, y) => x[0] - y[0]);
        const tris = fullSpans.map(([m, l], i) => {
          const [m2, l2] = fullSpans[(i + 1) % fullSpans.length];
          const from = m + l / 2;
          let to = m2 - l2 / 2;
          if (to <= from) to += total;
          const { at, dir } = spikeSpot(railPath, c, from, to, total);
          // A spike never takes up more than half its grey run, so it reads as part of
          // the line rather than an arrowhead sitting on a stub.
          const runHalf = Math.min(half, (to - from) * 0.3);
          const height = h * (runHalf / half);
          const pt = railPath.getPointAtLength(at);
          const [dx, dy] = dir;
          if (shape.shoulders && pt.y < c) {
            // A horn: its outer side carries the shield's side edge straight up, and it
            // slopes back down onto the top edge, so the corner itself rises to a point.
            const side = Math.sign(pt.x - c);
            const xo = c + side * (shape.shoulders.x * r + stroke / 2); // outer edge of the side
            const yo = c + shape.shoulders.y * r - stroke / 2 + 0.5; // just inside the top's outer edge
            return { points: `${xo},${yo} ${xo},${yo - h} ${xo - side * half * 2},${yo}`, origin: [xo, yo] };
          }
          // Base sits just inside the rail's outer edge so the spike grows out of it.
          const bx = pt.x + dx * (stroke / 2 - 0.5);
          const by = pt.y + dy * (stroke / 2 - 0.5);
          return { points: `${bx - dy * runHalf},${by + dx * runHalf} ${bx + dx * height},${by + dy * height} ${bx + dy * runHalf},${by - dx * runHalf}` };
        });
        // Horns grow from their outer corner, so on hover they extend along the shield's
        // edge and inwards, never out past its side.
        this.querySelector('[data-spikes]').innerHTML = tris.map((t) => (t.origin
          ? `<polygon points="${t.points}" style="transform-box: view-box; transform-origin: ${t.origin[0]}px ${t.origin[1]}px"/>`
          : `<polygon points="${t.points}"/>`)).join('');
      }
      const widths = spans.map(([, l]) => l);
      if (angled && spans.length) {
        // Angled cuts: the rail stays whole and is masked; each opening is a slanted
        // quad whose two ends run at 45° through the rail and the inner line alike.
        const depth = stroke / 2 + space + blockW + 2; // reaches past the block and its outline
        // Outward reach clears the overshoot of a sharp corner's mitre.
        const quads = spans.map(([m, l]) => slantedQuad(railPath, c, m - l / 2, m + l / 2, total, depth, stroke * 1.5 + 1, lean));
        const poly = (q, fill) => `<polygon points="${q.map(([x, y]) => `${x},${y}`).join(' ')}" fill="${fill}"/>`;
        const box = `x="${-size}" y="${-size}" width="${size * 3}" height="${size * 3}"`;
        this.querySelector('defs').insertAdjacentHTML('beforeend', `
          <mask id="${id}-cut" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="#fff"/>${quads.map((q) => poly(q, '#000')).join('')}</mask>
          <mask id="${id}-keep" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="#000"/>${quads.map((q) => poly(q, '#fff')).join('')}</mask>`);
        // The inner line runs a little long; the shared slant trims both ends.
        pieceLens = lens.map((l) => l + depth * 2);
        setDash(accentPath, dashesAt(aCentres.map((p) => p.at), aTotal, pieceLens, 0));
        railPath.style.setProperty('--dash', 'none');
      } else {
        // Compact draws the coloured segments over an unbroken rail.
        setDash(railPath, compact ? { dash: 'none', offset: 0 } : gapsAt(cuts, total, widths, cap, stroke * 2.5));
      }

      const backPath = this.querySelector('[data-accent-back]');
      if (compact) backPath?.remove(); // segments sit on the rail; no outline needed
      ['--dash', '--offset', '--len'].forEach((k) => [glowPath, backPath].filter((el) => el?.isConnected).forEach((el) => el.style.setProperty(k, accentPath.style.getPropertyValue(k))));
      accentPath.centres = aCentres.map((p) => p.at);

      // Hard and insane: each piece gets its own group, so on hover the top goes
      // first, then the sides, then the bottom: the frame closes in layers.
      if (LEVELS.indexOf(level) >= 2 && !compact && aCentres.length) {
        const STAGGER = { 0: 0, 1: 120, 3: 120, 2: 240 }; // ms by anchor: top, sides, bottom
        this.querySelectorAll('[data-accents]').forEach((group) => {
          aCentres.forEach((p, i) => {
            const piece = group.cloneNode(true);
            piece.setAttribute('data-split', '');
            piece.style.setProperty('--delay', `${STAGGER[p.side] ?? 0}ms`);
            const one = dashesAt([p.at], aTotal, [pieceLens[i]], 0);
            piece.querySelectorAll('path').forEach((el) => {
              setDash(el, one);
              el.style.setProperty('--len', aTotal);
              el.centres = [p.at];
            });
            group.before(piece);
          });
          group.remove();
        });
      }

      this.fx = { railPath, accentPath, total, aTotal, aCentres: aCentres.map((p) => p.at), aLen, cuts: angled ? [] : cuts, stroke, accentW, cap, level };
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
      const { railPath, accentPath, total, aTotal, aCentres, cuts, stroke, accentW, cap, level } = this.fx;
      const weight = LEVELS.indexOf(level); // 0 easy … 3 insane
      const ease = 'cubic-bezier(.2, .8, .2, 1)';
      const snap = 'cubic-bezier(.3, 1.5, .5, 1)';
      const art = this.querySelector('[data-art]');
      const accents = [...this.querySelectorAll('[data-accents]')]; // re-read: hard/insane split into pieces
      const check = this.querySelector('[data-check]');
      const rest = (el) => ({
        strokeDasharray: el.style.getPropertyValue('--dash') || 'none',
        strokeDashoffset: el.style.getPropertyValue('--offset') || '0',
      });

      art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 + weight * 100, easing: 'ease' });

      // Rail.
      let accentDelay = 0;
      // A frame without inner lines traces its outline in on its own.
      const lines = aCentres.length > 0;
      if (weight >= 1 || !lines) {
        const mask = this.querySelector('[data-mask]');
        railPath.setAttribute('mask', `url(#${railPath.dataset.maskId})`);
        mask.style.strokeDasharray = `${total} ${total}`;
        const trace = 380 + weight * 60;
        mask.animate([{ strokeDashoffset: total }, { strokeDashoffset: 0 }], { duration: trace, easing: ease, fill: 'both' })
          .finished.then(() => railPath.removeAttribute('mask'), () => {});
        accentDelay = trace * 0.6;
        if (weight >= 2) {
          // Closed first, then the cuts crack open as the trace finishes.
          const closed = gapsAt(cuts, total, 0, 0, 0);
          railPath.animate([{ strokeDasharray: closed.dash, strokeDashoffset: closed.offset },
            { strokeDasharray: closed.dash, strokeDashoffset: closed.offset, offset: 0.6 }, rest(railPath)],
          { duration: trace + 320, easing: snap });
          accentDelay = trace;
        }
      }

      // Accents grow from each side's centre (insane: sweeping in from a quarter turn back).
      let lockAt = accentDelay + 380; // no inner lines: once the outline has traced in
      if (lines) {
        const grow = 320 + weight * 80;
        const sweep = weight === 3;
        const growFor = sweep ? grow + 300 : grow;
        this.querySelectorAll('[data-accent]').forEach((el) => {
          const settled = rest(el);
          const seed = dashesAt(el.centres || aCentres, aTotal, 1, 0);
          const frames = sweep
            ? [{ strokeDasharray: seed.dash, strokeDashoffset: seed.offset + aTotal / 4, opacity: 0 },
              { opacity: 1, offset: 0.15 },
              { strokeDasharray: seed.dash, strokeDashoffset: seed.offset, offset: 0.55 },
              { ...settled, opacity: 1 }]
            : [{ strokeDasharray: seed.dash, strokeDashoffset: seed.offset, opacity: 0 }, { opacity: 1, offset: 0.2 }, { ...settled, opacity: 1 }];
          el.animate(frames, { duration: growFor, delay: accentDelay, easing: ease, fill: 'backwards' });
        });

        // Lock: accents press out onto the rail and settle (hard once, insane twice).
        lockAt = accentDelay + growFor;
        if (weight >= 2) {
          const press = getComputedStyle(this).getPropertyValue('--press');
          const hit = { transform: `scale(${press})` };
          const calm = { transform: 'scale(1)' };
          const lock = sweep
            ? [calm, { ...hit, offset: 0.2 }, { ...calm, offset: 0.45 }, { ...hit, offset: 0.65 }, calm]
            : [calm, { ...hit, offset: 0.35 }, calm];
          // Split pieces lock in the same layered order as their hover.
          accents.forEach((g) => g.animate(lock, { duration: sweep ? 720 : 440, delay: lockAt + (parseFloat(g.style.getPropertyValue('--delay')) || 0), easing: 'ease-out' }));
          // The bloom flashes with each lock.
          const flash = lock.map((f) => ({ opacity: f.transform === 'scale(1)' ? 0 : 1, offset: f.offset }));
          this.querySelector('[data-glow]').animate(flash, { duration: sweep ? 720 : 440, delay: lockAt, easing: 'ease-out' });
        }
      }

      if (check) {
        // Medallion pops in once the frame has settled, then the tick draws itself.
        const disc = check.querySelector('[data-disc]');
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
