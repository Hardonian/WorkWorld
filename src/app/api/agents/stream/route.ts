import { createTelemetryEvent, formatSseMessage } from "../../../../agents/telemetry-stream.ts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get("runId") || "demo-run";

  const stream = new ReadableStream({
    start(controller) {
      const initialEvent = createTelemetryEvent(runId, 0, "agent_thought", {
        thought: "Initializing WorkWorld agent telemetry stream...",
      });
      controller.enqueue(new TextEncoder().encode(formatSseMessage(initialEvent)));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
