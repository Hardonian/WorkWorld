import { describe, it, expect } from "vitest";
import {
  parseCellRef,
  formatCellRef,
  expandRange,
  evaluateFormula,
} from "../src/domain/formula.ts";

describe("Safe Formula Engine (Item 005)", () => {
  it("parses and formats cell references correctly", () => {
    expect(parseCellRef("A1")).toEqual({ col: 0, row: 1 });
    expect(parseCellRef("B10")).toEqual({ col: 1, row: 10 });
    expect(parseCellRef("AA5")).toEqual({ col: 26, row: 5 });
    expect(parseCellRef("invalid")).toBeNull();

    expect(formatCellRef(0, 1)).toBe("A1");
    expect(formatCellRef(1, 10)).toBe("B10");
    expect(formatCellRef(26, 5)).toBe("AA5");
  });

  it("expands 2D cell ranges", () => {
    expect(expandRange("A1:B2")).toEqual(["A1", "A2", "B1", "B2"]);
    expect(expandRange("C3:C5")).toEqual(["C3", "C4", "C5"]);
    expect(expandRange("D1")).toEqual(["D1"]);
  });

  it("evaluates mathematical aggregates over cell ranges", () => {
    const cells = {
      A1: 10,
      A2: 20,
      A3: 30,
      B1: 5,
      B2: 15,
      B3: 25,
    };

    expect(evaluateFormula("=SUM(A1:A3)", cells).value).toBe(60);
    expect(evaluateFormula("=AVERAGE(A1:A3)", cells).value).toBe(20);
    expect(evaluateFormula("=MIN(A1:B3)", cells).value).toBe(5);
    expect(evaluateFormula("=MAX(A1:B3)", cells).value).toBe(30);
  });

  it("evaluates ROUND and IF logical conditionals", () => {
    const cells = {
      A1: 12.3456,
      B1: 100,
      B2: 50,
    };

    expect(evaluateFormula("=ROUND(A1, 2)", cells).value).toBe(12.35);
    expect(evaluateFormula("=ROUND(A1, 0)", cells).value).toBe(12);

    expect(evaluateFormula("=IF(B1 > B2, 999, 111)", cells).value).toBe(999);
    expect(evaluateFormula("=IF(B1 < B2, 999, 111)", cells).value).toBe(111);
    expect(evaluateFormula("=IF(B1 = 100, 42, 0)", cells).value).toBe(42);
  });

  it("evaluates binary arithmetic and handles divide by zero", () => {
    const cells = {
      A1: 50,
      A2: 2,
      A3: 0,
    };

    expect(evaluateFormula("A1 + A2", cells).value).toBe(52);
    expect(evaluateFormula("A1 * A2", cells).value).toBe(100);
    expect(evaluateFormula("A1 / A2", cells).value).toBe(25);
    expect(evaluateFormula("A1 / A3", cells).value).toBe("#DIV/0!");
  });

  it("guards against circular reference loops", () => {
    const cells = {
      A1: "=B1",
      B1: "=A1",
    };

    const res = evaluateFormula("=A1", cells);
    expect(res.value).toBe("#REF!");
    expect(res.error).toContain("Circular reference detected");
  });
});
