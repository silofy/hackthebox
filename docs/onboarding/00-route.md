# Onboarding 0. Route: Post Sign-up Questions and Branching

**Status:** PROPOSED · **Owner:** Account / Profile · **Date:** 2026-10-17
**Contributors:** Silo Gerstheimer, Iliana Kylintirea
**Next docs:** [1. Brief + 2. First Win](./01-brief-and-first-win.md)

---

## 1. Summary

Replace today's multi-step post sign-up questionnaire with **two single-select questions** that route every new user to one of three hard-coded branches: **General 101**, **Offensive**, or **Defensive**.

Questions that don't change the route (goals, job roles, topics of interest) are **moved out of sign-up**, not deleted. They come back later at moments when answering gets the user something, so the content team keeps its signal.

| | Today | Proposed |
|---|---|---|
| Screens | Multi-step | 1–2 |
| Taps (beginner) | Many | 1 |
| Taps (everyone else) | Many | 2 |
| Skip rate | **67%** | Target: < 30% |
| Data used for routing | Little | All of it |
| Interest data for content team | Collected upfront, mostly skipped | Collected later, when the user has a reason to answer |

## 2. Scope

**In scope:** the questions, the routing logic, the redirect to the branch entry point, the place where deferred questions resurface, and the ability to change branch from the dashboard.

**Out of scope:** the content behind each branch (see doc 1/2), revenue or upsell prompts (agreed: onboarding focuses on engagement, not monetization), and a multi-platform intro tour (shelved).

## 3. Why we're changing it

| Finding | Evidence | Implication |
|---|---|---|
| Users skip the flow | 67% skip rate across the whole flow (Tableau) | It's too long for the motivation users arrive with |
| The goal question doesn't separate users | Multi-select. 84.7% chose "Start learning cybersecurity", 61.8% "Train and improve" | You can't route on an answer that nearly everyone gives |
| What really separates users is experience | A brand-new user and a CTF player both want to "learn" | Ask about experience first |
| Team buyers sit in the learner funnel | 15% chose "team training solutions" | Give them a quiet exit to Enterprise |

## 4. Personas this routing serves

| Persona | Signal | Branch |
|---|---|---|
| **A. True beginner** (primary) | Q1 = brand new | General 101 |
| **B. Curious attacker** | Q1 = some basics/hands-on, Q2 = Break in | Offensive |
| **C. Curious defender** | Q1 = some basics/hands-on, Q2 = Investigate | Defensive |
| **D. Already skilled** | Q1 = hands-on | Offensive / Defensive, with "skip to the lab" shown first |
| Team buyer | Footer link | Enterprise (out of funnel) |

Cert hunters, job seekers and competitors are **motives, not starting points**. They're captured in Section 7 and used for recommendations, not routing.

## 5. The questions

### Q1. "Where are you starting from?"
Single-select, required (but the whole step can be skipped).

| Option | Copy | Next |
|---|---|---|
| ① | **Brand new to cybersecurity.** I'm not sure what a port or a terminal is yet. | → **General 101** (skip Q2) |
| ② | **I know some IT or networking basics.** | → Q2 |
| ③ | **I've done hands-on security before.** Labs, CTFs, or work. | → Q2 |

### Q2. "Which side pulls you in?"

| Option | Copy | Next |
|---|---|---|
| 🔴 | **Break in.** Find the way through a system nobody meant to leave open. | → **Offensive** |
| 🔵 | **Investigate.** Work the evidence and reconstruct what an attacker did. | → **Defensive** |
| ⚪ | **Not sure yet.** Show me both. | → **General 101** |

### Footer (both screens)
- **Skip, I'll explore** → today's behavior (platform chooser plus recommended items)
- **Training a team?** → Enterprise page

### Copy rules
- Use verbs, not jargon. Beginners don't know the words "Offensive" or "Defensive" yet, so show them as secondary labels only.
- Say why we're asking: *"So your first 15 minutes are the right 15 minutes."*
- Don't use skill quizzes or assessments.

## 6. Routing logic

```
Sign up → account.hackthebox.com
  └─ Q1
      ├─ ① Brand new ───────────────────────────► General 101
      ├─ ② / ③ → Q2
      │        ├─ Break in ─────────────────────► Offensive
      │        ├─ Investigate ──────────────────► Defensive
      │        └─ Not sure ─────────────────────► General 101
      ├─ Skip ──────────────────────────────────► Today's chooser
      └─ Training a team? ──────────────────────► Enterprise
```

| Rule | Detail |
|---|---|
| The route is hard-coded | Answers pick the branch. No scoring model. |
| Experience ③ adjusts emphasis, not route | Option ③ users see "Go straight to the lab" as the primary CTA. Everyone else sees "Start the briefing". |
| Branch is switchable | From the dashboard, at any time. Progress in each branch is kept separately. |
| Account stops at redirect | Downstream content belongs to Academy and Labs (agreed in the meeting). |

## 7. Where the interest questions go (deferred profiling)

The content team uses goals, job roles and topic interests to plan what to build next. We keep collecting that, **just not at sign-up**. Proposed placements, kept deliberately light:

| # | Placement | Trigger | What we ask | Format | Why here |
|---|---|---|---|---|---|
| **1** | **First Win screen** (primary) | User completes their first mission (Meow, Brutus, or the 101 milestone) | "What's next for you?": get certified · land a job · compete · sharpen skills · just exploring | Single-select chips, skippable, 1 tap | Motivation is at its peak. The answer directly shapes the next recommendation, so the user can see what they get for answering. |
| **2** | **Dashboard "Your interests" card** | Always visible, then nudged once after a user's 3rd session | Job roles of interest + topics (web, cloud, AD, malware, forensics…) | Multi-select chips, editable | Low pressure and self-serve. Feeds recommended items. |
| **3** | **Profile settings** | Any time | Same fields as #2 | Form | Source of truth. Same place as the branch switch. |

**Data contract for the content team**
- Same answer taxonomy as today wherever possible, so trends can be compared over time.
- Each answer is stored with `captured_at` and `placement` (first_win / dashboard / settings).
- Note the bias: these answers come from **activated** users, not all sign-ups. That's arguably a better signal for content priorities, but it isn't comparable 1:1 with the old data.

## 8. Metrics

| Metric | Baseline | Target |
|---|---|---|
| Route completion (Q1 answered) | 33% (67% skip) | ≥ 70% |
| Median time from sign-up to branch | n/a | < 20 s |
| Branch distribution | Unknown | Measure. This sizes the personas for the first time. |
| Branch switch within 7 days | n/a | Watch. A high rate means the copy is misrouting people. |
| Interest capture rate at First Win | n/a | ≥ 50% of first-win users |
| Downstream: own on Labs F7D | 36% (July) | 39% (shared growth KPI) |

## 9. Open questions

1. Should "Skip" stay visible, or show only after 5 seconds? (Recommendation: keep it visible. Trust matters more here.)
2. Who owns the interest taxonomy, the content teams or Account?
3. Do existing users get Q1/Q2 once, or only new sign-ups? (Recommendation: new sign-ups only for v1.)
4. Can the Enterprise exit be tracked as a lead source?

## 10. Next steps

| Owner | Action |
|---|---|
| Group | Approve the Q1/Q2 copy and routing |
| Group | Share personas and routing with the Academy, Labs and CTF teams |
| Iliana | Confirm event tracking for route + deferred interest capture |
| Silo | Low-fi flows for Q1/Q2, the First Win chip, and the dashboard card |
