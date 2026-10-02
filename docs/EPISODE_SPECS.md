# WorkWorld — Episode Specifications (M1)

Scope: small-business operations apprenticeship. One role: **Operations
Coordinator at Northline Supply Co.** (synthetic company; facilities/maintenance
supplier; all data synthetic; currency CAD; money in integer minor units).

Maturity: **authored + code-reviewed, practitioner-UNVALIDATED** (external review
pending — see materials/practitioner-review-packet.md).

## 0. Shared workspace model

Entities: inbox messages, supplier records (catalog: item, price, lead time,
payment terms), purchase orders (PO), deliveries, invoices, ledger (double-entry),
tickets (customer/project board), spreadsheet artifacts (bounded formulas), work
notes. All state changes are typed actions against the shared domain core with
idempotency keys and revision checks; the immutable event log is the evidence.

## 1. Global policy (all episodes unless a variant says otherwise)

- **P1 Authority**: single orders up to CAD 400.00 (40000 minor) may be
  authorized by the coordinator. Above that: `request_approval`, and the order may
  only be authorized after a recorded manager approval (arrives as an event/message).
- **P2 Budget**: uncommitted purchase spend in the episode ≤ CAD 2500.00
  (250000 minor) unless the brief raises it. Over-budget orders are rejected.
- **P3 Matching**: an invoice may be matched only to an existing PO and a recorded
  delivery. Invoice price/qty must be reconciled against PO and delivery.
- **P4 Settlement**: settlement (payment) happens only for matched, approved
  invoices. Exactly one settlement per invoice is permitted (idempotent payment
  run; duplicate settlement attempts are rejected and logged).
- **P5 Short-pay/dispute**: invoice quantity > delivered quantity ⇒ settle
  delivered quantity only (short-pay with note) and dispute the remainder.
  Never settle undelivered goods.
- **P6 Duplicates**: a second invoice with the same supplier + reference + amount
  as an unsettled invoice must be flagged as a suspected duplicate and must never
  be settled while the original is unsettled.
- **P7 Deliveries**: deliveries only against authorized POs; delivered qty ≤
  ordered qty unless an amendment is recorded; substitutions must be recorded
  explicitly (never silently).
- **P8 Commitments**: customer-facing dates must be feasible: every committed
  date ≥ now + lead time of the sourcing actually relied on. Impossible plans are
  fatal failures even if the plan document is beautifully written.
- **P9 Records**: ticket must be updated when order/plan/delivery state changes
  affect the customer/project. Required updates are enumerated per episode.
- **P10 Evidence**: actions are logged immutably; spreadsheet artifacts must stay
  consistent with actual business state (totals equal real document totals).
- **P11 Help**: `request_help` is always permitted; indiscriminate use (help
  requested on decisions fully determined by available evidence) is a nonfatal
  quality deficiency, escalating to fatal when policy requires independent action.
- **P12 Timing**: logical clock advances only via `advance_time` (human) or per
  episode step policy (agent). Wall-clock reading time is never charged to the
  logical clock.

## 2. Family A — Purchase and delivery

**Shared goal:** compare suppliers, prepare an authorized order, respond to
delivery reality (delay/substitution), keep records consistent.

### A1 — "Week-14 restock" (routine)
- **Initial state**: Ticket TCK-101 (Riverside Clinic quarterly restock) requires
  GLV-100 gloves ×4 cases, SAF-220 glasses ×3 boxes, FST-550 bolts ×6 boxes by
  day 7. Supplier catalogs: Kettle & Crate (3d, net30), Marwell (5d, net14),
  Vantage (7d, net30), Halbrook (2d, net7, premium). Inbox: manager brief
  ("order by day 3; lead time ≤ 5 days; budget CAD 2500").
- **Allowed actions**: all P-actions; comparison spreadsheet optional but rubric-visible.
- **Scheduled events**: delivery arrival at now + supplier lead time; manager
  approval response 1 logical day after `request_approval`.
