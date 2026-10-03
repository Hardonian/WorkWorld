/**
 * Gold-Standard Assessor Calibration Engine (Pillar 5, Item 047).
 * Compares assessor ratings against ground-truth benchmark keys to compute calibration accuracy.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface GoldStandardKey {
  scenarioId: string;
  expectedScores: Record<string, number>; // ruleId -> expected points
  acceptableTolerance: number; // e.g. ±5 points
}

export interface AssessorSubmission {
  assessorId: string;
  scenarioId: string;
  ratings: Record<string, number>;
}

export interface CalibrationResult {
  assessorId: string;
  scenarioId: string;
  meanAbsoluteError: number;
  exactMatchCount: number;
  withinToleranceCount: number;
  totalChecks: number;
  passedCalibration: boolean; // e.g. MAE <= 5.0 and all within tolerance
}

export function evaluateAssessorCalibration(
  submission: AssessorSubmission,
  goldStandard: GoldStandardKey
): CalibrationResult {
  let totalError = 0;
  let exactCount = 0;
  let withinToleranceCount = 0;
  const ruleIds = Object.keys(goldStandard.expectedScores);

  for (const ruleId of ruleIds) {
    const expected = goldStandard.expectedScores[ruleId] ?? 0;
    const actual = submission.ratings[ruleId] ?? 0;
    const diff = Math.abs(actual - expected);

    totalError += diff;
    if (diff === 0) exactCount++;
    if (diff <= goldStandard.acceptableTolerance) withinToleranceCount++;
  }

  const meanAbsoluteError = ruleIds.length > 0 ? Number((totalError / ruleIds.length).toFixed(2)) : 0;
  const passedCalibration = meanAbsoluteError <= 5.0 && withinToleranceCount === ruleIds.length;

  return {
    assessorId: submission.assessorId,
    scenarioId: submission.scenarioId,
    meanAbsoluteError,
    exactMatchCount: exactCount,
    withinToleranceCount,
    totalChecks: ruleIds.length,
    passedCalibration,
  };
}
