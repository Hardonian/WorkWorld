/** These adapters still have local/fixture persistence and cannot accept hosted traffic. */
const unavailable = [
  "/api/billing/checkout", "/api/billing/subscription", "/api/webhooks/",
  "/api/lti/", "/api/assist", "/api/agents/", "/api/mcp", "/api/metrics",
  "/api/v1/scenarios/forge", "/api/v1/evaluations",
];

export function hostedPathPolicy(path: string): "unavailable" | "authenticated" | "public" {
  if (unavailable.some((prefix) => path === prefix || (prefix.endsWith("/") ? path.startsWith(prefix) : path.startsWith(`${prefix}/`)))) return "unavailable";
  if (["/workspace", "/assessor", "/api/episodes", "/api/actions", "/api/session", "/api/assessor", "/api/index/certifications", "/api/v1/actions", "/api/v1/episodes"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return "authenticated";
  return "public";
}
