import { NextResponse } from "next/server";

export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

/** Reject cross-site state changes even if a browser or proxy relaxes cookie policy. */
export function assertSameOrigin(request: Request): void {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new RequestError("cross-site request rejected", 403, "ORIGIN_REJECTED");
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new RequestError("request origin does not match this service", 403, "ORIGIN_REJECTED");
  }
}

/** Parse a bounded JSON object; arrays and primitives are never valid API payloads. */
export async function readJsonObject(
  request: Request,
  maxBytes = 64 * 1024,
  options: { sameOrigin?: boolean } = {},
): Promise<Record<string, unknown>> {
  if (options.sameOrigin !== false) assertSameOrigin(request);
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType !== "application/json") {
    throw new RequestError("content-type must be application/json", 415, "CONTENT_TYPE_INVALID");
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > maxBytes) {
    throw new RequestError("request body is too large", 413, "PAYLOAD_TOO_LARGE");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new RequestError("request body is too large", 413, "PAYLOAD_TOO_LARGE");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RequestError("invalid JSON body", 400, "PAYLOAD_INVALID");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RequestError("JSON body must be an object", 400, "PAYLOAD_INVALID");
  }
  return parsed as Record<string, unknown>;
}

export function requestErrorResponse(error: unknown): NextResponse {
  if (error instanceof RequestError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  throw error;
}
