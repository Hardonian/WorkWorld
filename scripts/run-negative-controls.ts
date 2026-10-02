#!/usr/bin/env tsx
/**
 * Negative-control evidence run (FIXTURE actors — not models).
 * Each control must fail for its stated reason and no other.
 * Usage: npm run negatives [-- --json out.json]
 */
import { writeFileSync } from "node:fs";
import { runNegativeControls } from "../src/grading/negative-controls.ts";

const jsonIdx = process.argv.indexOf("--json");
const outPath = jsonIdx >= 0 ? process.argv[jsonIdx + 1] : null;

const results = runNegativeControls();
let failed = 0;

for (const r of results) {
  if (!r.correct) failed += 1;
  console.log(
    `${r.id} ${r.correct ? "OK " : "BAD"} expected=[${r.expectedFailing.join(",")}] actual=[${r.actualFailing.join(",")}] — ${r.title}`,
  );
}

console.log(
  `\nnegative controls: ${results.length - failed}/${results.length} detected for the right reasons`,
);
if (outPath) {
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        kind: "negative-control-fixture-run",
        results: results.map((r) => ({
          id: r.id,
          title: r.title,
          expectedFailing: r.expectedFailing,
          actualFailing: r.actualFailing,
          correct: r.correct,
          stateDigest: r.report.stateDigest,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`wrote ${outPath}`);
}
process.exit(failed === 0 ? 0 : 1);
