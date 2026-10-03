import { describe, it, expect } from "vitest";
import { GET as ltiLoginGet } from "../src/app/api/lti/login/route.ts";
import { POST as ltiLaunchPost } from "../src/app/api/lti/launch/route.ts";
import { POST as atsWebhookPost } from "../src/app/api/webhooks/ats/route.ts";

describe("LTI 1.3 & ATS HTTP Integration Routes (Tier 4)", () => {
  it("generates OIDC redirect on valid LTI login initiation", async () => {
    const req = new Request("http://localhost:3100/api/lti/login?iss=https://canvas.example.edu&login_hint=user_42");
    const res = await ltiLoginGet(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("redirect_ready");
    expect(data.redirectUrl).toContain("https://canvas.example.edu/api/lti/authorize_redirect");
    expect(data.redirectUrl).toContain("login_hint=user_42");
  });

  it("rejects LTI login request with missing parameters", async () => {
    const req = new Request("http://localhost:3100/api/lti/login");
    const res = await ltiLoginGet(req);
    expect(res.status).toBe(400);
  });

  it("processes valid LTI launch and returns authenticated context", async () => {
    const form = new FormData();
    form.append("id_token", "valid_mock_jwt");
    form.append("state", "state_12345");

    const req = new Request("http://localhost:3100/api/lti/launch", {
      method: "POST",
      body: form,
    });

    const res = await ltiLaunchPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("authenticated");
    expect(data.courseCode).toBe("OPS-401");
  });

  it("processes inbound ATS candidate webhook and creates invitation", async () => {
    const payload = {
      action: "candidate_stage_change",
      scenarioId: "B1",
      candidate: {
        candidateId: "CAND-99",
        firstName: "Alex",
        lastName: "Morgan",
        email: "alex.morgan@example.com",
        jobId: "JOB-2026",
        jobTitle: "Supply Chain Manager",
        atsSystem: "greenhouse",
      },
    };

    const req = new Request("http://localhost:3100/api/webhooks/ats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await atsWebhookPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.action).toBe("invitation_created");
    expect(data.invitation.assignedScenarioId).toBe("B1");
    expect(data.invitation.assessmentUrl).toContain("token=ats_");
  });
});
