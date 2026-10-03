/**
 * WorkWorld Multi-Currency & FX Engine.
 * Pure TypeScript — no React imports.
 * Integer minor units throughout.
 */

import type { Currency, Minor } from "./types.ts";

export type ExtendedCurrency = Currency | "EUR" | "GBP";

export interface ExchangeRate {
  pair: `${ExtendedCurrency}/${ExtendedCurrency}`;
  rate: number; // e.g. USD/CAD = 1.36
  asOfMinute: number;
}

/** Standard baseline spot rates against CAD base */
export const DEFAULT_EXCHANGE_RATES: Record<ExtendedCurrency, number> = {
  CAD: 1.0,
  USD: 1.36, // 1 USD = 1.36 CAD
  EUR: 1.48, // 1 EUR = 1.48 CAD
  GBP: 1.76, // 1 GBP = 1.76 CAD
};

/**
 * Converts an amount from one currency to another using the spot rates.
 * Output is always rounded to integer minor units.
 */
export function convertCurrency(
  amountMinor: Minor,
  from: ExtendedCurrency,
  to: ExtendedCurrency,
  rates: Record<ExtendedCurrency, number> = DEFAULT_EXCHANGE_RATES
): Minor {
  if (from === to) return amountMinor;

  const fromRate = rates[from] ?? 1.0;
  const toRate = rates[to] ?? 1.0;

  // Convert to CAD base, then to target currency
  const inCad = amountMinor * fromRate;
  const targetMinor = Math.round(inCad / toRate);
  return targetMinor;
}

/**
 * Calculates realized FX gain or loss on invoice settlement.
 * If bookingRate was 1.35 and settlementRate was 1.38, we pay more CAD (realized loss).
 * If settlementRate was 1.33, we pay less CAD (realized gain).
 */
export function calculateRealizedFx(
  foreignAmountMinor: Minor,
  bookingRate: number,
  settlementRate: number
): { realizedGainOrLossMinor: Minor; isGain: boolean } {
  const bookedCad = Math.round(foreignAmountMinor * bookingRate);
  const settledCad = Math.round(foreignAmountMinor * settlementRate);
  const diff = bookedCad - settledCad;

  return {
    realizedGainOrLossMinor: Math.abs(diff),
    isGain: diff > 0, // Booked higher liability than settled cash -> gain
  };
}
