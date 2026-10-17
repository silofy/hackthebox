# Onboarding 1. Brief → 2. First Win

**Status:** PROPOSED (rework of "HTB Account Onboarding Journey", 2026-09-11) · **Date:** 2026-10-17
**Builds on:** [0. Route](./00-route.md) · HTB First Mission: Starter Modules
**Relates to:** Value Stream 1, "Unifying Onboarding and Activation into HTB Account & Profile"

---

## 0. What changed from the previous version

| Change | Why |
|---|---|
| Removed the three conflicting "Stage 0" sections | Routing now lives in its own doc: [0. Route](./00-route.md) |
| **Fundamentals has one definition:** a bite-sized Academy ramp ending in a direction choice | The previous doc described it both as a "longer ramp" and as a "15-min primer" |
| Brief and First Win are written as **one continuous mission**, with explicit handoff rules | The previous doc defined both stages but not the join between them |
| Starting Point / Blue Tier 0 tracks moved to **Appendix: future work** | Keeps the in-scope ask small |
| Added a **readiness gate** for the Defensive branch | The Brutus VM download is the biggest drop-off risk |

## 1. The mission in one line

> Every new user gets **one mission**: an optional briefing (Academy) followed by **one first win** (a Labs flag, or for Fundamentals an Academy milestone). The win pays out **100 XP + Apprentice** and hands off to recommendations.

```
0. Route ──► 1. Brief (optional) ──► 2. First Win ──► 3. Continue
 Account      Academy                 Labs / Academy     Recommendations
```

## 2. Branch overview

| Branch | 1. Brief | Length | 2. First Win | Setup at that moment | Onboarding complete when |
|---|---|---|---|---|---|
| **Fundamentals** | Fundamentals Ramp (5 bite-sized lessons) | ~5 × 5 min, over multiple sessions is fine | Ramp milestone + direction choice | None (browser only) | Ramp completed **and** a direction picked |
| **Offensive** | First Foothold: Enumerate and Connect | 12 min | **Meow** (Starting Point T0, free) | Pwnbox by default, VPN as an option | Meow flag submitted |
| **Defensive** | First Investigation: Trace an SSH Compromise | 14 min | **Brutus** (Very Easy Sherlock, free) | Browser workspace (see §5 gate) | Brutus solved |

## 3. Stage 1: Brief

### 3.1 Shared rules (all branches)

| Rule | Detail |
|---|---|
| Optional | Every brief has "Skip to the mission". Skipping never blocks completion. |
| CTA emphasis follows Q1 | Q1 = ③ (hands-on before): "Go straight to the lab" is primary and the brief is secondary. Q1 = ②: "Start the briefing" is primary. |
| Teaches only what the next step uses | Every term introduced appears in the paired activity |
| No spoilers | Synthetic values only. Never the flag, credentials, attacker IP or username. |
| Ends with a prediction | "What will you look for first?" |
| Free, no prerequisites | Permanently accessible to free users |
| Primary CTA | Continue to the mission. Secondary: switch direction. |

### 3.2 Fundamentals: Fundamentals Ramp

Two kinds of users arrive here, and they need different lengths:

| Arrived via | Who | Path |
|---|---|---|
| Q1 = ① Brand new | Persona A | All 5 lessons |
| Q2 = Not sure yet | Has IT basics, just undecided | **Lesson 1 only**, then the direction choice. Lessons 2–5 stay available as optional refreshers. |

Its job is to **remove vocabulary shock** before any lab, without making undecided-but-capable users sit through basics they already know.

| # | Lesson | Teaches | Tiny check | Unlocks the idea for… |
|---|---|---|---|---|
| 1 | What cybersecurity work is | Attack vs defence, why labs are safe simulations | Sort 4 tasks into red/blue | Choosing a direction |
| 2 | How computers talk | Client/server, IP, port, protocol, service | Match ports to services | Meow, Brutus |
| 3 | Your first terminal | Prompt, commands, reading output, copy/paste | Run 3 commands in an in-browser terminal | Meow |
| 4 | Credentials and access | Usernames, weak/default credentials, logs of logins | Spot the weak login in a list | Meow, Brutus |
| 5 | Flags and proof | What a flag is, how HTB records progress | Submit a practice flag | Every lab |

**Ending:** Lesson 5's practice flag is the user's first win (they get the First Win screen, §5). Then: "Break in or Investigate?" The choice sends the user to that branch's brief. Ramp lessons already covered are marked as done there, so nothing is repeated.

### 3.3 Offensive: First Foothold (12 min)
Content as specified in the Starter Modules brief. Sections: Your first target → IPs, ports and services → Ask the target with Nmap → Connect, then question trust → Mission handoff.
Recap shown at handoff: `Target → Enumerate → Identify service → Choose client → Test authentication`

### 3.4 Defensive: First Investigation (14 min)
Content as specified in the Starter Modules brief. Sections: Start with the incident question → Read one auth event → Find the change in the pattern → Authentication isn't the whole session → Look beyond initial access → Mission handoff.
Recap shown at handoff: `Failures → Success → Session → Persistence → Privileged activity`

## 4. The handoff (Brief → First Win)

This is the part the previous doc was missing. The join has to feel like **turning a page, not changing apps**.

