-- 0002_readiness_indexes.sql — production-readiness pass (2026-10-02).
-- FK-supporting indexes for the workworld schema (slow joins and ON DELETE
-- checks otherwise seq-scan). Idempotent. The hosted database received the
-- same DDL with CREATE INDEX CONCURRENTLY on 2026-10-02.

CREATE INDEX IF NOT EXISTS idx_assessments_assessor_id ON workworld.assessments(assessor_id);
CREATE INDEX IF NOT EXISTS idx_assessments_superseded_by ON workworld.assessments(superseded_by);
CREATE INDEX IF NOT EXISTS idx_assignments_assessor_id ON workworld.assignments(assessor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_org_id ON workworld.assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_episode_runs_org_id ON workworld.episode_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_episode_runs_participant_id ON workworld.episode_runs(participant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON workworld.memberships(user_id);
