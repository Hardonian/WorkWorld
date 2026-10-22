import type { AssessmentDocument } from "./assessments.ts";
import type { RubricRating, RubricRecord } from "../grading/report.ts";
import { PostgresStore } from "./store-postgres.ts";
import { storeForRequest } from "./session.ts";
import { getHostedIdentity } from "./supabase-auth.ts";
import { RequestError } from "./http.ts";

export async function hostedAssessmentStore(): Promise<PostgresStore> {
  const store = await storeForRequest();
  if (!(store instanceof PostgresStore)) throw new RequestError("Hosted assessment storage is unavailable.", 503, "HOSTED_UNAVAILABLE");
  return store;
}

export async function loadHostedAssessment(store: PostgresStore, runId: string): Promise<AssessmentDocument> {
  return store.withClient(async (client) => {
    const result = await client.query<{ assessor_id: string; ratings: RubricRating[]; comment: string; created_at: Date }>("select assessor_id, ratings, comment, created_at from workworld.assessments where run_id=$1 order by revision", [runId]);
    const revisions: RubricRecord[] = result.rows.map((row) => ({ assessor: row.assessor_id, ratings: row.ratings, comment: row.comment, ratedAt: new Date(row.created_at).toISOString() }));
    return { runId, revisions };
  });
}

export async function appendHostedAssessment(store: PostgresStore, runId: string, ratings: RubricRating[], comment: string): Promise<number> {
  const identity = await getHostedIdentity();
  if (!identity) throw new RequestError("Sign in to record a judgment.", 401, "AUTH_REQUIRED");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId)) throw new RequestError("Select a valid run.", 400, "PAYLOAD_INVALID");
  return store.withRunTransaction(runId, async () => store.withClient(async (client) => {
    const result = await client.query<{ revision: number }>(`insert into workworld.assessments (run_id, assessor_id, revision, ratings, comment)
      select $1,$2,coalesce(max(revision),0)+1,$3::jsonb,$4 from workworld.assessments where run_id=$1 returning revision`, [runId, identity.userId, JSON.stringify(ratings), comment]);
    return result.rows[0]!.revision;
  }));
}
