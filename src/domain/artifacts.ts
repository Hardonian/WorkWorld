/**
 * Spreadsheet artifacts: bounded, safe formula evaluation + export sanitization.
 * No shell, no SQL, no arbitrary code. Untrusted strings are data, and CSV
 * export neutralizes formula-leading characters (formula-injection defense).
 */
import type { CellValue, Workbook } from "./types.ts";

export const MAX_FORMULA_LENGTH = 200;
export const MAX_RANGE_CELLS = 500;

export class FormulaError extends Error {}

const CELL_REF = /^[A-Z]{1,2}[1-9][0-9]?$/;

export function isValidCellRef(ref: string): boolean {
  return CELL_REF.test(ref);
}

function refToRowCol(ref: string): { row: number; col: number } {
  const m = /^([A-Z]{1,2})([1-9][0-9]?)$/.exec(ref);
  if (!m) throw new FormulaError(`invalid cell reference: ${ref}`);
  let col = 0;
  for (const ch of m[1]!) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: parseInt(m[2]!, 10), col };
}

function rowColToRef(row: number, col: number): string {
  let s = "";
  let c = col;
  while (c > 0) {
    s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
    c = Math.floor((c - 1) / 26);
  }
  return `${s}${row}`;
}

export function expandRange(a: string, b: string): string[] {
  const r1 = refToRowCol(a);
  const r2 = refToRowCol(b);
  const out: string[] = [];
  for (let r = Math.min(r1.row, r2.row); r <= Math.max(r1.row, r2.row); r++) {
    for (let c = Math.min(r1.col, r2.col); c <= Math.max(r1.col, r2.col); c++) {
      out.push(rowColToRef(r, c));
    }
    if (out.length > MAX_RANGE_CELLS) throw new FormulaError("range too large");
  }
  return out;
}

export function numericValue(wb: Workbook, ref: string, depth = 0): number {
  if (depth > 4) throw new FormulaError("formula nesting too deep");
  const v = wb.cells[ref];
  if (v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    throw new FormulaError(`cell ${ref} is not numeric`);
  }
  return evaluateFormula(wb, v.formula, depth + 1);
}

/** Evaluate a bounded formula grammar:
 *  numbers, cell refs, + - * /, parentheses, and SUM/AVG/MIN/MAX(RANGE|expr). */
export function evaluateFormula(wb: Workbook, formula: string, depth = 0): number {
  const src = formula.trim();
  if (src.length > MAX_FORMULA_LENGTH) throw new FormulaError("formula too long");
  if (!/^[0-9A-Z+\-*/().,: \t]+$/.test(src)) {
    throw new FormulaError("formula contains unsupported characters");
  }
  return parseExpression(wb, src, depth);
}

