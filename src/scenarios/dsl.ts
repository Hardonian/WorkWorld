/**
 * Synthetic Scenario DSL & Authoring Kit (Pillar 7, Item 070).
 * Fluent builder pattern for defining custom business scenarios, catalogs, and rubrics.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { Scenario, SupplierCatalog } from "../domain/types.ts";

export class ScenarioBuilder {
  private scenario: Scenario;

  constructor(id: string, title: string) {
    this.scenario = {
      id,
      family: "custom",
      title,
      description: "",
      difficulty: "intermediate",
      tags: [],
      brief: {
        company: "Custom Corp (synthetic)",
        role: "Operations Coordinator",
        situation: "",
        objectives: [],
        guidance: [],
      },
      policy: {
        currency: "CAD",
        budgetMinor: 500000,
        approvalThresholdMinor: 50000,
        helpPolicy: { maxHelpRequests: 3, fatalBeyond: true },
      },
      supplierCatalog: {},
      initialState: {
        clockMinute: 0,
        inventory: {},
        inbox: [],
        purchaseOrders: {},
        deliveries: {},
        invoices: {},
        ledger: {
          opening: { cash: 1000000, accounts_receivable: 0, inventory: 0, accounts_payable: 0 },
          txns: [],
        },
        tickets: {},
        workbooks: {},
        workNotes: [],
      },
      events: [],
      rubric: {
        fatalTiers: ["T1"],
        rules: [],
      },
    };
  }

  setRole(role: string, situation: string): this {
    this.scenario.brief.role = role;
    this.scenario.brief.situation = situation;
    return this;
  }

  addObjective(objective: string): this {
    this.scenario.brief.objectives.push(objective);
    return this;
  }

  setBudget(budgetCad: number, approvalLimitCad: number): this {
    this.scenario.policy.budgetMinor = Math.round(budgetCad * 100);
    this.scenario.policy.approvalThresholdMinor = Math.round(approvalLimitCad * 100);
    return this;
  }

  addSupplier(
    vendorId: string,
    name: string,
    leadDays: number,
    terms: "net_30" | "net_60" | "due_on_receipt",
    items: Array<{ itemId: string; name: string; unitPriceCad: number; uom: string }>
  ): this {
    const itemCatalog: SupplierCatalog[string]["items"] = {};
    for (const it of items) {
      itemCatalog[it.itemId] = {
        itemId: it.itemId,
        name: it.name,
        unitPriceMinor: Math.round(it.unitPriceCad * 100),
        unitOfMeasure: it.uom,
      };
    }

    this.scenario.supplierCatalog[vendorId] = {
      supplierId: vendorId,
      name,
      leadDays,
      terms,
      items: itemCatalog,
    };
    return this;
  }

  addRubricRule(id: string, description: string, points: number, tier: "T1" | "T2" = "T1"): this {
    if (!this.scenario.rubric) {
      this.scenario.rubric = { fatalTiers: ["T1"], rules: [] };
    }
    if (!this.scenario.rubric.rules) {
      this.scenario.rubric.rules = [];
    }
    this.scenario.rubric.rules.push({ id, description, points, category: "compliance", tier });
    return this;
  }

  build(): Scenario {
    return JSON.parse(JSON.stringify(this.scenario));
  }
}
