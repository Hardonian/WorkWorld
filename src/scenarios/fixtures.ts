/**
 * Shared synthetic company fixtures for Northline Supply Co.
 * All data is synthetic. Money in minor units (CAD cents).
 */
import type { Item, Supplier } from "../domain/types.ts";

export const ITEMS: Item[] = [
  { id: "GLV-100", name: "Nitrile gloves, standard (case of 10 boxes)", unit: "case" },
  { id: "GLV-120", name: "Nitrile gloves, light-duty (case of 10 boxes)", unit: "case" },
  { id: "SAF-220", name: "Safety glasses (box of 12)", unit: "box" },
  { id: "FST-550", name: "Hex bolts M8 (box of 500)", unit: "box" },
  { id: "CLN-080", name: "Floor cleaner (case, 4×4L)", unit: "case" },
];

export const SUPPLIERS: Supplier[] = [
  {
    id: "SUP-KETTLE",
    name: "Kettle & Crate Industrial",
    leadTimeDays: 3,
    paymentTermsDays: 30,
    catalog: [
      { itemId: "GLV-100", unitPriceMinor: 3200 },
      { itemId: "SAF-220", unitPriceMinor: 2400 },
      { itemId: "FST-550", unitPriceMinor: 1850 },
      { itemId: "CLN-080", unitPriceMinor: 4300 },
    ],
  },
  {
    id: "SUP-MARWELL",
    name: "Marwell Safety Supply",
    leadTimeDays: 5,
    paymentTermsDays: 14,
    catalog: [
      { itemId: "GLV-100", unitPriceMinor: 2950 },
      { itemId: "GLV-120", unitPriceMinor: 2950 },
      { itemId: "SAF-220", unitPriceMinor: 2100 },
      { itemId: "CLN-080", unitPriceMinor: 4100 },
    ],
  },
  {
    id: "SUP-VANTAGE",
    name: "Vantage Fasteners",
    leadTimeDays: 7,
    paymentTermsDays: 30,
    catalog: [{ itemId: "FST-550", unitPriceMinor: 1520 }],
  },
  {
    id: "SUP-HALBROOK",
    name: "Halbrook Trade Goods",
    leadTimeDays: 2,
    paymentTermsDays: 7,
    catalog: [
      { itemId: "GLV-100", unitPriceMinor: 3600 },
      { itemId: "SAF-220", unitPriceMinor: 2800 },
      { itemId: "FST-550", unitPriceMinor: 2200 },
      { itemId: "CLN-080", unitPriceMinor: 4900 },
    ],
  },
];

/** Opening balances in minor units. Books balance by construction. */
export const LEDGER_OPENING = {
  cash: 1250000,
  accounts_receivable: 230000,
  inventory: 480000,
  accounts_payable: 195000,
};

export const POLICY = {
  approvalThresholdMinor: 40000, // CAD 400 single-order authority
  budgetMinor: 250000, // CAD 2500 episode purchase budget
  currency: "CAD" as const,
};

export function day(minute: number): number {
  return Math.floor(minute / 1440);
}

export function atDay(d: number): number {
  return d * 1440;
}
