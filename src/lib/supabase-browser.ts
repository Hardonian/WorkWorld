"use client";

import { createBrowserClient, type SupabaseClient } from "@supabase/ssr";

let client: SupabaseClient | null = null;

/** Returns the browser client only when the public hosted configuration exists. */
export function getBrowserSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  client ??= createBrowserClient(url, publishableKey);
  return client;
}
