import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hostedPathPolicy } from "./server/hosted-capabilities.ts";
import { assertSameOrigin, integrationUnavailable, requestErrorResponse } from "./server/http.ts";

/** Refreshes Supabase SSR cookies when hosted credentials are configured. */
export async function proxy(request: NextRequest) {
  const hosted = process.env.WORKWORLD_MODE === "hosted";
  const policy = hosted ? hostedPathPolicy(request.nextUrl.pathname) : "public";
  if (policy === "unavailable") return integrationUnavailable("This integration");
  if (hosted && request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    try { assertSameOrigin(request); } catch (error) { return requestErrorResponse(error); }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !publishableKey) return policy === "authenticated" ? integrationUnavailable("The hosted workspace") : NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const client = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (entries) => {
        entries.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        entries.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try {
    const { data, error } = await client.auth.getClaims();
    if (policy === "authenticated" && (error || !data?.claims?.sub)) {
      if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in to continue.", code: "AUTH_REQUIRED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    if (policy === "authenticated") return integrationUnavailable("Authentication");
  }
  // Supabase refresh responses must never enter a shared CDN cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
