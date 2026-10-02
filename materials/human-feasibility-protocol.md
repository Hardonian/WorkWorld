# Human Feasibility Protocol (DRAFT — pending governance)

Goal: cheaply test whether the environment, episodes, and assessor workflow are
usable by real people before any powered study. **No study has run.**

## Design

- N = 3–6 participants (operations experience or strong admin background),
  recruited only after governance review approval (separate step, not by agents).
- Conditions (within-subject, counterbalanced): each participant completes
  1 episode human-only and 1 episode AI-assisted (different families to limit
  carryover; order randomized).
- Episodes: A1, B2, C1 pool (each used ~equally); withheld variants excluded.
- Duration cap: 75 minutes total; environment logs active work time and logical
  time separately.

## Measures (all pre-registered in this document before the first run)

1. **Primary feasibility**: episode completion rate through the UI (target ≥ 80%
   without facilitator rescue).
2. **Usability**: System Usability Scale (SUS) short form; target ≥ 68.
3. **State correctness**: fraction of T1 checks passed per run (descriptive only
   at this N).
4. **Assistive effect (descriptive)**: T1 pass + rubric ratings human-only vs
   assisted; report each episode separately; **no inferential statistics at N<20**.
5. **Assessor feasibility**: minutes of assessor time per completed episode
   (target ≤ 15 min with the evidence viewer).
6. **Failure taxonomy**: observed confusions/mis-clicks mapped to UI fixes.

## Procedure

1. Consent (approved version) → 5-minute guided first episode (A1 tutorial mode).
2. Two scored episodes (no facilitator help except safety/technical).
3. Short questionnaire + optional interview.
4. Assessor rates artifacts blind to condition where feasible.

## Analysis limits (explicit)

- N is a feasibility sample: **no capability claims, no significance testing,
  no ranking of conditions**. We report counts and ranges with denominators.
- Episodes are practitioner-unvalidated; usability findings may reflect authoring
  artifacts rather than participant ability.
- Any published number must carry its denominator ("4 of 5 participants…").

## Governance

Requires: institutional ethics review or documented waiver determination,
approved consent, data-retention policy, and participant-removal process.
Status: **pending** — materials/participant-info-consent-draft.md awaiting review.
