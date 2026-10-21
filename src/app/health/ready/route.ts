import { NextResponse } from "next/server";
import { getStore } from "../../../server/store.ts";
import { PostgresStore } from "../../../server/store-postgres.ts";
import { hostedModeAvailable } from "../../../server/session.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = process.env.WORKWORLD_MODE ?? "demo";
  if (mode === "hosted") {
    const hosted = hostedModeAvailable();
    if (!hosted.available) {
      return NextResponse.json(
        { status: "not_ready", service: "workworld", mode, reason: hosted.reason },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    // Do not instantiate an unscoped EventStore just to probe readiness. A
    // hosted request store requires a verified end-user identity; this probe
    // only verifies database reachability and reads no tenant data.
    try {
      await PostgresStore.checkConnection(process.env.DATABASE_URL);
      return NextResponse.json(
        { status: "ready", service: "workworld", mode, store: "postgres" },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (e) {
      return NextResponse.json(
        {
          status: "not_ready",
          service: "workworld",
          mode,
          reason: `hosted store unavailable: ${(e as Error).message}`,
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  try {
    await getStore().listRuns();
    return NextResponse.json(
      { status: "ready", service: "workworld", mode, store: process.env.WORKWORLD_STORE ?? "file" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "not_ready", service: "workworld", mode, reason: "demo store unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
