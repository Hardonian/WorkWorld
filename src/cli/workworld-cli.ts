/**
 * WorkWorld Developer CLI Tool (Pillar 7, Item 068).
 * Command-line utility for local evaluations, environment diagnostics, and MCP inspection.
 */

import { listScenarios } from "../scenarios/catalog.ts";
import { runDoctor } from "../../scripts/doctor.ts";
import { lintScenarioCatalog } from "../../scripts/lint-scenarios.ts";

export async function runCli(args: string[]): Promise<number> {
  const command = args[0] || "help";

  switch (command) {
    case "list": {
      const scenarios = listScenarios();
      console.log(`Available WorkWorld Scenarios (${scenarios.length}):`);
      for (const s of scenarios) {
        console.log(`  - [${s.id}] ${s.title} (${s.family})`);
      }
      return 0;
    }

    case "doctor": {
      console.log("Running WorkWorld environment diagnostics...");
      const result = await runDoctor();
      return result.ok ? 0 : 1;
    }

    case "lint": {
      console.log("Linting scenario catalog...");
      const result = lintScenarioCatalog();
      console.log(`Scenarios checked: ${result.totalChecked}, Valid: ${result.allValid}`);
      return result.allValid ? 0 : 1;
    }

    case "help":
    default: {
      console.log(`WorkWorld Developer CLI (workworld-cli)
Usage:
  workworld-cli list       List all available simulation scenarios
  workworld-cli doctor     Run environment and dependency diagnostics
  workworld-cli lint       Lint scenario catalog and verify DAG invariants
  workworld-cli help       Display this command reference
`);
      return 0;
    }
  }
}

if (typeof process !== "undefined" && process.argv[1]?.includes("workworld-cli")) {
  runCli(process.argv.slice(2)).then((code) => process.exit(code));
}
