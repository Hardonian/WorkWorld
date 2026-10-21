import { NextResponse } from "next/server";
import { getPublicRun } from "../../../../../index/registry.ts";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = getPublicRun(runId);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json({
    schema: "workworld-index/evidence@1",
    public: true,
    run,
    replay: {
      command: "npm run eval -- --adapter baseline --scenarios A1,A2,B1,B2,C1,C2 --seeds 42",
      note: "The command reproduces the scripted baseline control. Public model comparison rows are added only after their full manifests are published.",
    },
  }, { headers: { "Content-Disposition": `attachment; filename=workworld-index-${run.id}.json` } });
}
