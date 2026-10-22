import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicConfig } from "../../../server/supabase-auth.ts";

export const dynamic = "force-dynamic";

/** Exchanges the Supabase PKCE magic-link token for cookie-backed SSR session state. */
export async function GET(request: NextRequest) {
  const config = supabasePublicConfig();
  if (!config) return NextResponse.redirect(new URL("/sign-in?error=configuration", request.url));

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || type !== "email") {
    return NextResponse.redirect(new URL("/sign-in?error=invalid_link", request.url));
  }

  let response = NextResponse.redirect(new URL("/workspace", request.url));
  const client = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (entries) => {
        entries.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error) response = NextResponse.redirect(new URL("/sign-in?error=expired_link", request.url));
  return response;
}
