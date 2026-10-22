import { NextResponse, type NextRequest } from "next/server";
import { createHostedAuthClient } from "../../../server/supabase-auth.ts";
import { apiBoundary } from "../../../server/http.ts";

export const GET = apiBoundary(async (request: NextRequest) => {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await createHostedAuthClient(true);
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/workspace", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
});