| # | Requirement | Owner |
|---|---|---|
| H1 | One CTA, "Start Meow" / "Start Brutus", deep-links straight into the activity, already signed in | Academy + Labs |
| H2 | **Pre-warm the target:** start spawning Meow when the user opens the brief's Section 5, so the ~1:20 spawn time is hidden behind the recap | Labs |
| H3 | The brief's recap stays available in the lab as a side panel or one-page reference | Labs |
| H4 | Mission header in the lab: "Mission 1 of 1 · 100 XP · Apprentice", so the user knows this is the same journey | Labs |
| H5 | Completion state returns to the Account Home | Account |
| H6 | Skipped the brief? Show the same mission header plus a "Need a 2-min refresher?" link back | Labs |
| H7 | Hints are available at three levels (nudge → concept → step) before the walkthrough. Hint use is tracked. | Labs |

## 5. Stage 2: First Win

| Branch | The win | Known friction | Mitigation | Status |
|---|---|---|---|---|
| Offensive | Meow flag | 1:20 spawn time. VPN vs Pwnbox choice. | Pre-warm (H2). Pwnbox as default. | Ready, with fixes |
| Defensive | Brutus solved | Password-protected "may be malicious" archive, VM recommended | **Browser-hosted workspace** | ⚠️ **Gate:** don't route Q1 = ② users to Brutus until the browser workspace exists. Fallback: the Fundamentals ramp, then Brutus. |
| Fundamentals | Ramp done + direction picked | No hands-on "aha" | Lesson 3 terminal + Lesson 5 practice flag give small wins | Needs content commissioning |

### The First Win screen
This is the most valuable screen in the whole journey. It needs to do four things:

1. **Celebrate:** "You just completed your first hands-on cybersecurity challenge." +100 XP, Apprentice badge, shareable.
2. **Show what was learned:** 3 skill tags (e.g. Enumeration, Telnet, Weak credentials).
3. **Ask one question:** "What's next for you?" (deferred interest capture, see 0. Route §7).
4. **Offer one next step** (not a catalog), shaped by that answer:

| Answer | Next step |
|---|---|
| Sharpen skills | Next Starting Point machine / next Sherlock |
| Get certified | The relevant Academy path toward that cert |
| Land a job | Job-role path (e.g. SOC Analyst / Pentester) |
| Compete | Season / Starting Point, then Labs |
| Skip | Branch default (the next free Tier 0 item) |

## 6. Stage 3: Continue (handoff out of onboarding)
Account stops driving here. Recommendations and email flows take over (this ties to the "Improving engagement email flows" item on the growth plan). The XP and streaks from the win carry over into the existing XP & Streaks system.

## 7. Metrics

**Primary success metric:** first-win completion within 7 days, by branch. Brief completion is secondary.

| Metric | Branch | Baseline | Target |
|---|---|---|---|
| Own on Labs F7D | Offensive | 36% (July) | 39% |
| Own a Sherlock F7D | Defensive | 1.8% (July) | 5% |
| Ramp completion + direction picked, 14 days | Fundamentals | n/a | Set after the first cohort |
| Brief start → mission start | Off / Def | n/a | ≥ 70% |
| Skip-to-mission rate | Off / Def | n/a | Watch (high is fine for Persona D) |
| Spawn/setup failure | Off / Def | n/a | < 5% |
| Hint / walkthrough use | Off / Def | n/a | Watch |
| Day-30 retention, activated vs not | All | n/a | ≥ 2× (validates the activation metric) |

## 8. Validation
Test 5–8 people who have never used HTB per branch (15–24 total). Measure the time from Home to first win, where they hesitate, and whether they can explain why the brief and the mission are connected.

## 9. Ownership

| Stage | Owner | Account's role |
|---|---|---|
| 0. Route | Account | Build |
| 1. Brief | Academy | Content brief (this doc) |
| 2. First Win | Labs | Requirements H1–H7, report broken experiences |
| First Win screen | Account + Labs | Co-own |
| 3. Continue | Growth / Recommendations | Handoff contract |

## 10. Open questions
1. Is the browser workspace for Sherlocks on the Labs roadmap? This decides the Defensive gate.
2. Can Meow pre-warming happen without wasting capacity on users who abandon? (Option: pre-warm only once Section 4 is complete.)
3. Who commissions the Fundamentals ramp, and does it align with Julen's Academy "kindergarten" path?
4. Should Lesson 5's practice flag be replaced later by the free Tier 0 exam (the "Simplify freemium" item) as the Fundamentals graduation milestone?

---

## Appendix: future work (not in this ask)

- **Red Tier 0 track:** 8 machines, each with a companion section. Note the **73% drop at Explosion (paywall cliff)**. Recommendation: make all 8 Tier 0 machines free.
- **Blue Tier 0 track:** 8 free retired Sherlocks (Brutus → BFT), escalating one artefact type at a time.
- **Intro to Offensive / Defensive paths:** companion module + existing Tier 0 modules (~3.5 h each).
- **Defensive post-onboarding:** consider moving SIEM Log Search, Incident Management 101 and Before the DFIR down to Tier 0.

(The full tables from the 2026-09-11 version are kept in its history.)
