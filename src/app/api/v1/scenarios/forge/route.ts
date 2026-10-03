import { NextResponse } from "next/server";
import { ScenarioForge, type ScenarioForgePrompt } from "../../../../../scenarios/forge.ts";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body: ScenarioForgePrompt = await req.json();

    if (!body.crisisType) {
      return NextResponse.json(
        { ok: false, error: "crisisType is required" },
        { status: 400 }
      );
    }

    const scenario = ScenarioForge.compile(body, "A1");

    return NextResponse.json({
      ok: true,
      scenario,
      validation: {
        allValid: true,
        summary: `Successfully forged scenario: ${scenario.title}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to compile scenario" },
      { status: 500 }
    );
  }
}
