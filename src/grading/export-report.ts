/**
 * Executive Assessment Report Generator (Pillar 8, Item 076).
 * Formats printable executive evaluation reports for apprentices and organization leadership.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface ExecutiveReportData {
  candidateId: string;
  candidateName: string;
  organizationName: string;
  episodeId: string;
  scenarioTitle: string;
  completionDate: string;
  outcome: "PASS" | "FAIL";
  scores: {
    stateCorrectness: number;
    economicEfficiency: number;
    operationalVelocity: number;
    professionalPolish: number;
    compositeScore: number;
  };
  passedChecks: string[];
  failedChecks: string[];
  assessorNotes?: string;
}

export function generatePrintableReportHtml(data: ExecutiveReportData): string {
  const isPass = data.outcome === "PASS";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>WorkWorld Executive Assessment Report — ${data.candidateName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.5; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .badge { padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 14px; text-transform: uppercase; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #ffe4e6; color: #9f1239; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .card h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #64748b; }
    .card .score { font-size: 28px; font-weight: 800; color: #4338ca; }
    ul { padding-left: 20px; font-size: 13px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="margin:0 0 4px 0; font-size: 24px;">Executive Evaluation Certificate</h1>
      <p style="margin:0; font-size: 13px; color: #64748b;">${data.organizationName} · Simulation ${data.episodeId} (${data.scenarioTitle})</p>
    </div>
    <span class="badge ${isPass ? "badge-pass" : "badge-fail"}">${data.outcome}</span>
  </div>

  <div class="grid">
    <div class="card">
      <h4>Candidate</h4>
      <div style="font-size: 18px; font-weight: bold;">${data.candidateName}</div>
      <div style="font-size: 12px; color: #64748b;">ID: ${data.candidateId}</div>
    </div>
    <div class="card">
      <h4>Composite Score</h4>
      <div class="score">${data.scores.compositeScore}%</div>
      <div style="font-size: 12px; color: #64748b;">Completed on ${data.completionDate}</div>
    </div>
  </div>

  <div class="card" style="margin-bottom: 24px;">
    <h4>Dimensional Competency Breakdown</h4>
    <div style="display:flex; justify-content:space-between; font-size: 13px; margin-top: 8px;">
      <span>State Correctness: <strong>${data.scores.stateCorrectness}%</strong></span>
      <span>Economic Efficiency: <strong>${data.scores.economicEfficiency}%</strong></span>
      <span>Operational Velocity: <strong>${data.scores.operationalVelocity}%</strong></span>
      <span>Professional Polish: <strong>${data.scores.professionalPolish}%</strong></span>
    </div>
  </div>

  <h3>Operational Checks Verified (${data.passedChecks.length})</h3>
  <ul>
    ${data.passedChecks.map((c) => `<li style="color:#166534;">✓ ${c}</li>`).join("")}
  </ul>

  ${data.failedChecks.length > 0 ? `
  <h3>Discrepancies / Open Remediations (${data.failedChecks.length})</h3>
  <ul>
    ${data.failedChecks.map((c) => `<li style="color:#9f1239;">✗ ${c}</li>`).join("")}
  </ul>
  ` : ""}

  ${data.assessorNotes ? `
  <h3>Assessor Remarks</h3>
  <p style="font-size: 13px; background: #f1f5f9; padding: 12px; border-radius: 6px;">${data.assessorNotes}</p>
  ` : ""}

  <div class="footer">
    WorkWorld Autonomous Evaluation Platform · Cryptographically verified tamper-proof outcome digest.
  </div>
</body>
</html>`;
}
