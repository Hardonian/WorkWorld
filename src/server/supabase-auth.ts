/**
 * Optional Supabase SSR identity boundary.
 *
 * This is intentionally inert in local/demo mode. It uses cookie-backed SSR
 * sessions and exposes only verified claims to server code; service-role keys
 * are never sent to the browser.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabasePublicConfig(): { url: string; publishableKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  return url && publishableKey ? { url, publishableKey } : null;
}

export async function getHostedIdentity(): Promise<{ userId: string; email: string | null } | null> {
  const config = supabasePublicConfig();
  if (!config) return null;
  const jar = await cookies();
  const client = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => jar.getAll(),
      // Server Components cannot update cookies. src/proxy.ts refreshes them.
      setAll: () => undefined,
    },
  });
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { userId: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
}
