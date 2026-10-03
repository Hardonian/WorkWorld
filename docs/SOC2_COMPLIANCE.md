# WorkWorld — SOC 2 Type II Security & Compliance Specification

Document Version: 1.0.0
Last Audit Date: 2026-10-02
Trust Services Criteria: Security, Confidentiality, Processing Integrity

---

## 1. System Scope & Security Architecture

WorkWorld is an executable professional-work simulation and assessment platform. All candidate submissions, model prompts, and simulation states are governed by zero-trust boundaries:

1. **Network Isolation**: All web and API traffic terminates via TLS 1.3 with strict HSTS (`max-age=63072000; includeSubDomains; preload`).
2. **Data in Transit**: Strong cipher suites with Perfect Forward Secrecy (PFS).
3. **Data at Rest**: PostgreSQL disk volumes encrypted with AES-256 (KMS-managed keys).
4. **Tenant Isolation**: Multi-tenant database enforcement via PostgreSQL Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Verified by automated tests (`tests/db/rls.test.ts`).

---

## 2. Access Control & Role-Based Access (RBAC)

The platform enforces a five-tier RBAC matrix (`src/server/rbac.ts`):
- `viewer`: Read-only access to published dashboards and certificates.
- `learner`: Can start assigned episodes and execute simulation actions.
- `assessor`: Can view double-blind evaluation queues and submit rubric ratings.
- `org_admin`: Can manage cohort enrollments, issue invitations, and view cohort analytics.
- `super_admin`: System-level maintenance, API key revocation, and audit log inspection.

---

## 3. Cryptographic Audit Logging (CC6.8)

Every administrative and operational mutation produces an immutable SHA-256 hash-chained log entry (`src/server/audit.ts`).
- Each log block contains `prevHash`, `payloadDigest`, `actorId`, and `timestamp`.
- Modification of any historical log entry immediately breaks cryptographic chain validation.

---

## 4. Processing Integrity & Input Sanitization (PI1.2)

- **Formula Injection Shield**: CSV exports and workbook cell inputs are sanitized to neutralize formula execution vectors (`=`, `+`, `-`, `@`).
- **Prompt Injection Perimeter**: Inbound messages from external and synthetic suppliers are analyzed (`src/agents/security.ts`) to detect delimiter breakouts and prompt overrides.
- **Strict Invariant Verification**: All domain mutations are constrained by double-entry ledger equality and non-negative inventory rules (`src/domain/invariants.ts`).

---

## 5. Disaster Recovery & Incident Response

- Automated point-in-time database backups (`scripts/backup-db.sh`) with SHA-256 checksum verification.
- Recovery Time Objective (RTO): < 1 hour.
- Recovery Point Objective (RPO): < 15 minutes.
