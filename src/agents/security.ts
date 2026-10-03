/**
 * Prompt Injection Defense & Input Sanitizer (Pillar 4, Item 040).
 * Protects autonomous AI agents against indirect prompt injection in simulated emails,
 * invoice memos, and supplier notes.
 * Pure domain logic: zero React/Next.js dependencies.
 */

const SUSPICIOUS_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /disregard (all )?(prior|above) (instructions|directives)/i,
  /you are now (in )?(DAN|jailbreak|developer) mode/i,
  /new instruction:/i,
  /system prompt override/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /### Instruction:/i,
];

export interface ThreatAnalysisResult {
  isSafe: boolean;
  threatLevel: "none" | "low" | "medium" | "high";
  detectedPatterns: string[];
  sanitizedText: string;
}

export function analyzeUntrustedText(text: string): ThreatAnalysisResult {
  const detectedPatterns: string[] = [];

  for (const regex of SUSPICIOUS_PATTERNS) {
    if (regex.test(text)) {
      detectedPatterns.push(regex.source);
    }
  }

  const sanitized = text
    .replace(/<\|.*?\|>/g, "") // strip special model tokens
    .replace(/\[\/?INST\]/g, "")
    .replace(/###/g, "");

  let threatLevel: ThreatAnalysisResult["threatLevel"] = "none";
  if (detectedPatterns.length === 1) threatLevel = "low";
  else if (detectedPatterns.length === 2) threatLevel = "medium";
  else if (detectedPatterns.length > 2) threatLevel = "high";

  return {
    isSafe: detectedPatterns.length === 0,
    threatLevel,
    detectedPatterns,
    sanitizedText: sanitized,
  };
}
