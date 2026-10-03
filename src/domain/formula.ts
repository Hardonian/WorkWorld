/**
 * Safe, sandboxed spreadsheet formula evaluator for WorkWorld workbooks.
 * Free of eval() and external dependencies. Pure domain logic.
 */

export interface FormulaResult {
  value: number | string | boolean;
  error?: string;
}

/**
 * Parses cell reference e.g. "A1" -> { col: 0, row: 1 }
 */
export function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.trim().toUpperCase().match(/^([A-Z]{1,2})([1-9][0-9]?)$/);
  if (!match) return null;

  const colLetters = match[1]!;
  const row = parseInt(match[2]!, 10);

  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64);
  }
  return { col: col - 1, row };
}

/**
 * Converts col/row numbers back to string reference e.g. { col: 0, row: 1 } -> "A1"
 */
export function formatCellRef(col: number, row: number): string {
  let colStr = "";
  let tempCol = col + 1;
  while (tempCol > 0) {
    const rem = (tempCol - 1) % 26;
    colStr = String.fromCharCode(65 + rem) + colStr;
    tempCol = Math.floor((tempCol - 1) / 26);
  }
  return `${colStr}${row}`;
}

/**
 * Expands a 2D range e.g. "A1:B2" -> ["A1", "A2", "B1", "B2"]
 */
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(":").map((s) => s.trim().toUpperCase());
  if (parts.length === 1) return [parts[0]!];
  if (parts.length !== 2) return [];

  const start = parseCellRef(parts[0]!);
  const end = parseCellRef(parts[1]!);
  if (!start || !end) return [];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const result: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      result.push(formatCellRef(c, r));
    }
  }
  return result;
}

/**
 * Resolves a cell value or evaluates its formula recursively with circular dependency guard.
 */
export function resolveCellValue(
  ref: string,
  cells: Record<string, unknown>,
  visited: Set<string> = new Set()
): number | string | boolean {
  const normalized = ref.trim().toUpperCase();
  if (visited.has(normalized)) {
    throw new Error(`Circular reference detected involving ${normalized}`);
  }

  const raw = cells[normalized];
  if (raw === undefined || raw === null || raw === "") return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw;

  if (typeof raw === "object" && raw !== null && "formula" in raw) {
    const nextVisited = new Set(visited).add(normalized);
    const res = evaluateFormula((raw as { formula: string }).formula, cells, nextVisited);
    if (res.error) throw new Error(res.error);
    return res.value;
  }

  const str = String(raw).trim();
  if (str.startsWith("=")) {
    const nextVisited = new Set(visited).add(normalized);
    const res = evaluateFormula(str.slice(1), cells, nextVisited);
    if (res.error) throw new Error(res.error);
    return res.value;
  }

  const num = Number(str);
  return Number.isFinite(num) ? num : str;
}

/**
 * Evaluates an Excel-style formula string safely.
 */
