export interface RoiModelInput {
  monthlyWorkflowVolume: number;
  minutesPerWorkflow: number;
  loadedHourlyRateUsd: number;
  agentCompletionRatePct: number;
  humanInterventionRatePct: number;
  minutesPerIntervention: number;
  agentCostPerRunUsd: number;
  preventableFailureRatePct: number;
  costPerPreventedFailureUsd: number;
  platformMonthlyCostUsd: number;
}

export interface RoiModelResult {
  modeledMonthlyLaborBaselineUsd: number;
  modeledMonthlyAgentCostUsd: number;
  modeledMonthlyHumanOversightUsd: number;
  modeledMonthlyAvoidedFailureUsd: number;
  modeledMonthlyNetBenefitUsd: number;
  modeledAnnualNetBenefitUsd: number;
  modeledRoiPct: number | null;
  breakEvenCompletedWorkflows: number | null;
  claimLimits: string;
}

const percent = (value: number, name: string) => {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${name} must be between 0 and 100`);
  return value / 100;
};
const nonNegative = (value: number, name: string) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number`);
  return value;
};
const money = (value: number) => Number(value.toFixed(2));

/** A transparent planning model, not a savings promise or performance claim. */
export function modelWorkflowRoi(input: RoiModelInput): RoiModelResult {
  const volume = nonNegative(input.monthlyWorkflowVolume, "monthlyWorkflowVolume");
  const laborMinutes = nonNegative(input.minutesPerWorkflow, "minutesPerWorkflow");
  const rate = nonNegative(input.loadedHourlyRateUsd, "loadedHourlyRateUsd");
  const completion = percent(input.agentCompletionRatePct, "agentCompletionRatePct");
  const intervention = percent(input.humanInterventionRatePct, "humanInterventionRatePct");
  const interventionMinutes = nonNegative(input.minutesPerIntervention, "minutesPerIntervention");
  const costPerRun = nonNegative(input.agentCostPerRunUsd, "agentCostPerRunUsd");
  const preventedFailure = percent(input.preventableFailureRatePct, "preventableFailureRatePct");
  const failureCost = nonNegative(input.costPerPreventedFailureUsd, "costPerPreventedFailureUsd");
  const platformCost = nonNegative(input.platformMonthlyCostUsd, "platformMonthlyCostUsd");

  const hourlyLabor = rate;
  const baseline = volume * (laborMinutes / 60) * hourlyLabor;
  const completed = volume * completion;
  const agentCost = volume * costPerRun;
  const oversight = completed * intervention * (interventionMinutes / 60) * hourlyLabor;
  const avoidedFailures = completed * preventedFailure * failureCost;
  const netBenefit = baseline + avoidedFailures - agentCost - oversight - platformCost;
  const investment = agentCost + oversight + platformCost;
  const contributionPerCompletedWorkflow = (laborMinutes / 60) * hourlyLabor + preventedFailure * failureCost - costPerRun - intervention * (interventionMinutes / 60) * hourlyLabor;

  return {
    modeledMonthlyLaborBaselineUsd: money(baseline),
    modeledMonthlyAgentCostUsd: money(agentCost),
    modeledMonthlyHumanOversightUsd: money(oversight),
    modeledMonthlyAvoidedFailureUsd: money(avoidedFailures),
    modeledMonthlyNetBenefitUsd: money(netBenefit),
    modeledAnnualNetBenefitUsd: money(netBenefit * 12),
    modeledRoiPct: investment === 0 ? null : money((netBenefit / investment) * 100),
    breakEvenCompletedWorkflows: contributionPerCompletedWorkflow > 0 ? Math.ceil(platformCost / contributionPerCompletedWorkflow) : null,
    claimLimits: "Modeled from your inputs. It is not a forecast, savings guarantee, or substitute for measured pilot outcomes.",
  };
}