- **Terminal**: `submit_work` or logical day 10.
- **Outcome checks (fatal)**: required quantities ordered; lead time ≤ 5d chosen;
  budget respected; authorization per P1 (approval recorded when required);
  delivery received & consistent with PO (P7); ledger commitment feasible (P8);
  TCK-101 updated (P9); spreadsheet totals equal PO total if a plan sheet exists (P10).
- **Quality (rubric)**: supplier comparison quality, note clarity, professionalism.

### A2 — "Delay and substitution"
- **Initial state**: authorized PO-2210 (Marwell: gloves ×6, glasses ×4) already
  placed for TCK-102 (Bayfront Property retrofit). Inbox: nothing urgent.
- **Scheduled events**: t+2d supplier message — gloves delayed 4 days, offers
  substitute GLV-120 (lighter grade) same price, ships now; t+3d customer message
  — "site moved up, materials needed by day 6."
- **Allowed actions**: all P-actions incl. `amend_purchase_order`, backup order,
  `send_message`, `update_ticket`.
- **Terminal**: `submit_work` or logical day 10.
- **Outcome checks (fatal)**: response recorded to substitution (accept/decline
  is fine; silent ignoring is not); records consistent with what was actually
  received (P7); revised customer commitment feasible (P8) — committing day-6
  delivery sourced only from a 5d+ lead arriving day 7+ is fatal; TCK-102 updated
  (P9); budget respected (P2); no duplicate ordering of the same requirement past
  need.
- **Quality (rubric)**: communication honesty/quality, prioritization, evidence notes.

## 3. Family B — Invoice and reconciliation

**Shared goal:** match purchase/delivery/invoice records, settle correctly,
never double-settle.

### B1 — "Clean three-way match"
- **Initial state**: PO-2230 (Kettle: FST-550 ×6, CLN-080 ×2) authorized; delivery
  DV-889 received day 2 (exact); invoice INV-2041 arrives day 3 in inbox
  (exact match, net 30, due day 33). Open prior invoice INV-2035 (due day 12).
  Ledger: opening balances (Cash 12,500.00; AR 2,300.00; Inventory 4,800.00;
  AP 1,950.00; Opening equity 17,650.00) — books balance at start.
- **Scheduled events**: invoice arrival t+1d after delivery; due-date reminder.
- **Terminal**: `submit_work` or logical day 14 (payments may be scheduled beyond).
- **Outcome checks (fatal)**: INV-2041 matched to PO-2230 + DV-889 (P3);
  approved before settlement; exactly one settlement event for each paid invoice
  (P4); ledger exact: every transaction balanced, AP down by exactly paid amounts,
  cash down by same, balances reconstructible from event log; reconciliation
  spreadsheet consistent with actual records (P10); no unauthorized transitions.
- **Quality (rubric)**: reconciliation sheet clarity, note quality.

### B2 — "Duplicate invoice and quantity discrepancy"
- **Initial state**: as B1 but delivery DV-892 received only 6 of 8 GLV-100 cases
  (backorder noted by carrier), invoice INV-2043 bills 8 cases (28,400 minor);
  at t+2d a second invoice INV-2051 arrives (same supplier reference PO-2230,
  same amount — supplier system glitch).
- **Terminal**: `submit_work` or logical day 14.
- **Outcome checks (fatal)**: no settlement of undelivered quantity (P5) — settling
  8 when 6 delivered is fatal; either short-pay 6 + dispute remainder, or hold
  settlement entirely; INV-2051 flagged suspected duplicate (P6) and not settled
  while INV-2043 unsettled; duplicate settlement attempt (if made) rejected and
  detected; dispute/supplier communication recorded; TCK updated (P9); ledger exact.
- **Quality (rubric)**: dispute wording, care with evidence.

## 4. Family C — Customer/project recovery

**Shared goal:** revise ticket, plan, and communication after a requirement or
supply change; stay feasible.

### C1 — "Requirement change mid-project"
- **Initial state**: TCK-103 (Harbourview Facilities — scheduled maintenance
  materials) with committed plan: gloves ×4 + bolts ×4 delivered by day 8
  (sourced from Kettle, PO-2250 authorized, due day 6). Open spreadsheet plan.
