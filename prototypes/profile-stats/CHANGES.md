# Profile → Stats: change log & decisions

Source of truth for updating the Confluence page. Prototype: `prototypes/profile-stats/index.html`.

## 1. Persona & page role (agreed)

| Topic | Decision |
|---|---|
| Who | All HTB users, every skill level (beginner → expert) |
| Audience | The user themselves. HTB-specific terms are fine, but explain the rare ones inline |
| Devices | Desktop and mobile equally |
| Page job | 1) See what I've accomplished (pride) 2) Get a shallow view of what to improve 3) Click out to the right place to improve it |
| Not the page's job | Content discovery or recommendations (other funnels own that) |
| New users | Clear CTAs that explain how to fill the page in |
| Return pattern | Occasional, not daily. Could be triggered by a progress email (to be scoped separately) |

## 2. Fixes

| # | Area | Issue | Fix |
|---|---|---|---|
| F1 | Difficulty donut (filled) | Rendered as a coloured square because of a CSS specificity conflict | Reset the background on `body.filled .ring` |
| F2 | Activity heatmap | "Less ··· More" legend was padded with `&nbsp;` and had no colours | Real 4-step colour scale with an aria-label |
| F3 | Completed Pro Labs | Heading touched the card above it | Added 28px top margin |
| F4 | Mobile header | Action buttons wrapped badly | 3-column action row, long label is cut off with an ellipsis |
| F5 | Velocity range (mobile) | "Last mont" was cut off | Capped select width |
| F6 | Contrast | `--muted-2` was ~3.9:1, failing AA | Changed to `#7D8CA7` |
| F7 | Small text | Ring caption 8–9px | Raised to 10px minimum |
| F8 | Keyboard | Focus rings were inconsistent | One green `:focus-visible` ring on all controls |
| F9 | Motion | Some animations ignored the OS setting | Turned off under `prefers-reduced-motion` |
| F10 | Demo toggle | Covered content | Added bottom padding; full-width bar on mobile (prototype only, remove before testing) |

## 3. Persona-driven additions

| # | Component | State | Content | Goal |
|---|---|---|---|---|
| P1 | Journey card: onboarding | Empty | 3 steps (Starting Point → first Machine → Academy module), each saying which part of the page it fills. One primary CTA: Start with Starting Point | Clear starting point for new users |
| P2 | Journey card: recap | Filled | Tenure ("since Mar 2021"), total completions, learning hours, change since last visit | Pride, reason to come back |
| P3 | Strongest domain | Filled | Highest Domain Graph score | Pride |
| P4 | Total bloods | Filled | Sum across content types | Pride |
| P5 | Room to grow | Filled | Lowest domain score plus a link to filtered content (see §5) | Shallow improvement view plus link out |
| P6 | Delta chips | Filled | +N since last visit on each overview card | Coming back |
| P7 | "Bloods" term | Both | Dotted underline with an explanation on hover | Beginner clarity |
| P8 | Velocity range | Filled | "All time" option added | Long-tenure users |

## 4. Branding

| Content type | Icon (HTB `alt`) | Where it's used |
|---|---|---|
| Machines | `battlegrounds` | Overview card, onboarding step 2 |
| Sherlocks | `encrypted_filled` | Overview card |
| Challenges | `tactic` | Overview card |
| Pro Labs | `pro_labs` | Enterprise campaigns heading, Completed Pro Labs heading |
| Starting Point | `directions_alt_filled` | Onboarding step 1, primary CTA |
| Seasonal | `season` | In the sprite, not placed yet (no Seasonal section on this page) |
| **Academy Modules** | **Missing** | **Need the icon** |

Icons live in one inline SVG sprite (`<symbol id="i-…">`), use `currentColor`, and are tinted with `--green`.

## 5. Routing rules ("Room to grow" and other outbound links)

Decision: link to a **filtered content list** (e.g. AD-tagged machines), because there is no domain landing page.

| Rule | B2C (individual) | B2B (enterprise user) | Status |
|---|---|---|---|
| Room to grow → Network & AD | `app.hackthebox.com/machines?tags=active-directory` | Enterprise platform equivalent of AD-tagged content | **B2B URL to confirm** |
| Room to grow → other domains | Same pattern: content list filtered by the domain's tag | Enterprise equivalent | Need a tag map for each domain |
| Overview cards (Machines / Sherlocks / Challenges) | `app.hackthebox.com/{type}` | Enterprise equivalent | B2B to confirm |
| Academy links | Academy (B2C) | Academy for Business | B2B to confirm |
| Starting Point CTA | `app.hackthebox.com/starting-point` | To decide: does B2B have Starting Point? | Open |

In the prototype, links carry `data-route-b2c` / `data-route-b2b` attributes as placeholders. Engineering resolves which one to use from the account type.

## 6. Open questions

| # | Question | Owner |
|---|---|---|
| Q1 | B2B destination URLs for every route in §5 | Product / Eng |
| Q2 | Tag map from each Domain Graph domain to a content filter | Product |
| Q3 | Room to grow rule: lowest score, or exclude domains never started? | Product |
| Q4 | Store a last-visit timestamp per user (needed for the deltas) | Eng |
| Q5 | "All time" velocity data (the prototype reuses the 12-month data) | Eng |
| Q6 | Academy Modules icon | Design |
| Q7 | Progress email: separate project, reusing the journey recap data | Product |
