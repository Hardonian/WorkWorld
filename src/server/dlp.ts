/**
 * Data Loss Prevention (DLP) & Sensitive Credential Shield.
 * Scans simulation text inputs, workbook notes, and agent prompts to redact
 * accidentally pasted credentials (API keys, AWS tokens, Stripe secrets) and PII.
 * Pure TypeScript — zero React imports.
 */

export interface DlpScanResult {
  isClean: boolean;
  redactedText: string;
  violationsFound: Array<{
    type: "credit_card" | "api_key" | "ssn_sin" | "jwt_token" | "aws_key";
    match: string;
  }>;
}

// Luhn check algorithm for valid credit card numbers
function isValidLuhn(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export class DataLossPreventionScanner {
  /**
   * Scans a text string for sensitive credentials or PII and redacts matches.
   */
  static scanAndRedact(text: string): DlpScanResult {
    let redacted = text;
    const violations: DlpScanResult["violationsFound"] = [];

    // 1. Stripe API Keys (sk_live, rk_live)
    const stripeRegex = /\b(?:sk|rk)_live_[0-9a-zA-Z]{24,34}\b/g;
    redacted = redacted.replace(stripeRegex, (m) => {
      violations.push({ type: "api_key", match: m });
      return "[REDACTED_STRIPE_API_KEY]";
    });

    // 2. OpenAI / Anthropic Keys
    const aiKeyRegex = /\bsk-(?:proj-|ant-)?[0-9a-zA-Z_-]{30,80}\b/g;
    redacted = redacted.replace(aiKeyRegex, (m) => {
      violations.push({ type: "api_key", match: m });
      return "[REDACTED_AI_API_KEY]";
    });

    // 3. AWS Access Key IDs
    const awsRegex = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g;
    redacted = redacted.replace(awsRegex, (m) => {
      violations.push({ type: "aws_key", match: m });
      return "[REDACTED_AWS_ACCESS_KEY]";
    });

    // 4. US SSN (xxx-xx-xxxx) or Canadian SIN (xxx-xxx-xxx)
    const ssnRegex = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b|\b\d{3}[-\s]\d{3}[-\s]\d{3}\b/g;
    redacted = redacted.replace(ssnRegex, (m) => {
      violations.push({ type: "ssn_sin", match: m });
      return "[REDACTED_GOVERNMENT_ID]";
    });

    // 5. Credit Card numbers (13-16 digits with spaces or hyphens)
    const ccRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{15,16}\b/g;
    redacted = redacted.replace(ccRegex, (m) => {
      const cleanDigits = m.replace(/\D/g, "");
      if (cleanDigits.length >= 13 && cleanDigits.length <= 16 && isValidLuhn(cleanDigits)) {
        violations.push({ type: "credit_card", match: m });
        return "[REDACTED_PAYMENT_CARD]";
      }
      return m;
    });

    return {
      isClean: violations.length === 0,
      redactedText: redacted,
      violationsFound: violations,
    };
  }
}