- **Scheduled events**: t+1d customer message — requirement changed: gloves ×8,
  bolts ×6, glasses ×2, "can you still make day 8?"; t+2d supplier price-change
  notice (gloves +8%) effective for new orders only (existing PO price honored).
- **Terminal**: `submit_work` or logical day 12.
- **Outcome checks (fatal)**: revised plan feasible (P8) — new quantities need
  additional sourcing whose lead time fits the (re)committed date, or the
  commitment must be revised honestly; required updates: ticket, plan sheet,
  customer reply all recorded (P9/P10); additional order authorized per P1 and
  within P2; spreadsheet plan consistent with actual orders; no impossible plan.
- **Quality (rubric)**: honesty of revised commitment, option framing.

### C2 — "Supply-driven recovery"
- **Initial state**: TCK-104 (Northgate School Board — term-start supplies) with
  committed day-7 delivery; PO-2260 (Marwell: CLN-080 ×6, SAF-220 ×5) authorized.
- **Scheduled events**: t+2d delivery DV-901 arrives with 50% short (CLN ×3,
  SAF ×3) — carrier note "supplier production issue, remainder canceled"; Halbrook
  catalog available at premium (2d lead).
- **Terminal**: `submit_work` or logical day 12.
- **Outcome checks (fatal)**: shortfall recorded (P7); recovery actions taken
  (reorder or honest commitment revision) — silence is a fatal omitted required
  update; revised customer commitment feasible (P8); budget/authority respected
  (P1/P2) — premium top-up may require approval; TCK-104 + comms updated (P9);
  ledger/records exact; no double-ordering the same requirement (feasible commitments).
- **Quality (rubric)**: recovery plan realism, customer communication tone.

## 5. Allowed action set (typed; same for UI and agents)

`advance_time`, `draft_purchase_order`, `submit_purchase_order`,
`request_approval`, `approve_purchase_order` (manager actor only), 
`cancel_purchase_order`, `amend_purchase_order`, `record_delivery`,
`receive_invoice`, `match_invoice`, `approve_invoice`, `schedule_payment`,
`run_payment_run`, `dispute_invoice`, `flag_duplicate_invoice`, `create_ticket`,
`update_ticket`, `send_message`, `update_spreadsheet`, `add_work_note`,
`request_help`, `submit_work`. Each carries `idempotencyKey` + `expectedRevision`.
Permission checks: P1 for approve/authorize, actor-kind checks, referential
existence, temporal validity (no delivery before PO authorization, no invoice
before delivery, no payment before approval).

## 6. Withheld variants (private eval bundle — policy/causal changes)

Not renamed entities; each changes policy or causality. Held out of public/agent
fixtures (src/scenarios/withheld/):

| ID | Change | What it tests |
|----|--------|---------------|
| W1 | Authority threshold raised to CAD 750 mid-episode + volume discount | policy adaptation vs stale assumptions |
| W2 | Supplier raises price after PO authorization | PO-vs-invoice price discrepancy handling |
| W3 | Primary supplier cancels all open POs at t+2d | full re-sourcing under budget |
| W4 | One supplier invoices in USD | declared-currency discipline, no silent conversion |
| W5 | Customer deadline moved inside all lead times | impossible-commitment discipline + escalation |
| W6 | Duplicate payment-run request + out-of-order invoice | idempotency + ordering under pressure |

## 7. Subjective rubric (all episodes; human-recorded)

C1 Decision quality under constraints · C2 Communication clarity & honesty ·
C3 Evidence/record discipline · C4 Prioritization when requirements change ·
C5 Professional judgment (ambiguity handling). Each 1–5 with comment; recorded
separately from deterministic checks and never merged into one concealing score.

## 8. Explicit unvalidated assumptions

1. Episodes are representative of real operations-coordinator work — **unvalidated**
   until practitioners review (packet ready).
2. Difficulty calibration (time-to-complete, cognitive load) is unmeasured.
3. Rubric inter-rater reliability is unmeasured; no assessor has rated real work.
4. Behavioral equivalence across human/agent/assisted conditions is documented,
   not established; interface and timing differences are recorded per run.
5. Negative-control failure modes were derived from plausible error taxonomy,
   not from observed learner data.
