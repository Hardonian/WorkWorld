import { NextResponse } from "next/server";
import { listScenarios } from "../../../scenarios/catalog.ts";
import { rateLimiter } from "../../../server/rate-limiter.ts";

/**
 * Prometheus text format metrics exporter.
 * Endpoint: /api/metrics
 */
export async function GET() {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const scenarios = listScenarios();

  const metrics: string[] = [
    `# HELP workworld_uptime_seconds Total seconds the WorkWorld process has been running.`,
    `# TYPE workworld_uptime_seconds counter`,
    `workworld_uptime_seconds ${uptime.toFixed(2)}`,
    ``,
    `# HELP workworld_memory_heap_used_bytes V8 heap bytes currently used.`,
    `# TYPE workworld_memory_heap_used_bytes gauge`,
    `workworld_memory_heap_used_bytes ${mem.heapUsed}`,
    ``,
    `# HELP workworld_memory_heap_total_bytes V8 heap total allocated bytes.`,
    `# TYPE workworld_memory_heap_total_bytes gauge`,
    `workworld_memory_heap_total_bytes ${mem.heapTotal}`,
    ``,
    `# HELP workworld_memory_rss_bytes Resident set size in bytes.`,
    `# TYPE workworld_memory_rss_bytes gauge`,
    `workworld_memory_rss_bytes ${mem.rss}`,
    ``,
    `# HELP workworld_scenarios_total Total number of authored public simulation scenarios.`,
    `# TYPE workworld_scenarios_total gauge`,
    `workworld_scenarios_total ${scenarios.length}`,
    ``,
    `# HELP workworld_rate_limiter_active_buckets Number of active rate-limited client buckets.`,
    `# TYPE workworld_rate_limiter_active_buckets gauge`,
    `workworld_rate_limiter_active_buckets ${rateLimiter.getActiveBucketsCount()}`,
    ``,
    `# HELP workworld_info Process and version build metadata.`,
    `# TYPE workworld_info gauge`,
    `workworld_info{version="0.1.0",node="${process.version}"} 1`,
    ``,
  ];

  return new NextResponse(metrics.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
