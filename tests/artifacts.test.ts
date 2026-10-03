import { describe, it, expect } from "vitest";
import {
  evaluateFormula,
  workbookToCsv,
  sanitizeCsvCell,
  FormulaError,
} from "../src/domain/artifacts.ts";
import type { Workbook } from "../src/domain/types.ts";

function wb(cells: Workbook["cells"]): Workbook {
  return { id: "WB", name: "test", cells, edits: [] };
}

describe("safe formula evaluation", () => {
  it("computes aggregates and arithmetic over cell refs", () => {
    const w = wb({ A1: 2, A2: 3, A3: 10, B1: { formula: "SUM(A1:A3)" }, B2: { formula: "AVG(A1:A3)" } });
    expect(evaluateFormula(w, "SUM(A1:A3)")).toBe(15);
    expect(evaluateFormula(w, "A1+A2*A3")).toBe(32);
    expect(evaluateFormula(w, "B1/3")).toBe(5);
    expect(evaluateFormula(w, "MIN(A1:A3)")).toBe(2);
    expect(evaluateFormula(w, "MAX(A1:A3)")).toBe(10);
    expect(evaluateFormula(w, "ROUND(12.3456, 2)")).toBe(12.35);
    expect(evaluateFormula(w, "IF(A1, 100, 200)")).toBe(100);
    expect(evaluateFormula(w, "IF(0, 100, 200)")).toBe(200);
  });

  it("rejects anything outside the bounded grammar", () => {
    const w = wb({ A1: 1 });
    for (const bad of [
      "cmd|/c calc",
      "IMPORT(\"x\")",
      "A1;DROP",
      "SUM(A1:A99999)",
      "()",
      "SUM(",
      "__proto__",
    ]) {
      expect(() => evaluateFormula(w, bad), bad).toThrow(FormulaError);
    }
    expect(() => evaluateFormula(w, "A1/0")).toThrow(/division by zero/);
    expect(() => evaluateFormula(w, "X".repeat(300))).toThrow(/too long/);
  });

  it("bounds nesting depth", () => {
    const w = wb({ A1: { formula: "A2" }, A2: { formula: "A3" }, A3: { formula: "A4" }, A4: { formula: "A5" }, A5: { formula: "A6" }, A6: 1 });
    expect(() => evaluateFormula(w, "A1")).toThrow(/nesting/);
  });
});

describe("CSV export sanitization", () => {
  it("neutralizes formula injection payloads", () => {
    expect(sanitizeCsvCell("=cmd|'/c calc'!A0")).toBe("'=cmd|'/c calc'!A0");
    expect(sanitizeCsvCell("+1+1")).toBe("'+1+1");
    expect(sanitizeCsvCell("-1")).toBe("'-1");
    expect(sanitizeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(sanitizeCsvCell("plain")).toBe("plain");
    expect(sanitizeCsvCell("=1+1\u0000")).toBe("'=1+1");
  });

  it("exports a workbook with neutralized cells and quoted commas", () => {
    const w = wb({ A1: "=EVIL()", B1: "hello, world", A2: 42, B2: { formula: "A2*2" } });
    const csv = workbookToCsv(w);
    expect(csv).toContain("'=EVIL()");
    expect(csv).toContain('"hello, world"');
    expect(csv).toContain("=A2*2".slice(0, 2)); // formula rendered, then neutralized
    expect(csv.split("\n")).toHaveLength(2);
    for (const cell of csv.split("\n").flatMap((l) => l.split(","))) {
      if (cell.startsWith('"')) continue;
      expect(cell.startsWith("=")).toBe(false);
      expect(cell.startsWith("'=") || !/^[=+\-@]/.test(cell)).toBe(true);
    }
  });
});
