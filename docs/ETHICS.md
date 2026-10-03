# WorkWorld — Research Ethics & Participant Rights Framework

Document Version: 1.0.0
IRB Study Protocol: #2026-OPS-04
Principal Investigators: WorkWorld Applied Cognition & Operations Evaluation Team

---

## 1. Study Overview & Ethical Imperatives

WorkWorld conducts empirical evaluations comparing human professional practitioners, autonomous LLM agents, and human-in-the-loop assisted workflows. To protect all participants and preserve research integrity, this protocol enforces:

1. **Explicit Informed Consent**: No simulation actions or trajectory telemetry are recorded without affirmative, interactive consent via the consent modal (`src/components/ui/ConsentModal.tsx`).
2. **Double-Blind Assessor Architecture**: Human assessors never receive candidate identity, institutional affiliation, or model provider names (`src/grading/double-blind.ts`).
3. **Data Minimization & Anonymization**: Learner notes and ticket entries are scrubbed of PII prior to long-term archiving or inclusion in benchmarks.
4. **Right to Withdraw & Data Portability**: Participants retain the right to withdraw from study cohorts and request immediate cryptographic deletion of their simulation records under GDPR/FERPA guidelines (`src/server/privacy.ts`).

---

## 2. Institutional Review Board (IRB) Compliance Details

- **Risk Classification**: Minimal Risk (simulated synthetic business operations with no physical, financial, or legal consequences).
- **Vulnerable Populations**: Excluded.
- **Deception**: None. All simulated scenarios and mock vendor personas are explicitly designated as synthetic.
- **Compensation**: Documented per participating cohort guidelines.

---

## 3. Data Retention & Secure Destruction

- Session telemetry is retained for 180 days for benchmark publication, then permanently anonymized into public aggregate statistics.
- Export archives can be requested via `/api/v1/privacy/export`.
