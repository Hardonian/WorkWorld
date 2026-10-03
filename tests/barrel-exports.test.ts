import { describe, it, expect } from "vitest";
import * as Domain from "../src/domain/index.ts";
import * as Server from "../src/server/index.ts";
import * as Grading from "../src/grading/index.ts";
import * as Scenarios from "../src/scenarios/index.ts";
import * as Agents from "../src/agents/index.ts";

describe("Architecture & Code Quality: Unified Barrel Exports", () => {
  it("exports all core simulation domain primitives and engines", () => {
    expect(Domain.EpisodeEngine).toBeDefined();
    expect(Domain.applyAction).toBeDefined();
    expect(Domain.buildObservation).toBeDefined();
    expect(Domain.verifyDomainInvariants).toBeDefined();
    expect(Domain.performThreeWayMatch).toBeDefined();
    expect(Domain.evaluateInventoryHealth).toBeDefined();
    expect(Domain.generateDebitMemo).toBeDefined();
    expect(Domain.convertCurrency).toBeDefined();
    expect(Domain.calculateSupplierScorecard).toBeDefined();
    expect(Domain.WarehouseManager).toBeDefined();
    expect(Domain.AccrualEngine).toBeDefined();
    expect(Domain.RmaManager).toBeDefined();
    expect(Domain.LogisticsEngine).toBeDefined();
    expect(Domain.ErpImporter).toBeDefined();
    expect(Domain.VoiceCallEngine).toBeDefined();
    expect(Domain.evaluateFormulaSafe).toBeDefined();
  });

  it("exports all server, security, and multi-tenant services", () => {
    expect(Server.getStore).toBeDefined();
    expect(Server.AuditLogService).toBeDefined();
    expect(Server.authorizeRole).toBeDefined();
    expect(Server.TokenBucketRateLimiter).toBeDefined();
    expect(Server.WebhookDispatcher).toBeDefined();
    expect(Server.McpServer).toBeDefined();
    expect(Server.SamlProvider).toBeDefined();
    expect(Server.generateApiKey).toBeDefined();
    expect(Server.OrganizationManager).toBeDefined();
    expect(Server.InvitationManager).toBeDefined();
    expect(Server.SessionManager).toBeDefined();
    expect(Server.LtiProvider).toBeDefined();
    expect(Server.AtsIntegrationHub).toBeDefined();
    expect(Server.MultiplayerWarRoom).toBeDefined();
    expect(Server.AgentSafetyCertification).toBeDefined();
  });

  it("exports all grading, rubric, and calibration modules", () => {
    expect(Grading.gradeEpisode).toBeDefined();
    expect(Grading.runBaseline).toBeDefined();
    expect(Grading.buildJudgePrompt).toBeDefined();
    expect(Grading.generateEvaluationManifest).toBeDefined();
    expect(Grading.DoubleBlindQueue).toBeDefined();
    expect(Grading.calculateActionPathDistance).toBeDefined();
    expect(Grading.calculatePartialCredit).toBeDefined();
    expect(Grading.calculateAssessorAgreement).toBeDefined();
    expect(Grading.generateSkillDiagnostics).toBeDefined();
    expect(Grading.exportAssessmentReport).toBeDefined();
    expect(Grading.calculateTokenEconomics).toBeDefined();
  });

  it("exports all scenario catalog, compiler, and DSL builders", () => {
    expect(Scenarios.getScenario).toBeDefined();
    expect(Scenarios.listScenarios).toBeDefined();
    expect(Scenarios.SCENARIOS).toBeDefined();
    expect(Scenarios.ScenarioForge).toBeDefined();
    expect(Scenarios.ScenarioBuilder).toBeDefined();
    expect(Scenarios.generateStochasticScenario).toBeDefined();
    expect(Scenarios.applyDifficultyPreset).toBeDefined();
  });

  it("exports all frontier agent runtime, loop, and budget utilities", () => {
    expect(Agents.runAgentEpisode).toBeDefined();
    expect(Agents.buildMessages).toBeDefined();
    expect(Agents.BudgetLedger).toBeDefined();
    expect(Agents.summarizeTrajectory).toBeDefined();
    expect(Agents.MultiProviderHub).toBeDefined();
    expect(Agents.MultiAgentCoordinator).toBeDefined();
    expect(Agents.ApprovalQueue).toBeDefined();
    expect(Agents.BenchmarkArena).toBeDefined();
    expect(Agents.scanPromptSecurity).toBeDefined();
  });
});