function parseExpression(wb: Workbook, src: string, depth: number): number {
  let pos = 0;

  const peek = () => src[pos] ?? "";
  const skipWs = () => {
    while (pos < src.length && (src[pos] === " " || src[pos] === "\t")) pos++;
  };

  function parsePrimary(): number {
    skipWs();
    const ch = peek();
    if (ch === "(") {
      pos++;
      const v = parseAddSub();
      skipWs();
      if (peek() !== ")") throw new FormulaError("missing )");
      pos++;
      return v;
    }
    if (/[A-Z]/.test(ch)) {
      const m = /^(SUM|AVG|MIN|MAX)\(/.exec(src.slice(pos));
      if (m) {
        pos += m[0].length;
        const args = parseArgs();
        skipWs();
        if (peek() !== ")") throw new FormulaError("missing ) after function");
        pos++;
        const flat = args.flat();
        if (flat.length === 0) throw new FormulaError("empty aggregate");
        switch (m[1]) {
          case "SUM":
            return flat.reduce((a, b) => a + b, 0);
          case "AVG":
            return flat.reduce((a, b) => a + b, 0) / flat.length;
          case "MIN":
            return Math.min(...flat);
          case "MAX":
            return Math.max(...flat);
        }
      }
      const refMatch = /^[A-Z]{1,2}[1-9][0-9]?/.exec(src.slice(pos));
      if (refMatch) {
        pos += refMatch[0].length;
        return numericValue(wb, refMatch[0], depth);
      }
      throw new FormulaError(`unexpected token at ${src.slice(pos)}`);
    }
    const numMatch = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(pos));
    if (numMatch) {
      pos += numMatch[0].length;
      return Number(numMatch[0]);
    }
    throw new FormulaError(`unexpected character '${ch}'`);
  }

  function parseArgs(): number[][] {
    // args := expr | range (',' ...)*
    const out: number[][] = [];
    for (;;) {
      skipWs();
      const rangeMatch = /^([A-Z]{1,2}[1-9][0-9]?):([A-Z]{1,2}[1-9][0-9]?)/.exec(src.slice(pos));
      if (rangeMatch) {
        pos += rangeMatch[0].length;
        out.push(expandRange(rangeMatch[1]!, rangeMatch[2]!).map((r) => numericValue(wb, r, depth)));
      } else {
        out.push([parseAddSub()]);
      }
      skipWs();
      if (peek() === ",") {
        pos++;
        continue;
      }
      return out;
    }
  }

  function parseMulDiv(): number {
    let left = parsePrimary();
    for (;;) {
      skipWs();
      const op = peek();
      if (op === "*" || op === "/") {
        pos++;
        const right = parsePrimary();
        if (op === "/" && right === 0) throw new FormulaError("division by zero");
        left = op === "*" ? left * right : left / right;
      } else return left;
    }
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    for (;;) {
      skipWs();
      const op = peek();
      if (op === "+" || op === "-") {
        pos++;
        const right = parseMulDiv();
        left = op === "+" ? left + right : left - right;
      } else return left;
    }
  }

  const result = parseAddSub();
  skipWs();
  if (pos !== src.length) throw new FormulaError("trailing characters in formula");
  return result;
}

/** CSV export with formula-injection neutralization (owasp CSV injection defense). */
export function workbookToCsv(wb: Workbook): string {
  const refs = Object.keys(wb.cells).sort((a, b) => {
    const ra = refToRowCol(a);
    const rb = refToRowCol(b);
    return ra.row - rb.row || ra.col - rb.col;
  });
  const rows = new Map<number, string[]>();
  for (const ref of refs) {
    const { row, col } = refToRowCol(ref);
    const arr = rows.get(row) ?? [];
    const v = wb.cells[ref];
    const rendered =
      typeof v === "object" && v !== null && "formula" in v
        ? `=${v.formula}`
        : String(v ?? "");
    arr[col - 1] = sanitizeCsvCell(rendered);
    rows.set(row, arr);
  }
  return [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, cells]) => {
      const width = Math.max(...cells.map((_, i) => i + 1), 0);
      const line: string[] = [];
      for (let i = 0; i < width; i++) line.push(quoteCsv(cells[i] ?? ""));
      return line.join(",");
    })
    .join("\n");
}

/** Neutralize strings that spreadsheet apps would execute as formulas. */
export function sanitizeCsvCell(value: string): string {
  const stripped = value.replace(/[\u0000-\u001f]/g, "");
  if (/^[=+\-@\t\r]/.test(stripped)) {
    return `'${stripped}`;
  }
  return stripped;
}

function quoteCsv(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function setCell(wb: Workbook, ref: string, value: CellValue, atMinute: number): void {
  if (!isValidCellRef(ref)) throw new FormulaError(`invalid cell reference: ${ref}`);
  if (typeof value === "object" && value !== null && "formula" in value) {
    if (value.formula.length > MAX_FORMULA_LENGTH) throw new FormulaError("formula too long");
  }
  wb.cells[ref] = value;
  wb.edits.push({ atMinute, ref, value });
}
