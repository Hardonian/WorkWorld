import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createHostedAuthClient, getHostedIdentity } from "../../../../server/supabase-auth.ts";
import { apiBoundary, assertSameOrigin, readJsonObject, RequestError } from "../../../../server/http.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiBoundary(async () => NextResponse.json({ user: await getHostedIdentity() }, { headers: { "Cache-Control": "no-store" } }));
export const POST = apiBoundary(async (request: NextRequest) => {
  const body = await readJsonObject(request, 8_192);
  if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 320 || body.password.length > 1024) throw new RequestError("Enter your email and password.", 400, "PAYLOAD_INVALID");
  const client = await createHostedAuthClient(true);
  const { error } = await client.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
  if (error) throw new RequestError("Unable to sign in. Check your credentials and confirm your invitation.", error.status === 429 ? 429 : 401, "SIGN_IN_FAILED");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
});
export const DELETE = apiBoundary(async (request: NextRequest) => {
  assertSameOrigin(request);
  const client = await createHostedAuthClient(true);
  const { error } = await client.auth.signOut();
  if (error) throw new RequestError("Sign out is temporarily unavailable.", 503, "AUTH_UNAVAILABLE");
  (await cookies()).delete("ww_session");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
});
