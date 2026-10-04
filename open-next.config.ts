import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext config: turns WorkWorld (Next.js SSR) into a Cloudflare Worker + assets
// for global-edge delivery vs the single self-hosted Docker box.
//
// NOTE: WorkWorld is DB-blocked (its own B1 — no hosted Supabase). An edge deploy
// needs a REACHABLE Postgres (Hyperdrive / Neon / hosted Supabase) or DB calls
// fail. This config makes the app build/deploy-ready; the live deploy should wait
// for the hosted DB. See deploy/cloudflare/MIGRATION.md.
export default defineCloudflareConfig();