export function evaluateFormula(
  formula: string,
  cells: Record<string, unknown>,
  visited: Set<string> = new Set()
): FormulaResult {
  const clean = formula.trim().replace(/^=/, "").trim();
  if (!clean) return { value: 0 };

  try {
    // 1. Function invocations: FUNCTION(args...)
    const fnMatch = clean.match(/^([A-Z]+)\((.*)\)$/i);
    if (fnMatch) {
      const fnName = fnMatch[1]!.toUpperCase();
      const rawArgs = fnMatch[2]!;

      // Handle IF(condition, trueVal, falseVal)
      if (fnName === "IF") {
        return evaluateIf(rawArgs, cells, visited);
      }

      // Collect argument numbers (expanding ranges)
      const values = collectNumericValues(rawArgs, cells, visited);

      switch (fnName) {
        case "SUM": {
          const sum = values.reduce((acc, v) => acc + v, 0);
          return { value: sum };
        }
        case "AVG":
        case "AVERAGE": {
          if (values.length === 0) return { value: 0 };
          const sum = values.reduce((acc, v) => acc + v, 0);
          return { value: sum / values.length };
        }
        case "MIN": {
          if (values.length === 0) return { value: 0 };
          return { value: Math.min(...values) };
        }
        case "MAX": {
          if (values.length === 0) return { value: 0 };
          return { value: Math.max(...values) };
        }
        case "ROUND": {
          const parts = rawArgs.split(",").map((s) => s.trim());
          const val = Number(resolveValueOrRef(parts[0] || "0", cells, visited));
          const decimals = parts[1] ? parseInt(parts[1], 10) : 0;
          const factor = Math.pow(10, decimals);
          return { value: Math.round(val * factor) / factor };
        }
        default:
          return { value: `#NAME?`, error: `Unsupported function: ${fnName}` };
      }
    }

    // 2. Simple binary arithmetic e.g. A1 + B2 or 10 * 2.5
    const opMatch = clean.match(/^(.+?)\s*([\+\-\*\/])\s*(.+)$/);
    if (opMatch) {
      const leftRaw = opMatch[1]!.trim();
      const op = opMatch[2]!;
      const rightRaw = opMatch[3]!.trim();

      const leftVal = Number(resolveValueOrRef(leftRaw, cells, visited));
      const rightVal = Number(resolveValueOrRef(rightRaw, cells, visited));

      if (!Number.isFinite(leftVal) || !Number.isFinite(rightVal)) {
        return { value: "#VALUE!", error: "Invalid operand in arithmetic formula" };
      }

      switch (op) {
        case "+":
          return { value: leftVal + rightVal };
        case "-":
          return { value: leftVal - rightVal };
        case "*":
          return { value: leftVal * rightVal };
        case "/":
          if (rightVal === 0) return { value: "#DIV/0!", error: "Division by zero" };
          return { value: leftVal / rightVal };
      }
    }

    // 3. Direct reference or literal
    const resolved = resolveValueOrRef(clean, cells, visited);
    return { value: resolved };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { value: "#REF!", error: msg };
  }
}

function resolveValueOrRef(token: string, cells: Record<string, unknown>, visited: Set<string>): number | string | boolean {
  const t = token.trim();
  if (parseCellRef(t)) {
    return resolveCellValue(t, cells, visited);
  }
  const n = Number(t);
  if (Number.isFinite(n) && t !== "") return n;
  if (t.toLowerCase() === "true") return true;
  if (t.toLowerCase() === "false") return false;
  return t.replace(/^["']|["']$/g, "");
}

function collectNumericValues(rawArgs: string, cells: Record<string, unknown>, visited: Set<string>): number[] {
  const tokens = rawArgs.split(",").map((s) => s.trim()).filter(Boolean);
  const result: number[] = [];

  for (const token of tokens) {
    if (token.includes(":")) {
      const expanded = expandRange(token);
      for (const ref of expanded) {
        const val = resolveCellValue(ref, cells, visited);
        if (typeof val === "number" && Number.isFinite(val)) {
          result.push(val);
        }
      }
    } else {
      const val = resolveValueOrRef(token, cells, visited);
      if (typeof val === "number" && Number.isFinite(val)) {
        result.push(val);
      }
    }
  }

  return result;
}

function evaluateIf(rawArgs: string, cells: Record<string, unknown>, visited: Set<string>): FormulaResult {
  const parts = rawArgs.split(",").map((s) => s.trim());
  if (parts.length < 2) {
    return { value: "#N/A", error: "IF requires at least condition and true value" };
  }

  const cond = parts[0]!;
  const trueToken = parts[1]!;
  const falseToken = parts[2] !== undefined ? parts[2] : "0";

  // Match comparison: e.g. A1 > 10, B2 <= 50, C1 = "YES"
  const compMatch = cond.match(/^(.+?)\s*(>=|<=|!=|>|<|=)\s*(.+)$/);
  let isTrue = false;

  if (compMatch) {
    const left = resolveValueOrRef(compMatch[1]!, cells, visited);
    const op = compMatch[2]!;
    const right = resolveValueOrRef(compMatch[3]!, cells, visited);

    switch (op) {
      case ">":
        isTrue = Number(left) > Number(right);
        break;
      case "<":
        isTrue = Number(left) < Number(right);
        break;
      case ">=":
        isTrue = Number(left) >= Number(right);
        break;
      case "<=":
        isTrue = Number(left) <= Number(right);
        break;
      case "=":
        isTrue = left === right;
        break;
      case "!=":
        isTrue = left !== right;
        break;
    }
  } else {
    const truthyVal = resolveValueOrRef(cond, cells, visited);
    isTrue = Boolean(truthyVal && truthyVal !== "0" && truthyVal !== "false");
  }

  const chosenToken = isTrue ? trueToken : falseToken;
  const val = resolveValueOrRef(chosenToken, cells, visited);
  return { value: val };
}
