# WorkWorld — Demo Script (7 minutes, truthful)

Show observed behavior only. If something is not working that day, say so.

1. **Home (30s):** the research question line; state plainly: technical
   candidate; practitioner validation pending.
2. **The consequential change (60s):** start "Delay and substitution" (A2).
   Advance two days. Supplier message: gloves delayed; substitute offered. Then
   the customer pulls the date forward. Point: the work changed mid-task.
3. **Actual action (90s):** amend the order to accept the substitute (records
   are never silently edited), message the supplier, re-commit to the customer
   on the ticket with a promise day — the UI warns that promises must be
   sourceable.
4. **Resulting state (60s):** check in the delivery (verifies exactly what the
   carrier delivered — mismatches are rejected), ledger accrual appears, ticket
   updated. Show a rejection banner once (e.g. authorize without approval) and
   how work survives it.
5. **Assessment evidence (90s):** submit; outcome evidence panel shows
   deterministic checks (state-based). Flip to N1 contrast: "a polished summary
   with wrong quantities fails `requirements_met` while all financial checks
   stay green" — show the two reports side by side from the evidence export.
6. **Assessor view (60s):** open /assessor; show evidence inspection, C1–C5
   rubric with attributable identity, append-only revision history.
7. **Honest close (30s):** what ran and what has not (no live-model comparison,
   no human study, no customers). Observed failure worth showing if it occurs —
   do not hide it.

Recording: `npx tsx scripts/capture-demo-video.ts` produces a real capture of
this flow; never stage or edit it into false behavior.
