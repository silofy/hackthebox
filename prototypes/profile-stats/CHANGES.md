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

| F11 | Modules card | "Modules completed" row was shorter than the Bloods rows on the other cards | Matched the count size (15px/600) and set a 22px minimum row height |
| F12 | Bloods styling | Counts were green, unlike HTB's design language for bloods | Red drop icon and red count, as on the HTB leaderboard |

## 3. Persona-driven additions

| # | Component | State | Content | Goal |
|---|---|---|---|---|
| P1 | Journey card: onboarding (v2, matches the Content Library "First mission") | Empty | Offensive / Defensive switch, then 01 Learn (Academy starter module) and 02 Practice (Meow for Offensive, Brutus for Defensive), with time, XP and what each fills on this page. CTA: Start Meow / Start Brutus. "+100 XP · promotes you to Apprentice". Choosing a direction also switches the Domain Graph to Red / Blue Team. | Clear start for both offensive and defensive new users, in the same language as onboarding |
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
| Modules (renamed from "Academy Modules") | Google Material Symbols `school` | Overview card |
| Bloods | Material Symbols `water_drop`, in `--red` | Before every blood count (overview cards, Total bloods), matching the HTB leaderboard pattern |

Icons live in one inline SVG sprite (`<symbol id="i-…">`), use `currentColor`, and are tinted with `--green`.

## 5. Routing rules ("Room to grow" and other outbound links)

Decision: link to a **filtered content list** (e.g. AD-tagged machines), because there is no domain landing page.

| Rule | B2C (individual) | B2B (enterprise user) | Status |
|---|---|---|---|
| Room to grow → Network & AD | `app.hackthebox.com/machines?tags=active-directory` | Enterprise platform equivalent of AD-tagged content | **B2B URL to confirm** |
| Room to grow → other domains | Same pattern: content list filtered by the domain's tag | Enterprise equivalent | Need a tag map for each domain |
| Overview cards (Machines / Sherlocks / Challenges) | `app.hackthebox.com/{type}` | Enterprise equivalent | B2B to confirm |
| Academy links | Academy (B2C) | Academy for Business | B2B to confirm |
| First-mission CTA, Offensive (Meow) | `app.hackthebox.com/starting-point` | To decide: does B2B have Starting Point? | Open |
| First-mission CTA, Defensive (Brutus) | `app.hackthebox.com/sherlocks` (deep link to Brutus to confirm) | B2B equivalent | Open |

In the prototype, links carry `data-route-b2c` / `data-route-b2b` attributes as placeholders. Engineering resolves which one to use from the account type.

## 6. Open questions

| # | Question | Owner |
|---|---|---|
| Q1 | B2B destination URLs for every route in §5 | Product / Eng |
| Q2 | Tag map from each Domain Graph domain to a content filter | Product |
| Q3 | Room to grow rule: lowest score, or exclude domains never started? | Product |
| Q4 | Store a last-visit timestamp per user (needed for the deltas) | Eng |
| Q5 | "All time" velocity data (the prototype reuses the 12-month data) | Eng |
| Q6 | Confirm `school` as the official Modules icon, or replace it with an HTB-drawn one | Design |
| Q8 | Should the Stats page start on the direction chosen in onboarding instead of defaulting to Offensive? | Product / Eng |
| Q9 | If the user skipped the first mission, does this card still show? (Recommendation: yes, it's the only way this page fills up) | Product |
| Q7 | Progress email: separate project, reusing the journey recap data | Product |

## 7. Solved-history dialog (opens from each overview card)

Clicking Machines, Sherlocks, Challenges or Modules opens a dialog listing every item in that type. It follows the Content Library search-dialog pattern: an 816px panel with a 300px "peek" panel docked beside it, the pair centred as one unit, the peek shown from 1162px and up, full-screen sheet under 860px.

**Behaviour change:** the cards used to be links to the product. They now open the dialog, and the dialog header carries "Open in Labs ↗ / Open in Academy ↗".

### 7.1 Completion model per content type

| Type | What "complete" means | Shown in the row | Partial state |
|---|---|---|---|
| Machines | User flag + Root flag | `User` `Root` pills; `Tasks n/N` when the machine has Guided Mode | Missing flag, or Guided Mode tasks unfinished |
| Machines (Guided Mode) | Flags done; tasks are tracked separately | `Tasks n/N` pill | Flags owned but tasks n<N: counts as **solved**, not **fully solved** |
| Sherlocks | All tasks answered (task-based only) | `Tasks n/N` | n<N |
| Challenges | Single flag | `Flag` | None (binary) |
| Modules | All sections | `Sections n/N` | n<N |

Bloods use the red drop pill on the exact flag that was blooded (User or Root for machines, the flag for challenges, the Sherlock itself), matching F12.

### 7.2 What each row shows

| Element | Rule |
|---|---|
| Tile | First letter, with a difficulty-coloured underline (same colours as the Difficulty profile) |
| Name + NEW | NEW when completed after the user's last visit (same timestamp as the P6 deltas) |
| Difficulty · OS / category | OS for Machines, category for Sherlocks and Challenges |
| Date | Solved date (completion of the last required step); "started" for partials |
| Signals | ★ rated (gold) · 💬 reviewed (blue) · ✓ creator respected (green). Dim when not done. Modules show rating only (no review, no creator respect) |

### 7.3 Header summary

Count solved · in progress, then bloods · rated · reviewed · creators respected · date of first completion. Totals always match the card that opened the dialog.

### 7.4 Controls

| Control | Options |
|---|---|
| Filter | Name, plus OS / category text |
| Completion | All · Fully solved · In progress |
| Sort | Newest first (default) · Oldest first · Your rating · Difficulty |
| Footer | "N items", or "N of M items" when narrowed (same rule as the library dialog) |
| Keyboard | ↑↓ move, ↵ open in product, Esc close, Tab stays inside the dialog, focus returns to the card on close |

### 7.5 Peek (desktop ≥1162px) and inline expand (below)

Completion % with a bar, a step list with dates (User / Root / Guided tasks, Tasks, Flag, Sections), your rating (or "Rate it ↗"), your review (or "Write a review ↗"), creator + respect state, and Open again / Continue.

Below 1162px the selected row **expands inline** with the same content. This answers the library doc's open question 1 for this surface, and it's worth re-using there.

### 7.6 Empty state

"Nothing solved yet", plus the product CTA. All four types use the same message pattern.

### 7.7 Open questions

| # | Question | Owner |
|---|---|---|
| Q10 | Solved date for machines: the root-flag date, or the later of user/root? (The prototype uses one date for both) | Product / Eng |
| Q11 | Should Guided Mode tasks count toward "fully solved", or be a separate badge? | Product |
| Q12 | Can users rate, review or respect from the dialog, or only deep-link to the product? (The prototype deep-links) | Product |
| Q13 | B2B: do Enterprise users have ratings, reviews and respect at all? | Product |
| Q14 | Pagination or virtualisation for heavy users (hundreds of challenges) | Eng |
| Q15 | Should Fortresses, Pro Labs and Seasonal machines appear here, or stay in their own sections? | Product |
