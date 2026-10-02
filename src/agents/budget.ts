/**
 * Shared experiment budget. Checked BEFORE dispatching each paid request.
 * Integer minor units of the declared currency. Actual usage is recorded;
 * costs are unknown_cost unless a priced table is explicitly configured.
 */
import { BudgetExceededError, type ProviderUsage } from "./types.ts";

export interface BudgetConfig {
  currency: "CAD" | "USD";
  limitMinor: number;
  /** explicit pricing provenance, e.g. "env WORKWORLD_PRICING_JSON set 2026-10-02" */
  pricingSource: string | null;
  /** model -> minor units per 1M total tokens */
  pricePerMillionTokens: Record<string, number>;
}

export function loadBudgetConfig(): BudgetConfig {
  const currency = (process.env.WORKWORLD_BUDGET_CURRENCY ?? "CAD") as "CAD" | "USD";
  const limitMinor = Number(process.env.WORKWORLD_BUDGET_MINOR ?? "0");
  const raw = process.env.WORKWORLD_PRICING_JSON;
  if (!raw) {
    return { currency, limitMinor: Number.isFinite(limitMinor) ? limitMinor : 0, pricingSource: null, pricePerMillionTokens: {} };
  }
  try {
    const parsed = JSON.parse(raw) as { source?: string; prices?: Record<string, number> };
    return {
      currency,
      limitMinor: Number.isFinite(limitMinor) ? limitMinor : 0,
      pricingSource: parsed.source ?? "env WORKWORLD_PRICING_JSON (source not declared)",
      pricePerMillionTokens: parsed.prices ?? {},
    };
  } catch {
    return { currency, limitMinor: 0, pricingSource: null, pricePerMillionTokens: {} };
  }
}

export class BudgetLedger {
  private spentMinor = 0;

  constructor(private readonly config: BudgetConfig) {}

  get limitMinor(): number {
    return this.config.limitMinor;
  }

  get usedMinor(): number {
    return this.spentMinor;
  }

  get currency(): string {
    return this.config.currency;
  }

  /** Price one response's usage, or mark unknown_cost. */
  price(model: string, promptTokens: number, completionTokens: number): ProviderUsage {
    const total = promptTokens + completionTokens;
    const rate = this.config.pricePerMillionTokens[model];
    const known = rate !== undefined && this.config.pricingSource !== null;
    return {
      promptTokens,
      completionTokens,
      totalTokens: total,
      costMinor: known ? Math.ceil((total * rate) / 1_000_000) : null,
      pricingSource: known ? this.config.pricingSource! : "unknown_cost",
    };
  }

  /**
   * Gate before dispatch. Paid providers require budget headroom; unknown-cost
   * calls are treated as paid (conservative) unless the adapter is free/local.
   */
  ensureHeadroom(estimatedCostMinor: number | null, paid: boolean): void {
    if (!paid) return;
    const est = estimatedCostMinor ?? 1; // unknown cost counts as nonzero
    if (this.spentMinor + est > this.config.limitMinor) {
      throw new BudgetExceededError(
        `experiment budget exhausted: ${this.spentMinor}+${est} > ${this.config.limitMinor} ${this.config.currency} minor`,
      );
    }
  }

  record(usage: ProviderUsage): void {
    this.spentMinor += usage.costMinor ?? 0;
  }
}
