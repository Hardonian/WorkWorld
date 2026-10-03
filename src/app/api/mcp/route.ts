import { NextResponse } from "next/server";
import { handleMcpRequest } from "../../../server/mcp.ts";
import { readJsonObject, RequestError, requestErrorResponse } from "../../../server/http.ts";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 64 * 1024, { sameOrigin: false });
    const response = await handleMcpRequest(body as Parameters<typeof handleMcpRequest>[0]);
    return NextResponse.json(response);
  } catch (err: unknown) {
    if (err instanceof RequestError) return requestErrorResponse(err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "preview",
    service: "workworld-mcp",
    spec: "Experimental JSON-RPC tool subset",
    endpoint: "/api/mcp",
  });
}
