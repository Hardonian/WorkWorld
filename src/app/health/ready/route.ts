import { NextResponse } from "next/server";
import { getStore } from "../../../server/store.ts";
import { hostedModeAvailable } from "../../../server/session.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = process.env.WORKWORLD_MODE ?? "demo";
  if (mode === "hosted") {
    const hosted = hostedModeAvailable();
    return NextResponse.json(
      { status: "not_ready", service: "workworld", mode, reason: hosted.reason },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
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
