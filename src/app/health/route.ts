import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health/readiness endpoint. Reports only non-sensitive runtime facts.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "workworld",
      mode: process.env.WORKWORLD_MODE ?? "demo",
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
