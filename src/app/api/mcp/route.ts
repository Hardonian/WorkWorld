import { NextResponse } from "next/server";
import { handleMcpRequest } from "../../../server/mcp.ts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await handleMcpRequest(body);
    return NextResponse.json(response);
  } catch (err: unknown) {
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
    status: "ok",
    service: "workworld-mcp",
    spec: "Model Context Protocol (JSON-RPC 2.0)",
    endpoint: "/api/mcp",
  });
}
