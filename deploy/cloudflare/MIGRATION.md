# WorkWorld → Cloudflare (cost + latency)

## Why
WorkWorld today: Next.js self-hosted via Docker on a single host (port 3100) + Postgres, and
~21 MB of artifacts (`evidence-exports/` 15M, `evidence/` 3.2M, `var/` 2.6M, `eval-runs/`,
`materials/`) served/downloaded from that one box.

Two Cloudflare moves cut both cost and latency:

1. **Artifacts → R2** (zero egress). Every `evidence-exports` download today costs egress off
   your host; R2 charges $0 egress. Big cost win for a product whose deliverables are file exports.
2. **Frontend → Cloudflare Pages / CDN** (global edge). One Docker box = one region. Pages/CDN
   serves from 300+ PoPs, cutting latency worldwide and offloading the box.

Postgres stays the source of truth. Read-heavy lookups can later move to KV/D1 + Cache to shield it.

## 1) R2 for exports (do this first — lowest effort, clearest win)

```bash
npx wrangler r2 bucket create workworld-exports          # zero-egress bucket
# grant the app an access key / use the Workers R2 binding (below)
```

`deploy/cloudflare/wrangler.toml` binds R2 as `EXPORTS`. Change the app to write `evidence-exports/`
+ `eval-runs/` output to the R2 bucket (via the binding or the S3-compatible API) instead of local
disk. Keep local `evidence/` for internal review; publish only what clients download to R2.

Verify (never trust "uploaded" alone):
```bash
npx wrangler r2 object get workworld-exports/<key> --file /tmp/check   # then confirm it downloads
```

## 2) Frontend → Cloudflare Pages

WorkWorld is full-stack Next.js (SSR + Postgres), so Pages needs an adapter — use **OpenNext**
(`@opennextjs/cloudflare`) or `@cloudflare/next-on-pages` to emit a Worker + static assets. Plain
`wrangler pages deploy` only works for static export.

```bash
npm i -D @opennextjs/cloudflare
npx opennextjs-cloudflare build && npx wrangler deploy    # Worker + assets at the edge
# OR for a mostly-static frontend:
npx wrangler pages deploy out --project-name workworld
```

If the SSR + Postgres path is too big a lift right now, the cheap interim win is to put the
**Cloudflare CDN/proxy** in front of the existing Docker host (orange-cloud the DNS record): edge
caching + TLS + HTTP/3 for free, no code change.

## Latency check
```bash
curl -sS -o /dev/null -w '%{http_code} %{time_total}s\n' https://<your-host>/health
# compare before/after CDN or Pages; expect lower time_total from non-origin regions
```

## Honest notes
- Postgres must be reachable from wherever the SSR runs (Neon/Supabase/Hyperdrive for edge).
- R2 meters storage + operations (not egress) — model those.
- Full SSR→edge is a real migration; the R2 + CDN steps above are safe, quick wins first.
