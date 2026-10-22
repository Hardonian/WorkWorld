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

export function apiBoundary<T extends Request>(handler: (request: T) => Promise<Response>) {
  return async (request: T): Promise<Response> => {
    try { return await handler(request); }
    catch (error) { return requestErrorResponse(error); }
  };
}

export function integrationUnavailable(integration: string): NextResponse {
  return NextResponse.json({ error: `${integration} is not enabled for hosted use.`, code: "INTEGRATION_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
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
  if (error instanceof Error && error.name === "OrganizationMembershipRequiredError") {
    return NextResponse.json({ error: "Your account needs a participant membership. Contact your workspace administrator.", code: "MEMBERSHIP_REQUIRED" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const databaseCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (databaseCode === "42501") return NextResponse.json({ error: "Your membership does not permit this operation.", code: "FORBIDDEN" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (["22P02", "23514"].includes(databaseCode)) return NextResponse.json({ error: "The supplied data is invalid.", code: "PAYLOAD_INVALID" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  if (databaseCode === "23505") return NextResponse.json({ error: "The record has changed. Reload and try again.", code: "WRITE_CONFLICT" }, { status: 409, headers: { "Cache-Control": "no-store" } });
  // Retain an operational signal without logging database URLs or payloads.
  const incidentId = crypto.randomUUID();
  console.error("WorkWorld request failed", { incidentId, kind: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: "The service is temporarily unavailable. Please try again.", code: "SERVICE_UNAVAILABLE", incidentId }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" } });
}
