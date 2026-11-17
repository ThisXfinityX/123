export interface VariableSnapshot {
  name: string;
  typeName: string;
  repr: string;
  changed: boolean;
  isNew: boolean;
  kind: 'primitive' | 'list' | 'dict' | 'tuple' | 'function' | 'none';
  items?: { keyOrIndex: string; repr: string; typeName: string }[];
}

export interface ExecutionStep {
  stepIndex: number;
  line: number;
  code: string;
  insight: string;
  variables: VariableSnapshot[];
  stdout: string[];
  event: 'assign' | 'output' | 'branch' | 'loop' | 'call' | 'return' | 'mutate' | 'info';
}

export interface ExecutionResult {
  success: boolean;
  stdout: string[];
  steps: ExecutionStep[];
  finalVariables: Record<string, PyValue>;
  error?: {
    type: string;
    message: string;
    line?: number;
  };
}

export type PyValue =
  | number
  | string
  | boolean
  | null
  | PyList
  | PyTuple
  | PyDict
  | PyFunction;

export interface PyList {
  __pyType: 'list';
  items: PyValue[];
}

export interface PyTuple {
  __pyType: 'tuple';
  items: PyValue[];
}

export interface PyDict {
  __pyType: 'dict';
  entries: Map<string, { key: PyValue; value: PyValue }>;
}

export interface PyFunction {
  __pyType: 'function';
  name: string;
  params: { name: string; defaultExpr?: string }[];
  body: Stmt[];
  closureEnv: Env;
}

class Env {
  vars: Map<string, PyValue> = new Map();
  parent: Env | null;
  label: string;

  constructor(parent: Env | null = null, label = 'global') {
    this.parent = parent;
    this.label = label;
  }

  get(name: string): { found: boolean; value: PyValue } {
    if (this.vars.has(name)) {
      return { found: true, value: this.vars.get(name)! };
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    return { found: false, value: null };
  }

  setLocal(name: string, val: PyValue) {
    this.vars.set(name, val);
  }
}

class PyRuntimeError extends Error {
  pyType: string;
  line?: number;
  constructor(pyType: string, message: string, line?: number) {
    super(message);
    this.pyType = pyType;
    this.line = line;
  }
}

class ReturnSignal {
  value: PyValue;
  constructor(value: PyValue) {
    this.value = value;
  }
}

class BreakSignal {}
class ContinueSignal {}

export function isPyList(v: PyValue): v is PyList {
  return typeof v === 'object' && v !== null && '__pyType' in v && v.__pyType === 'list';
}

export function isPyTuple(v: PyValue): v is PyTuple {
  return typeof v === 'object' && v !== null && '__pyType' in v && v.__pyType === 'tuple';
}

export function isPyDict(v: PyValue): v is PyDict {
  return typeof v === 'object' && v !== null && '__pyType' in v && v.__pyType === 'dict';
}

export function isPyFunction(v: PyValue): v is PyFunction {
  return typeof v === 'object' && v !== null && '__pyType' in v && v.__pyType === 'function';
}

export function getPyTypeName(v: PyValue): string {
  if (v === null) return 'NoneType';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'string') return 'str';
  if (isPyList(v)) return 'list';
  if (isPyTuple(v)) return 'tuple';
  if (isPyDict(v)) return 'dict';
  if (isPyFunction(v)) return 'function';
  return 'object';
}

export function pyToString(v: PyValue): string {
  if (v === null) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') {
    if (Object.is(v, -0)) return '0';
    return String(v);
  }
  if (typeof v === 'string') return v;
  if (isPyList(v)) return '[' + v.items.map(pyRepr).join(', ') + ']';
  if (isPyTuple(v)) {
    if (v.items.length === 1) return '(' + pyRepr(v.items[0]) + ',)';
    return '(' + v.items.map(pyRepr).join(', ') + ')';
  }
  if (isPyDict(v)) {
    const parts: string[] = [];
    v.entries.forEach(({ key, value }) => {
      parts.push(`${pyRepr(key)}: ${pyRepr(value)}`);
    });
    return '{' + parts.join(', ') + '}';
  }
  if (isPyFunction(v)) return `<function ${v.name}>`;
  return String(v);
}

export function pyRepr(v: PyValue): string {
  if (typeof v === 'string') {
    if (v.includes("'") && !v.includes('"')) return `"${v}"`;
    return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  return pyToString(v);
}

export function pyTruthy(v: PyValue): boolean {
  if (v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (isPyList(v) || isPyTuple(v)) return v.items.length > 0;
  if (isPyDict(v)) return v.entries.size > 0;
  return true;
}

function pyEquals(a: PyValue, b: PyValue): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (typeof a === 'boolean' && typeof b === 'number') return (a ? 1 : 0) === b;
  if (typeof a === 'number' && typeof b === 'boolean') return a === (b ? 1 : 0);
  if (typeof a !== typeof b) return false;
  if (typeof a === 'number' || typeof a === 'string' || typeof a === 'boolean') return a === b;
  if (isPyList(a) && isPyList(b)) {
    return a.items.length === b.items.length && a.items.every((item, i) => pyEquals(item, b.items[i]));
  }
  if (isPyTuple(a) && isPyTuple(b)) {
    return a.items.length === b.items.length && a.items.every((item, i) => pyEquals(item, b.items[i]));
  }
  if (isPyDict(a) && isPyDict(b)) {
    if (a.entries.size !== b.entries.size) return false;
    for (const [k, entry] of a.entries.entries()) {
      const other = b.entries.get(k);
      if (!other || !pyEquals(entry.value, other.value)) return false;
    }
    return true;
  }
  return a === b;
}

function dictKeyId(k: PyValue, line?: number): string {
  if (typeof k === 'string') return `s:${k}`;
  if (typeof k === 'number') return `n:${k}`;
  if (typeof k === 'boolean') return `n:${k ? 1 : 0}`;
  if (k === null) return 'none';
  if (isPyTuple(k)) return `t:${k.items.map((i) => dictKeyId(i, line)).join(',')}`;
  throw new PyRuntimeError('TypeError', `型別 '${getPyTypeName(k)}' 不可作為字典的鍵 (unhashable)`, line);
}

// --- Lexer & Parser for Statements ---
interface LogicalLine {
  line: number;
  indent: number;
  text: string;
}

type Stmt =
  | { kind: 'expr'; line: number; raw: string; expr: string }
  | { kind: 'assign'; line: number; raw: string; target: string; op: string; expr: string }
  | { kind: 'if'; line: number; raw: string; branches: { cond: string | null; line: number; raw: string; body: Stmt[] }[] }
  | { kind: 'for'; line: number; raw: string; target: string; iterExpr: string; body: Stmt[] }
  | { kind: 'while'; line: number; raw: string; cond: string; body: Stmt[] }
  | { kind: 'def'; line: number; raw: string; name: string; params: { name: string; defaultExpr?: string }[]; body: Stmt[] }
  | { kind: 'return'; line: number; raw: string; expr: string | null }
  | { kind: 'break'; line: number; raw: string }
  | { kind: 'continue'; line: number; raw: string }
  | { kind: 'pass'; line: number; raw: string };

function stripComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === '#' && !inSingle && !inDouble) {
      return line.slice(0, i);
    }
  }
  return line;
}

function bracketBalance(str: string): number {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
    }
  }
  return depth;
}

function preprocessLines(code: string): LogicalLine[] {
  const rawLines = code.replace(/\r\n/g, '\n').split('\n');
  const result: LogicalLine[] = [];
  let i = 0;
  while (i < rawLines.length) {
    const startLineNum = i + 1;
    let raw = rawLines[i];
    const expanded = raw.replace(/\t/g, '    ');
    const clean = stripComment(expanded);
    if (clean.trim() === '') {
      i++;
      continue;
    }
    const indentMatch = clean.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    let combined = clean.trim();
    let depth = bracketBalance(combined);
    while (depth > 0 && i + 1 < rawLines.length) {
      i++;
      const nextClean = stripComment(rawLines[i].replace(/\t/g, '    ')).trim();
      if (nextClean !== '') {
        combined += ' ' + nextClean;
        depth = bracketBalance(combined);
      }
    }
    if (depth !== 0) {
      throw new PyRuntimeError('SyntaxError', '括號未正確閉合，請檢查 ()、[] 或 {}。', startLineNum);
    }
    result.push({ line: startLineNum, indent, text: combined });
    i++;
  }
  return result;
}

function splitTopLevelAssign(text: string): { target: string; op: string; expr: string } | null {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  const augOps = ['+=', '-=', '*=', '//=', '/=', '%=', '**='];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (depth === 0) {
        for (const op of augOps) {
          if (text.startsWith(op, i)) {
            return {
              target: text.slice(0, i).trim(),
              op,
              expr: text.slice(i + op.length).trim(),
            };
          }
        }
        if (ch === '=') {
          const prev = text[i - 1];
          const next = text[i + 1];
          if (prev !== '=' && prev !== '!' && prev !== '<' && prev !== '>' && next !== '=') {
            return {
              target: text.slice(0, i).trim(),
              op: '=',
              expr: text.slice(i + 1).trim(),
            };
          }
        }
      }
    }
  }
  return null;
}

function findKeywordOutsideBrackets(text: string, keyword: string): number {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (depth === 0 && text.startsWith(keyword, i)) {
        const beforeOk = i === 0 || /\s/.test(text[i - 1]);
        const afterOk = i + keyword.length < text.length && /\s/.test(text[i + keyword.length]);
        if (beforeOk && afterOk) return i;
      }
    }
  }
  return -1;
}

function stripTrailingColon(text: string, line: number): string {
  if (!text.endsWith(':')) {
    throw new PyRuntimeError('SyntaxError', '語法錯誤：敘述結尾缺少冒號 ":"。', line);
  }
  return text.slice(0, -1).trim();
}

function parseBlock(lines: LogicalLine[], startIdx: number, expectedIndent: number): { stmts: Stmt[]; nextIdx: number } {
  const stmts: Stmt[] = [];
  let i = startIdx;

  while (i < lines.length) {
    const curr = lines[i];
    if (curr.indent < expectedIndent) {
      break;
    }
    if (curr.indent > expectedIndent) {
      throw new PyRuntimeError('IndentationError', '縮排錯誤：出現非預期的額外縮排。', curr.line);
    }

    const text = curr.text;

    if (text.startsWith('if ') || text.startsWith('if(')) {
      const header = stripTrailingColon(text, curr.line);
      const cond = header.slice(2).trim();
      const branches: { cond: string | null; line: number; raw: string; body: Stmt[] }[] = [];
      i++;
      if (i >= lines.length || lines[i].indent <= expectedIndent) {
        throw new PyRuntimeError('IndentationError', '縮排錯誤：if 區塊後方需要縮排程式碼。', curr.line);
      }
      const blockIndent = lines[i].indent;
      const firstBody = parseBlock(lines, i, blockIndent);
      branches.push({ cond, line: curr.line, raw: text, body: firstBody.stmts });
      i = firstBody.nextIdx;

      while (i < lines.length && lines[i].indent === expectedIndent) {
        const nextLine = lines[i];
        if (nextLine.text.startsWith('elif ') || nextLine.text.startsWith('elif(')) {
          const elifHeader = stripTrailingColon(nextLine.text, nextLine.line);
          const elifCond = elifHeader.slice(4).trim();
          i++;
          if (i >= lines.length || lines[i].indent <= expectedIndent) {
            throw new PyRuntimeError('IndentationError', '縮排錯誤：elif 區塊後方需要縮排程式碼。', nextLine.line);
          }
          const bodyRes = parseBlock(lines, i, lines[i].indent);
          branches.push({ cond: elifCond, line: nextLine.line, raw: nextLine.text, body: bodyRes.stmts });
          i = bodyRes.nextIdx;
        } else if (/^else\s*:/.test(nextLine.text)) {
          stripTrailingColon(nextLine.text, nextLine.line);
          i++;
          if (i >= lines.length || lines[i].indent <= expectedIndent) {
            throw new PyRuntimeError('IndentationError', '縮排錯誤：else 區塊後方需要縮排程式碼。', nextLine.line);
          }
          const bodyRes = parseBlock(lines, i, lines[i].indent);
          branches.push({ cond: null, line: nextLine.line, raw: nextLine.text, body: bodyRes.stmts });
          i = bodyRes.nextIdx;
          break;
        } else {
          break;
        }
      }
      stmts.push({ kind: 'if', line: curr.line, raw: text, branches });
      continue;
    }

    if (text.startsWith('elif ') || /^else\s*:/.test(text)) {
      throw new PyRuntimeError('SyntaxError', '語法錯誤：elif / else 必須接在 if 區塊之後。', curr.line);
    }

    if (text.startsWith('for ')) {
      const header = stripTrailingColon(text, curr.line);
      const afterFor = header.slice(4);
      const inPos = findKeywordOutsideBrackets(afterFor, 'in');
      if (inPos === -1) {
        throw new PyRuntimeError('SyntaxError', '語法錯誤：for 迴圈缺少 "in" 關鍵字。', curr.line);
      }
      const target = afterFor.slice(0, inPos).trim();
      const iterExpr = afterFor.slice(inPos + 2).trim();
      i++;
      if (i >= lines.length || lines[i].indent <= expectedIndent) {
        throw new PyRuntimeError('IndentationError', '縮排錯誤：for 迴圈後方需要縮排程式碼。', curr.line);
      }
      const bodyRes = parseBlock(lines, i, lines[i].indent);
      stmts.push({ kind: 'for', line: curr.line, raw: text, target, iterExpr, body: bodyRes.stmts });
      i = bodyRes.nextIdx;
      continue;
    }

    if (text.startsWith('while ') || text.startsWith('while(')) {
      const header = stripTrailingColon(text, curr.line);
      const cond = header.slice(5).trim();
      i++;
      if (i >= lines.length || lines[i].indent <= expectedIndent) {
        throw new PyRuntimeError('IndentationError', '縮排錯誤：while 迴圈後方需要縮排程式碼。', curr.line);
      }
      const bodyRes = parseBlock(lines, i, lines[i].indent);
      stmts.push({ kind: 'while', line: curr.line, raw: text, cond, body: bodyRes.stmts });
      i = bodyRes.nextIdx;
      continue;
    }

    if (text.startsWith('def ')) {
      const header = stripTrailingColon(text, curr.line);
      const match = header.match(/^def\s+([A-Za-z_]\w*)\s*\((.*)\)$/);
      if (!match) {
        throw new PyRuntimeError('SyntaxError', '語法錯誤：def 函式定義格式不正確。', curr.line);
      }
      const name = match[1];
      const paramsRaw = match[2].trim();
      const params: { name: string; defaultExpr?: string }[] = [];
      if (paramsRaw !== '') {
        for (const part of splitTopLevelCommas(paramsRaw)) {
          const eqIdx = part.indexOf('=');
          if (eqIdx !== -1) {
            params.push({ name: part.slice(0, eqIdx).trim(), defaultExpr: part.slice(eqIdx + 1).trim() });
          } else {
            params.push({ name: part.trim() });
          }
        }
      }
      i++;
      if (i >= lines.length || lines[i].indent <= expectedIndent) {
        throw new PyRuntimeError('IndentationError', '縮排錯誤：def 函式後方需要縮排程式碼。', curr.line);
      }
      const bodyRes = parseBlock(lines, i, lines[i].indent);
      stmts.push({ kind: 'def', line: curr.line, raw: text, name, params, body: bodyRes.stmts });
      i = bodyRes.nextIdx;
      continue;
    }

    if (text === 'return' || text.startsWith('return ')) {
      const expr = text === 'return' ? null : text.slice(7).trim();
      stmts.push({ kind: 'return', line: curr.line, raw: text, expr });
      i++;
      continue;
    }
    if (text === 'break') {
      stmts.push({ kind: 'break', line: curr.line, raw: text });
      i++;
      continue;
    }
    if (text === 'continue') {
      stmts.push({ kind: 'continue', line: curr.line, raw: text });
      i++;
      continue;
    }
    if (text === 'pass') {
      stmts.push({ kind: 'pass', line: curr.line, raw: text });
      i++;
      continue;
    }

    const assign = splitTopLevelAssign(text);
    if (assign) {
      stmts.push({ kind: 'assign', line: curr.line, raw: text, ...assign });
    } else {
      stmts.push({ kind: 'expr', line: curr.line, raw: text, expr: text });
    }
    i++;
  }

  return { stmts, nextIdx: i };
}

function splitTopLevelCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
  }
  const last = text.slice(start).trim();
  if (last !== '') parts.push(last);
  return parts;
}

// --- Expression Tokenizer & Recursive-Descent Parser ---
type TokType =
  | 'NUM'
  | 'STR'
  | 'FSTR'
  | 'IDENT'
  | 'OP'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACK'
  | 'RBRACK'
  | 'LBRACE'
  | 'RBRACE'
  | 'COMMA'
  | 'COLON'
  | 'DOT'
  | 'EQ'
  | 'EOF';

interface Token {
  type: TokType;
  value: string;
}

function tokenizeExpr(input: string, line?: number): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const twoCharOps = ['**', '//', '==', '!=', '<=', '>='];

  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // f-string
    if ((ch === 'f' || ch === 'F') && (input[i + 1] === '"' || input[i + 1] === "'")) {
      const quote = input[i + 1];
      i += 2;
      let raw = '';
      let closed = false;
      while (i < input.length) {
        if (input[i] === '\\' && i + 1 < input.length) {
          raw += input[i] + input[i + 1];
          i += 2;
          continue;
        }
        if (input[i] === quote) {
          closed = true;
          i++;
          break;
        }
        raw += input[i];
        i++;
      }
      if (!closed) throw new PyRuntimeError('SyntaxError', 'f-string 字串未閉合。', line);
      tokens.push({ type: 'FSTR', value: raw });
      continue;
    }

    // normal string
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let str = '';
      let closed = false;
      while (i < input.length) {
        if (input[i] === '\\' && i + 1 < input.length) {
          const esc = input[i + 1];
          if (esc === 'n') str += '\n';
          else if (esc === 't') str += '\t';
          else if (esc === '\\') str += '\\';
          else if (esc === "'") str += "'";
          else if (esc === '"') str += '"';
          else str += '\\' + esc;
          i += 2;
          continue;
        }
        if (input[i] === quote) {
          closed = true;
          i++;
          break;
        }
        str += input[i];
        i++;
      }
      if (!closed) throw new PyRuntimeError('SyntaxError', '字串引號未正確閉合。', line);
      tokens.push({ type: 'STR', value: str });
      continue;
    }

    // number
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(input[i + 1] || ''))) {
      let numStr = '';
      while (i < input.length && /[0-9._]/.test(input[i])) {
        if (input[i] !== '_') numStr += input[i];
        i++;
      }
      tokens.push({ type: 'NUM', value: numStr });
      continue;
    }

    // identifier or keyword
    if (/[A-Za-z_]/.test(ch)) {
      let ident = '';
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      if (['and', 'or', 'not', 'in', 'is', 'for', 'if', 'else'].includes(ident)) {
        tokens.push({ type: 'OP', value: ident });
      } else {
        tokens.push({ type: 'IDENT', value: ident });
      }
      continue;
    }

    const two = input.slice(i, i + 2);
    if (twoCharOps.includes(two)) {
      tokens.push({ type: 'OP', value: two });
      i += 2;
      continue;
    }

    if ('+-*/%<>'.includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }
    if (ch === '=') {
      tokens.push({ type: 'EQ', value: '=' });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (ch === '[') {
      tokens.push({ type: 'LBRACK', value: '[' });
      i++;
      continue;
    }
    if (ch === ']') {
      tokens.push({ type: 'RBRACK', value: ']' });
      i++;
      continue;
    }
    if (ch === '{') {
      tokens.push({ type: 'LBRACE', value: '{' });
      i++;
      continue;
    }
    if (ch === '}') {
      tokens.push({ type: 'RBRACE', value: '}' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'COLON', value: ':' });
      i++;
      continue;
    }
    if (ch === '.') {
      tokens.push({ type: 'DOT', value: '.' });
      i++;
      continue;
    }

    throw new PyRuntimeError('SyntaxError', `無法辨識的字元 '${ch}'`, line);
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

interface RuntimeContext {
  stdout: string[];
  steps: ExecutionStep[];
  prevVars: Map<string, string>;
  stepCount: number;
  maxSteps: number;
  callDepth: number;
  callBuiltinOrFn: (fn: PyValue, args: PyValue[], kwargs: Record<string, PyValue>, line?: number) => PyValue;
  evalExpr: (expr: string, env: Env, line?: number) => PyValue;
}

function snapshotEnv(env: Env, prevVars: Map<string, string>): VariableSnapshot[] {
  const result: VariableSnapshot[] = [];
  const collectVars = (e: Env) => {
    e.vars.forEach((val, name) => {
      const reprStr = pyRepr(val);
      const prev = prevVars.get(name);
      const isNew = prev === undefined;
      const changed = !isNew && prev !== reprStr;
      let kind: VariableSnapshot['kind'] = 'primitive';
      let items: VariableSnapshot['items'] | undefined = undefined;

      if (val === null) kind = 'none';
      else if (isPyList(val)) {
        kind = 'list';
        items = val.items.map((item, idx) => ({
          keyOrIndex: String(idx),
          repr: pyRepr(item),
          typeName: getPyTypeName(item),
        }));
      } else if (isPyTuple(val)) {
        kind = 'tuple';
        items = val.items.map((item, idx) => ({
          keyOrIndex: String(idx),
          repr: pyRepr(item),
          typeName: getPyTypeName(item),
        }));
      } else if (isPyDict(val)) {
        kind = 'dict';
        items = Array.from(val.entries.values()).map((entry) => ({
          keyOrIndex: pyRepr(entry.key),
          repr: pyRepr(entry.value),
          typeName: getPyTypeName(entry.value),
        }));
      } else if (isPyFunction(val)) {
        kind = 'function';
      }

      result.push({
        name,
        typeName: getPyTypeName(val),
        repr: isPyFunction(val) ? `def ${val.name}(...)` : reprStr,
        changed,
        isNew,
        kind,
        items,
      });
    });
  };
  collectVars(env);
  return result;
}

function updatePrevVars(env: Env, prevVars: Map<string, string>) {
  prevVars.clear();
  env.vars.forEach((val, name) => {
    prevVars.set(name, pyRepr(val));
  });
}

function recordStep(
  ctx: RuntimeContext,
  env: Env,
  line: number,
  code: string,
  insight: string,
  event: ExecutionStep['event']
) {
  ctx.stepCount++;
  if (ctx.stepCount > ctx.maxSteps) {
    throw new PyRuntimeError(
      'RuntimeError',
      `執行步數超過上限 (${ctx.maxSteps} 步)，請檢查是否有無窮迴圈或過深的遞迴。`,
      line
    );
  }
  const variables = snapshotEnv(env, ctx.prevVars);
  updatePrevVars(env, ctx.prevVars);
  ctx.steps.push({
    stepIndex: ctx.steps.length,
    line,
    code,
    insight,
    variables,
    stdout: [...ctx.stdout],
    event,
  });
}

export function runPythonCode(code: string): ExecutionResult {
  const globalEnv = new Env(null, 'global');
  const stdout: string[] = [];
  const steps: ExecutionStep[] = [];
  const prevVars = new Map<string, string>();

  const evalExpr = (exprStr: string, env: Env, line?: number): PyValue => {
    const tokens = tokenizeExpr(exprStr, line);
    let pos = 0;

    const peek = (offset = 0): Token => tokens[pos + offset] || { type: 'EOF', value: '' };
    const consume = (): Token => tokens[pos++];

    const parseExpr = (): PyValue => parseTupleOrSingle();

    const parseTupleOrSingle = (): PyValue => {
      const first = parseConditional();
      if (peek().type === 'COMMA') {
        const items: PyValue[] = [first];
        while (peek().type === 'COMMA') {
          consume();
          if (peek().type === 'EOF' || peek().type === 'RPAREN' || peek().type === 'RBRACK') break;
          items.push(parseConditional());
        }
        return { __pyType: 'tuple', items };
      }
      return first;
    };

    const parseConditional = (): PyValue => {
      const val = parseOr();
      if (peek().type === 'OP' && peek().value === 'if') {
        consume();
        const cond = parseOr();
        if (peek().type !== 'OP' || peek().value !== 'else') {
          throw new PyRuntimeError('SyntaxError', '條件運算式缺少 else。', line);
        }
        consume();
        const elseVal = parseConditional();
        return pyTruthy(cond) ? val : elseVal;
      }
      return val;
    };

    const parseOr = (): PyValue => {
      let left = parseAnd();
      while (peek().type === 'OP' && peek().value === 'or') {
        consume();
        if (pyTruthy(left)) {
          // short-circuit: still need to skip/parse right cleanly; parse right in lazy mode?
          // For simplicity and predictability, evaluate or parse; Python short-circuits!
          // We'll implement a proper AST or evaluate only if falsy; wait—without AST, skipping tokens is easy!
          // Better: let's evaluate right only if !pyTruthy(left), else skip expression tokens balanced.
          skipSubExpr();
          return left;
        }
        left = parseAnd();
      }
      return left;
    };

    const parseAnd = (): PyValue => {
      let left = parseNot();
      while (peek().type === 'OP' && peek().value === 'and') {
        consume();
        if (!pyTruthy(left)) {
          skipSubExpr();
          return left;
        }
        left = parseNot();
      }
      return left;
    };

    const skipSubExpr = () => {
      let depth = 0;
      while (peek().type !== 'EOF') {
        const t = peek();
        if (t.type === 'LPAREN' || t.type === 'LBRACK' || t.type === 'LBRACE') depth++;
        else if (t.type === 'RPAREN' || t.type === 'RBRACK' || t.type === 'RBRACE') {
          if (depth === 0) break;
          depth--;
        } else if (depth === 0 && (t.type === 'COMMA' || t.type === 'COLON' || (t.type === 'OP' && (t.value === 'or' || t.value === 'if' || t.value === 'else' || t.value === 'for')))) {
          break;
        }
        consume();
      }
    };

    const parseNot = (): PyValue => {
      if (peek().type === 'OP' && peek().value === 'not') {
        consume();
        return !pyTruthy(parseNot());
      }
      return parseComparison();
    };

    const parseComparison = (): PyValue => {
      let left = parseAddSub();
      const compOps = ['==', '!=', '<', '<=', '>', '>=', 'in', 'not', 'is'];
      let allTrue = true;
      let hasComp = false;

      while (peek().type === 'OP' && compOps.includes(peek().value)) {
        if (peek().value === 'not' && peek(1).value !== 'in') break;
        hasComp = true;
        let op = consume().value;
        if (op === 'not' && peek().value === 'in') {
          consume();
          op = 'not in';
        } else if (op === 'is' && peek().value === 'not') {
          consume();
          op = 'is not';
        }
        const right = parseAddSub();
        if (allTrue) {
          allTrue = evalComparison(left, op, right, line);
        }
        left = right;
      }

      return hasComp ? allTrue : left;
    };

    const parseAddSub = (): PyValue => {
      let left = parseMulDiv();
      while (peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const right = parseMulDiv();
        if (op === '+') {
          if (typeof left === 'number' && typeof right === 'number') left = left + right;
          else if (typeof left === 'string' && typeof right === 'string') left = left + right;
          else if (isPyList(left) && isPyList(right)) {
            left = { __pyType: 'list', items: [...left.items, ...right.items] };
          } else if (isPyTuple(left) && isPyTuple(right)) {
            left = { __pyType: 'tuple', items: [...left.items, ...right.items] };
          } else {
            throw new PyRuntimeError(
              'TypeError',
              `無法將 '${getPyTypeName(left)}' 與 '${getPyTypeName(right)}' 相加`,
              line
            );
          }
        } else {
          if (typeof left === 'number' && typeof right === 'number') left = left - right;
          else {
            throw new PyRuntimeError(
              'TypeError',
              `無法將 '${getPyTypeName(left)}' 與 '${getPyTypeName(right)}' 相減`,
              line
            );
          }
        }
      }
      return left;
    };

    const parseMulDiv = (): PyValue => {
      let left = parseUnary();
      while (peek().type === 'OP' && ['*', '/', '//', '%'].includes(peek().value)) {
        const op = consume().value;
        const right = parseUnary();
        if (op === '*') {
          if (typeof left === 'number' && typeof right === 'number') left = left * right;
          else if (typeof left === 'string' && typeof right === 'number') {
            left = left.repeat(Math.max(0, Math.floor(right)));
          } else if (typeof left === 'number' && typeof right === 'string') {
            left = right.repeat(Math.max(0, Math.floor(left)));
          } else if (isPyList(left) && typeof right === 'number') {
            const items: PyValue[] = [];
            for (let k = 0; k < Math.max(0, Math.floor(right)); k++) items.push(...left.items);
            left = { __pyType: 'list', items };
          } else {
            throw new PyRuntimeError('TypeError', `不支援的乘法型別 '${getPyTypeName(left)}' * '${getPyTypeName(right)}'`, line);
          }
        } else if (op === '/') {
          if (typeof left === 'number' && typeof right === 'number') {
            if (right === 0) throw new PyRuntimeError('ZeroDivisionError', '除數不可為 0 (division by zero)', line);
            left = left / right;
          } else {
            throw new PyRuntimeError('TypeError', '除法運算僅支援數字型別', line);
          }
        } else if (op === '//') {
          if (typeof left === 'number' && typeof right === 'number') {
            if (right === 0) throw new PyRuntimeError('ZeroDivisionError', '整數除法的除數不可為 0', line);
            left = Math.floor(left / right);
          } else {
            throw new PyRuntimeError('TypeError', '整數除法運算僅支援數字型別', line);
          }
        } else if (op === '%') {
          if (typeof left === 'number' && typeof right === 'number') {
            if (right === 0) throw new PyRuntimeError('ZeroDivisionError', '取餘數的除數不可為 0', line);
            left = ((left % right) + right) % right;
          } else {
            throw new PyRuntimeError('TypeError', '取餘數運算僅支援數字型別', line);
          }
        }
      }
      return left;
    };

    const parseUnary = (): PyValue => {
      if (peek().type === 'OP' && peek().value === '-') {
        consume();
        const val = parseUnary();
        if (typeof val === 'number') return -val;
        if (typeof val === 'boolean') return -(val ? 1 : 0);
        throw new PyRuntimeError('TypeError', `型別 '${getPyTypeName(val)}' 不支援負號運算`, line);
      }
      if (peek().type === 'OP' && peek().value === '+') {
        consume();
        const val = parseUnary();
        if (typeof val === 'number') return +val;
        throw new PyRuntimeError('TypeError', `型別 '${getPyTypeName(val)}' 不支援正號運算`, line);
      }
      return parsePower();
    };

    const parsePower = (): PyValue => {
      const base = parsePostfix();
      if (peek().type === 'OP' && peek().value === '**') {
        consume();
        const exp = parseUnary();
        if (typeof base === 'number' && typeof exp === 'number') {
          return Math.pow(base, exp);
        }
        throw new PyRuntimeError('TypeError', '次方運算 (**) 僅支援數字型別', line);
      }
      return base;
    };

    const parsePostfix = (): PyValue => {
      let val = parsePrimary();
      while (true) {
        if (peek().type === 'LPAREN') {
          consume();
          const args: PyValue[] = [];
          const kwargs: Record<string, PyValue> = {};
          while (peek().type !== 'RPAREN') {
            if (peek().type === 'IDENT' && peek(1).type === 'EQ') {
              const kwName = consume().value;
              consume(); // =
              kwargs[kwName] = parseConditional();
            } else {
              args.push(parseConditional());
            }
            if (peek().type === 'COMMA') consume();
            else break;
          }
          if (peek().type !== 'RPAREN') {
            throw new PyRuntimeError('SyntaxError', '函式呼叫缺少右括號 ")"', line);
          }
          consume();
          val = ctx.callBuiltinOrFn(val, args, kwargs, line);
        } else if (peek().type === 'LBRACK') {
          consume();
          val = evalSubscriptOrSlice(val, line);
        } else if (peek().type === 'DOT') {
          consume();
          const attrToken = consume();
          if (attrToken.type !== 'IDENT') {
            throw new PyRuntimeError('SyntaxError', '點號 "." 後方必須為屬性或方法名稱', line);
          }
          const methodName = attrToken.value;
          if (peek().type === 'LPAREN') {
            consume();
            const args: PyValue[] = [];
            while (peek().type !== 'RPAREN') {
              args.push(parseConditional());
              if (peek().type === 'COMMA') consume();
              else break;
            }
            if (peek().type !== 'RPAREN') {
              throw new PyRuntimeError('SyntaxError', '方法呼叫缺少右括號 ")"', line);
            }
            consume();
            val = callMethod(val, methodName, args, line);
          } else {
            throw new PyRuntimeError('AttributeError', `'${getPyTypeName(val)}' 沒有屬性 '${methodName}'`, line);
          }
        } else {
          break;
        }
      }
      return val;
    };

    const evalSubscriptOrSlice = (target: PyValue, ln?: number): PyValue => {
      let start: PyValue = null;
      let stop: PyValue = null;
      let step: PyValue = null;
      let isSlice = false;

      if (peek().type === 'COLON') {
        isSlice = true;
      } else {
        start = parseConditional();
        if (peek().type === 'COLON') isSlice = true;
      }

      if (isSlice) {
        consume(); // first ':'
        if (peek().type !== 'COLON' && peek().type !== 'RBRACK') {
          stop = parseConditional();
        }
        if (peek().type === 'COLON') {
          consume();
          if (peek().type !== 'RBRACK') {
            step = parseConditional();
          }
        }
        if (peek().type !== 'RBRACK') throw new PyRuntimeError('SyntaxError', '切片缺少右中括號 "]"', ln);
        consume();
        return applySlice(target, start, stop, step, ln);
      }

      if (peek().type !== 'RBRACK') throw new PyRuntimeError('SyntaxError', '索引缺少右中括號 "]"', ln);
      consume();
      return applyIndex(target, start, ln);
    };

    const parsePrimary = (): PyValue => {
      const tok = peek();

      if (tok.type === 'NUM') {
        consume();
        return Number(tok.value);
      }

      if (tok.type === 'STR') {
        consume();
        return tok.value;
      }

      if (tok.type === 'FSTR') {
        consume();
        return evalFString(tok.value, env, line);
      }

      if (tok.type === 'IDENT') {
        consume();
        if (tok.value === 'True') return true;
        if (tok.value === 'False') return false;
        if (tok.value === 'None') return null;

        const lookup = env.get(tok.value);
        if (lookup.found) return lookup.value;
        if (isBuiltinName(tok.value)) return { __pyType: 'function', name: `__builtin_${tok.value}`, params: [], body: [], closureEnv: env };
        throw new PyRuntimeError('NameError', `名稱 '${tok.value}' 尚未定義 (NameError)`, line);
      }

      if (tok.type === 'LPAREN') {
        consume();
        if (peek().type === 'RPAREN') {
          consume();
          return { __pyType: 'tuple', items: [] };
        }
        const first = parseConditional();
        if (peek().type === 'COMMA') {
          const items: PyValue[] = [first];
          while (peek().type === 'COMMA') {
            consume();
            if (peek().type === 'RPAREN') break;
            items.push(parseConditional());
          }
          if (peek().type !== 'RPAREN') throw new PyRuntimeError('SyntaxError', '括號未閉合 ")"', line);
          consume();
          return { __pyType: 'tuple', items };
        }
        if (peek().type !== 'RPAREN') throw new PyRuntimeError('SyntaxError', '括號未閉合 ")"', line);
        consume();
        return first;
      }

      if (tok.type === 'LBRACK') {
        consume();
        if (peek().type === 'RBRACK') {
          consume();
          return { __pyType: 'list', items: [] };
        }
        // Detect list comprehension: [expr for var in iter (if cond)?]
        const rawSliceStart = pos;
        let depth = 0;
        let hasFor = false;
        let scan = pos;
        while (scan < tokens.length) {
          const t = tokens[scan];
          if (t.type === 'LBRACK' || t.type === 'LPAREN' || t.type === 'LBRACE') depth++;
          else if (t.type === 'RBRACK' || t.type === 'RPAREN' || t.type === 'RBRACE') {
            if (depth === 0 && t.type === 'RBRACK') break;
            depth--;
          } else if (depth === 0 && t.type === 'OP' && t.value === 'for') {
            hasFor = true;
            break;
          }
          scan++;
        }

        if (hasFor) {
          return parseListComprehension(tokens, rawSliceStart, env, line);
        }

        const items: PyValue[] = [];
        while (peek().type !== 'RBRACK') {
          items.push(parseConditional());
          if (peek().type === 'COMMA') consume();
          else break;
        }
        if (peek().type !== 'RBRACK') throw new PyRuntimeError('SyntaxError', '串列缺少右括號 "]"', line);
        consume();
        return { __pyType: 'list', items };
      }

      if (tok.type === 'LBRACE') {
        consume();
        const entries = new Map<string, { key: PyValue; value: PyValue }>();
        if (peek().type === 'RBRACE') {
          consume();
          return { __pyType: 'dict', entries };
        }
        while (peek().type !== 'RBRACE') {
          const key = parseConditional();
          if (peek().type !== 'COLON') throw new PyRuntimeError('SyntaxError', '字典項目必須包含冒號 ":"', line);
          consume();
          const val = parseConditional();
          entries.set(dictKeyId(key, line), { key, value: val });
          if (peek().type === 'COMMA') consume();
          else break;
        }
        if (peek().type !== 'RBRACE') throw new PyRuntimeError('SyntaxError', '字典缺少右大括號 "}"', line);
        consume();
        return { __pyType: 'dict', entries };
      }

      throw new PyRuntimeError('SyntaxError', `無效的運算式語法 (${tok.value || 'EOF'})`, line);
    };

    const parseListComprehension = (allToks: Token[], startPos: number, outerEnv: Env, ln?: number): PyValue => {
      // Extract raw slices from original exprStr by finding matching '[' ... ']'
      // Simpler: rebuild token strings between brackets!
      let depth = 0;
      const bodyToks: Token[] = [];
      let idx = startPos;
      while (idx < allToks.length) {
        const t = allToks[idx];
        if (t.type === 'LBRACK' || t.type === 'LPAREN' || t.type === 'LBRACE') depth++;
        else if (t.type === 'RBRACK' || t.type === 'RPAREN' || t.type === 'RBRACE') {
          if (depth === 0 && t.type === 'RBRACK') {
            idx++;
            break;
          }
          depth--;
        }
        bodyToks.push(t);
        idx++;
      }
      pos = idx;

      const formatToks = (ts: Token[]) =>
        ts
          .map((t) => {
            if (t.type === 'STR') return JSON.stringify(t.value);
            if (t.type === 'FSTR') return `f${JSON.stringify(t.value)}`;
            return t.value;
          })
          .join(' ');

      const forIdx = bodyToks.findIndex((t) => t.type === 'OP' && t.value === 'for');
      const inIdx = bodyToks.findIndex((t, k) => k > forIdx && t.type === 'OP' && t.value === 'in');
      const ifIdx = bodyToks.findIndex((t, k) => k > inIdx && t.type === 'OP' && t.value === 'if');

      if (forIdx === -1 || inIdx === -1) {
        throw new PyRuntimeError('SyntaxError', '串列生成式語法不完整', ln);
      }

      const exprPart = formatToks(bodyToks.slice(0, forIdx));
      const targetName = bodyToks
        .slice(forIdx + 1, inIdx)
        .map((t) => t.value)
        .join('');
      const iterPart = formatToks(ifIdx === -1 ? bodyToks.slice(inIdx + 1) : bodyToks.slice(inIdx + 1, ifIdx));
      const condPart = ifIdx === -1 ? null : formatToks(bodyToks.slice(ifIdx + 1));

      const iterVal = evalExpr(iterPart, outerEnv, ln);
      const iterItems = toIterable(iterVal, ln);
      const compEnv = new Env(outerEnv, 'comprehension');
      const out: PyValue[] = [];
      for (const item of iterItems) {
        assignTarget(targetName, item, compEnv, ln);
        if (condPart) {
          if (!pyTruthy(evalExpr(condPart, compEnv, ln))) continue;
        }
        out.push(evalExpr(exprPart, compEnv, ln));
      }
      return { __pyType: 'list', items: out };
    };

    const result = parseExpr();
    if (peek().type !== 'EOF') {
      throw new PyRuntimeError('SyntaxError', `運算式後方出現多餘語法 '${peek().value}'`, line);
    }
    return result;
  };

  const evalFString = (raw: string, env: Env, line?: number): string => {
    let out = '';
    let i = 0;
    while (i < raw.length) {
      if (raw[i] === '\\' && i + 1 < raw.length) {
        const esc = raw[i + 1];
        if (esc === 'n') out += '\n';
        else if (esc === 't') out += '\t';
        else out += esc;
        i += 2;
        continue;
      }
      if (raw[i] === '{') {
        if (raw[i + 1] === '{') {
          out += '{';
          i += 2;
          continue;
        }
        let depth = 1;
        let j = i + 1;
        while (j < raw.length && depth > 0) {
          if (raw[j] === '{') depth++;
          else if (raw[j] === '}') depth--;
          j++;
        }
        if (depth !== 0) throw new PyRuntimeError('SyntaxError', 'f-string 大括號未閉合', line);
        const inside = raw.slice(i + 1, j - 1);
        let exprPart = inside;
        let fmtSpec = '';
        const colonIdx = findTopLevelColon(inside);
        if (colonIdx !== -1) {
          exprPart = inside.slice(0, colonIdx);
          fmtSpec = inside.slice(colonIdx + 1).trim();
        }
        const val = evalExpr(exprPart, env, line);
        out += formatValueWithSpec(val, fmtSpec);
        i = j;
        continue;
      }
      if (raw[i] === '}' && raw[i + 1] === '}') {
        out += '}';
        i += 2;
        continue;
      }
      out += raw[i];
      i++;
    }
    return out;
  };

  const findTopLevelColon = (str: string): number => {
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
      if ('([{'.includes(str[i])) depth++;
      else if (')]}'.includes(str[i])) depth--;
      else if (str[i] === ':' && depth === 0) return i;
    }
    return -1;
  };

  const formatValueWithSpec = (val: PyValue, spec: string): string => {
    if (!spec) return pyToString(val);
    const fixedMatch = spec.match(/^\.(\d+)f$/);
    if (fixedMatch && typeof val === 'number') {
      return val.toFixed(Number(fixedMatch[1]));
    }
    const padMatch = spec.match(/^([<>^]?)(\d+)$/);
    if (padMatch) {
      const align = padMatch[1] || (typeof val === 'number' ? '>' : '<');
      const width = Number(padMatch[2]);
      const str = pyToString(val);
      if (str.length >= width) return str;
      const diff = width - str.length;
      if (align === '>') return ' '.repeat(diff) + str;
      if (align === '<') return str + ' '.repeat(diff);
      const left = Math.floor(diff / 2);
      return ' '.repeat(left) + str + ' '.repeat(diff - left);
    }
    return pyToString(val);
  };

  const ctx: RuntimeContext = {
    stdout,
    steps,
    prevVars,
    stepCount: 0,
    maxSteps: 1200,
    callDepth: 0,
    evalExpr,
    callBuiltinOrFn: (fn, args, kwargs, line) => {
      if (!isPyFunction(fn)) {
        throw new PyRuntimeError('TypeError', `'${getPyTypeName(fn)}' 型別不可呼叫 (not callable)`, line);
      }
      if (fn.name.startsWith('__builtin_')) {
        const bName = fn.name.slice('__builtin_'.length);
        return execBuiltin(bName, args, kwargs, stdout, line);
      }
      if (ctx.callDepth > 60) {
        throw new PyRuntimeError('RecursionError', '遞迴呼叫層數超過上限 (60 層)', line);
      }
      ctx.callDepth++;
      const fnEnv = new Env(fn.closureEnv, fn.name);
      for (let idx = 0; idx < fn.params.length; idx++) {
        const param = fn.params[idx];
        if (idx < args.length) {
          fnEnv.setLocal(param.name, args[idx]);
        } else if (param.name in kwargs) {
          fnEnv.setLocal(param.name, kwargs[param.name]);
        } else if (param.defaultExpr !== undefined) {
          fnEnv.setLocal(param.name, evalExpr(param.defaultExpr, fn.closureEnv, line));
        } else {
          throw new PyRuntimeError('TypeError', `函式 ${fn.name}() 缺少必要參數 '${param.name}'`, line);
        }
      }
      if (args.length > fn.params.length) {
        throw new PyRuntimeError(
          'TypeError',
          `函式 ${fn.name}() 只需要 ${fn.params.length} 個參數，但收到了 ${args.length} 個`,
          line
        );
      }

      try {
        execBlock(fn.body, fnEnv);
        ctx.callDepth--;
        return null;
      } catch (sig) {
        ctx.callDepth--;
        if (sig instanceof ReturnSignal) {
          return sig.value;
        }
        throw sig;
      }
    },
  };

  const assignTarget = (target: string, val: PyValue, env: Env, line?: number) => {
    const cleanTarget = target.trim();
    // Subscript assignment: a[idx] = val
    const subMatch = cleanTarget.match(/^([A-Za-z_]\w*)\[(.*)\]$/);
    if (subMatch) {
      const varName = subMatch[1];
      const keyExpr = subMatch[2];
      const lookup = env.get(varName);
      if (!lookup.found) throw new PyRuntimeError('NameError', `名稱 '${varName}' 尚未定義`, line);
      const container = lookup.value;
      const keyVal = evalExpr(keyExpr, env, line);
      if (isPyList(container)) {
        if (typeof keyVal !== 'number' || !Number.isInteger(keyVal)) {
          throw new PyRuntimeError('TypeError', '串列索引必須為整數', line);
        }
        const idx = keyVal < 0 ? container.items.length + keyVal : keyVal;
        if (idx < 0 || idx >= container.items.length) {
          throw new PyRuntimeError('IndexError', `串列索引 ${keyVal} 超出範圍`, line);
        }
        container.items[idx] = val;
        return;
      }
      if (isPyDict(container)) {
        container.entries.set(dictKeyId(keyVal, line), { key: keyVal, value: val });
        return;
      }
      throw new PyRuntimeError('TypeError', `'${getPyTypeName(container)}' 型別不支援索引修改`, line);
    }

    // Tuple unpacking: a, b = ... or i, (n, s) = ...
    let strippedTarget = cleanTarget;
    if (strippedTarget.startsWith('(') && strippedTarget.endsWith(')')) {
      let depth = 0;
      let enclosesAll = true;
      for (let i = 0; i < strippedTarget.length - 1; i++) {
        if (strippedTarget[i] === '(') depth++;
        else if (strippedTarget[i] === ')') depth--;
        if (depth === 0) {
          enclosesAll = false;
          break;
        }
      }
      if (enclosesAll) {
        strippedTarget = strippedTarget.slice(1, -1).trim();
      }
    }
    if (strippedTarget.includes(',')) {
      const names = splitTopLevelCommas(strippedTarget);
      const items = toIterable(val, line);
      if (items.length !== names.length) {
        throw new PyRuntimeError(
          'ValueError',
          `解構賦值數量不符：需要 ${names.length} 個值，但取得 ${items.length} 個`,
          line
        );
      }
      names.forEach((n, idx) => assignTarget(n, items[idx], env, line));
      return;
    }

    if (!/^[A-Za-z_]\w*$/.test(cleanTarget)) {
      throw new PyRuntimeError('SyntaxError', `無效的變數名稱 '${cleanTarget}'`, line);
    }
    env.setLocal(cleanTarget, val);
  };

  const applyAugmentedOp = (left: PyValue, op: string, right: PyValue, line?: number): PyValue => {
    const baseOp = op.slice(0, -1);
    if (baseOp === '+') {
      if (typeof left === 'number' && typeof right === 'number') return left + right;
      if (typeof left === 'string' && typeof right === 'string') return left + right;
      if (isPyList(left) && isPyList(right)) {
        left.items.push(...right.items);
        return left;
      }
    }
    if (baseOp === '-' && typeof left === 'number' && typeof right === 'number') return left - right;
    if (baseOp === '*' && typeof left === 'number' && typeof right === 'number') return left * right;
    if (baseOp === '*' && typeof left === 'string' && typeof right === 'number') return left.repeat(Math.max(0, Math.floor(right)));
    if (baseOp === '/' && typeof left === 'number' && typeof right === 'number') {
      if (right === 0) throw new PyRuntimeError('ZeroDivisionError', '除數不可為 0', line);
      return left / right;
    }
    if (baseOp === '//' && typeof left === 'number' && typeof right === 'number') {
      if (right === 0) throw new PyRuntimeError('ZeroDivisionError', '除數不可為 0', line);
      return Math.floor(left / right);
    }
    if (baseOp === '%' && typeof left === 'number' && typeof right === 'number') {
      if (right === 0) throw new PyRuntimeError('ZeroDivisionError', '除數不可為 0', line);
      return ((left % right) + right) % right;
    }
    if (baseOp === '**' && typeof left === 'number' && typeof right === 'number') return Math.pow(left, right);
    throw new PyRuntimeError('TypeError', `不支援的運算 '${getPyTypeName(left)}' ${op} '${getPyTypeName(right)}'`, line);
  };

  const execBlock = (stmts: Stmt[], env: Env) => {
    for (const stmt of stmts) {
      execStmt(stmt, env);
    }
  };

  const execStmt = (stmt: Stmt, env: Env) => {
    switch (stmt.kind) {
      case 'pass':
        recordStep(ctx, env, stmt.line, stmt.raw, 'pass：略過此行，不進行任何操作', 'info');
        return;

      case 'break':
        recordStep(ctx, env, stmt.line, stmt.raw, '執行 break：立即跳出目前所在的迴圈', 'loop');
        throw new BreakSignal();

      case 'continue':
        recordStep(ctx, env, stmt.line, stmt.raw, '執行 continue：跳過本次剩餘程式碼，進入下一輪迴圈', 'loop');
        throw new ContinueSignal();

      case 'return': {
        const val = stmt.expr !== null ? evalExpr(stmt.expr, env, stmt.line) : null;
        recordStep(ctx, env, stmt.line, stmt.raw, `函式回傳值：${pyRepr(val)}`, 'return');
        throw new ReturnSignal(val);
      }

      case 'def': {
        const fn: PyFunction = {
          __pyType: 'function',
          name: stmt.name,
          params: stmt.params,
          body: stmt.body,
          closureEnv: env,
        };
        env.setLocal(stmt.name, fn);
        recordStep(ctx, env, stmt.line, stmt.raw, `定義函式 ${stmt.name}(${stmt.params.map((p) => p.name).join(', ')})`, 'assign');
        return;
      }

      case 'assign': {
        const rhsVal = evalExpr(stmt.expr, env, stmt.line);
        if (stmt.op === '=') {
          assignTarget(stmt.target, rhsVal, env, stmt.line);
          recordStep(
            ctx,
            env,
            stmt.line,
            stmt.raw,
            `將變數 ${stmt.target} 設為 ${pyRepr(rhsVal)} (${getPyTypeName(rhsVal)})`,
            'assign'
          );
        } else {
          const currentVal = evalExpr(stmt.target, env, stmt.line);
          const nextVal = applyAugmentedOp(currentVal, stmt.op, rhsVal, stmt.line);
          assignTarget(stmt.target, nextVal, env, stmt.line);
          recordStep(
            ctx,
            env,
            stmt.line,
            stmt.raw,
            `更新 ${stmt.target}（${pyRepr(currentVal)} ${stmt.op.slice(0, -1)} ${pyRepr(rhsVal)} → ${pyRepr(nextVal)}）`,
            'assign'
          );
        }
        return;
      }

      case 'expr': {
        const prevLen = stdout.length;
        const val = evalExpr(stmt.expr, env, stmt.line);
        const printed = stdout.length > prevLen;
        let insight = `執行運算式：${stmt.raw}`;
        if (printed) {
          insight = `輸出到終端機：${stdout[stdout.length - 1]}`;
        } else if (stmt.raw.includes('.append(') || stmt.raw.includes('.pop(') || stmt.raw.includes('.sort(') || stmt.raw.includes('.insert(') || stmt.raw.includes('.remove(')) {
          insight = `呼叫方法修改資料結構：${stmt.raw}`;
        } else if (val !== null) {
          insight = `計算結果為 ${pyRepr(val)}`;
        }
        recordStep(ctx, env, stmt.line, stmt.raw, insight, printed ? 'output' : 'mutate');
        return;
      }

      case 'if': {
        for (const branch of stmt.branches) {
          if (branch.cond === null) {
            recordStep(ctx, env, branch.line, branch.raw, '前面條件皆為 False，進入 else 分支', 'branch');
            execBlock(branch.body, env);
            return;
          }
          const condVal = evalExpr(branch.cond, env, branch.line);
          const truth = pyTruthy(condVal);
          recordStep(
            ctx,
            env,
            branch.line,
            branch.raw,
            `判斷條件 (${branch.cond}) → ${truth ? 'True（成立，進入區塊）' : 'False（不成立，跳過）'}`,
            'branch'
          );
          if (truth) {
            execBlock(branch.body, env);
            return;
          }
        }
        return;
      }

      case 'for': {
        const iterVal = evalExpr(stmt.iterExpr, env, stmt.line);
        const items = toIterable(iterVal, stmt.line);
        if (items.length === 0) {
          recordStep(ctx, env, stmt.line, stmt.raw, `可迭代物件為空，略過 for 迴圈`, 'loop');
          return;
        }
        for (let idx = 0; idx < items.length; idx++) {
          assignTarget(stmt.target, items[idx], env, stmt.line);
          recordStep(
            ctx,
            env,
            stmt.line,
            stmt.raw,
            `for 迴圈第 ${idx + 1}/${items.length} 輪：${stmt.target} = ${pyRepr(items[idx])}`,
            'loop'
          );
          try {
            execBlock(stmt.body, env);
          } catch (sig) {
            if (sig instanceof BreakSignal) break;
            if (sig instanceof ContinueSignal) continue;
            throw sig;
          }
        }
        return;
      }

      case 'while': {
        let iter = 0;
        while (true) {
          const condVal = evalExpr(stmt.cond, env, stmt.line);
          const truth = pyTruthy(condVal);
          recordStep(
            ctx,
            env,
            stmt.line,
            stmt.raw,
            `while 條件 (${stmt.cond}) → ${truth ? `True（執行第 ${iter + 1} 輪）` : 'False（結束迴圈）'}`,
            'loop'
          );
          if (!truth) break;
          iter++;
          try {
            execBlock(stmt.body, env);
          } catch (sig) {
            if (sig instanceof BreakSignal) break;
            if (sig instanceof ContinueSignal) continue;
            throw sig;
          }
        }
        return;
      }
    }
  };

  try {
    const logicalLines = preprocessLines(code);
    if (logicalLines.length === 0) {
      return { success: true, stdout: [], steps: [], finalVariables: {} };
    }
    if (logicalLines[0].indent !== 0) {
      throw new PyRuntimeError('IndentationError', '縮排錯誤：第一行程式碼不應該有縮排。', logicalLines[0].line);
    }
    const { stmts } = parseBlock(logicalLines, 0, 0);
    execBlock(stmts, globalEnv);
    const finalVariables: Record<string, PyValue> = {};
    globalEnv.vars.forEach((v, k) => {
      finalVariables[k] = v;
    });
    return {
      success: true,
      stdout,
      steps,
      finalVariables,
    };
  } catch (err) {
    if (err instanceof ReturnSignal) {
      return {
        success: false,
        stdout,
        steps,
        finalVariables: {},
        error: { type: 'SyntaxError', message: 'return 只能使用在函式 (def) 內部。' },
      };
    }
    if (err instanceof BreakSignal || err instanceof ContinueSignal) {
      return {
        success: false,
        stdout,
        steps,
        finalVariables: {},
        error: { type: 'SyntaxError', message: 'break / continue 只能使用在迴圈 (for / while) 內部。' },
      };
    }
    if (err instanceof PyRuntimeError) {
      return {
        success: false,
        stdout,
        steps,
        finalVariables: {},
        error: {
          type: err.pyType,
          message: err.message,
          line: err.line,
        },
      };
    }
    return {
      success: false,
      stdout,
      steps,
      finalVariables: {},
      error: {
        type: 'Error',
        message: err instanceof Error ? err.message : '未知執行錯誤',
      },
    };
  }
}

function evalComparison(left: PyValue, op: string, right: PyValue, line?: number): boolean {
  switch (op) {
    case '==':
      return pyEquals(left, right);
    case '!=':
      return !pyEquals(left, right);
    case 'is':
      return left === right;
    case 'is not':
      return left !== right;
    case '<':
    case '<=':
    case '>':
    case '>=': {
      if ((typeof left === 'number' && typeof right === 'number') || (typeof left === 'string' && typeof right === 'string')) {
        if (op === '<') return left < right;
        if (op === '<=') return left <= right;
        if (op === '>') return left > right;
        return left >= right;
      }
      throw new PyRuntimeError('TypeError', `無法比較 '${getPyTypeName(left)}' 與 '${getPyTypeName(right)}'`, line);
    }
    case 'in':
      return checkIn(left, right, line);
    case 'not in':
      return !checkIn(left, right, line);
    default:
      return false;
  }
}

function checkIn(item: PyValue, container: PyValue, line?: number): boolean {
  if (typeof container === 'string') {
    if (typeof item !== 'string') throw new PyRuntimeError('TypeError', '字串成員檢查需要字串型別', line);
    return container.includes(item);
  }
  if (isPyList(container) || isPyTuple(container)) {
    return container.items.some((el) => pyEquals(el, item));
  }
  if (isPyDict(container)) {
    return container.entries.has(dictKeyId(item, line));
  }
  throw new PyRuntimeError('TypeError', `'${getPyTypeName(container)}' 型別不支援 in 運算子`, line);
}

function toIterable(val: PyValue, line?: number): PyValue[] {
  if (isPyList(val) || isPyTuple(val)) return [...val.items];
  if (typeof val === 'string') return val.split('');
  if (isPyDict(val)) return Array.from(val.entries.values()).map((e) => e.key);
  throw new PyRuntimeError('TypeError', `'${getPyTypeName(val)}' 型別不可迭代 (not iterable)`, line);
}

function applyIndex(target: PyValue, index: PyValue, line?: number): PyValue {
  if (isPyDict(target)) {
    const key = dictKeyId(index, line);
    const entry = target.entries.get(key);
    if (!entry) throw new PyRuntimeError('KeyError', `字典中找不到鍵值 ${pyRepr(index)}`, line);
    return entry.value;
  }
  if (typeof index !== 'number' || !Number.isInteger(index)) {
    throw new PyRuntimeError('TypeError', '索引值必須為整數 (int)', line);
  }
  if (typeof target === 'string') {
    const idx = index < 0 ? target.length + index : index;
    if (idx < 0 || idx >= target.length) throw new PyRuntimeError('IndexError', `字串索引 ${index} 超出範圍`, line);
    return target[idx];
  }
  if (isPyList(target) || isPyTuple(target)) {
    const idx = index < 0 ? target.items.length + index : index;
    if (idx < 0 || idx >= target.items.length) throw new PyRuntimeError('IndexError', `索引 ${index} 超出範圍`, line);
    return target.items[idx];
  }
  throw new PyRuntimeError('TypeError', `'${getPyTypeName(target)}' 型別不支援索引操作`, line);
}

function applySlice(target: PyValue, start: PyValue, stop: PyValue, step: PyValue, line?: number): PyValue {
  const stepNum = step === null ? 1 : Number(step);
  if (!Number.isInteger(stepNum) || stepNum === 0) {
    throw new PyRuntimeError('ValueError', '切片步長 (step) 必須是非零整數', line);
  }

  const sliceArray = <T>(arr: T[]): T[] => {
    const len = arr.length;
    let s = start === null ? (stepNum > 0 ? 0 : len - 1) : Number(start);
    let e = stop === null ? (stepNum > 0 ? len : -len - 1) : Number(stop);
    if (s < 0) s += len;
    if (e < 0) e += len;
    if (stepNum > 0) {
      s = Math.max(0, Math.min(len, s));
      e = Math.max(0, Math.min(len, e));
      const res: T[] = [];
      for (let i = s; i < e; i += stepNum) res.push(arr[i]);
      return res;
    } else {
      s = Math.max(-1, Math.min(len - 1, s));
      e = Math.max(-1, Math.min(len - 1, e));
      const res: T[] = [];
      for (let i = s; i > e; i += stepNum) res.push(arr[i]);
      return res;
    }
  };

  if (typeof target === 'string') return sliceArray(target.split('')).join('');
  if (isPyList(target)) return { __pyType: 'list', items: sliceArray(target.items) };
  if (isPyTuple(target)) return { __pyType: 'tuple', items: sliceArray(target.items) };
  throw new PyRuntimeError('TypeError', `'${getPyTypeName(target)}' 型別不支援切片`, line);
}

function callMethod(target: PyValue, method: string, args: PyValue[], line?: number): PyValue {
  if (typeof target === 'string') {
    switch (method) {
      case 'upper':
        return target.toUpperCase();
      case 'lower':
        return target.toLowerCase();
      case 'strip':
        return target.trim();
      case 'lstrip':
        return target.trimStart();
      case 'rstrip':
        return target.trimEnd();
      case 'title':
        return target.replace(/\b\w/g, (c) => c.toUpperCase());
      case 'split': {
        const sep = args[0];
        if (sep === undefined) return { __pyType: 'list', items: target.trim() ? target.trim().split(/\s+/) : [] };
        return { __pyType: 'list', items: target.split(String(sep)) };
      }
      case 'join': {
        const items = toIterable(args[0], line);
        return items.map((i) => pyToString(i)).join(target);
      }
      case 'replace':
        return target.split(String(args[0] ?? '')).join(String(args[1] ?? ''));
      case 'startswith':
        return target.startsWith(String(args[0] ?? ''));
      case 'endswith':
        return target.endsWith(String(args[0] ?? ''));
      case 'find':
        return target.indexOf(String(args[0] ?? ''));
      case 'count': {
        const sub = String(args[0] ?? '');
        if (!sub) return target.length + 1;
        return target.split(sub).length - 1;
      }
      default:
        throw new PyRuntimeError('AttributeError', `字串沒有方法 '.${method}()'`, line);
    }
  }

  if (isPyList(target)) {
    switch (method) {
      case 'append':
        if (args.length !== 1) throw new PyRuntimeError('TypeError', 'append() 需要恰好 1 個參數', line);
        target.items.push(args[0]);
        return null;
      case 'pop': {
        if (target.items.length === 0) throw new PyRuntimeError('IndexError', '無法從空串列執行 pop()', line);
        if (args.length === 0) return target.items.pop()!;
        const idx = Number(args[0]);
        const realIdx = idx < 0 ? target.items.length + idx : idx;
        if (realIdx < 0 || realIdx >= target.items.length) throw new PyRuntimeError('IndexError', 'pop 索引超出範圍', line);
        return target.items.splice(realIdx, 1)[0];
      }
      case 'insert': {
        const idx = Number(args[0]);
        const realIdx = idx < 0 ? Math.max(0, target.items.length + idx) : Math.min(target.items.length, idx);
        target.items.splice(realIdx, 0, args[1]);
        return null;
      }
      case 'remove': {
        const idx = target.items.findIndex((item) => pyEquals(item, args[0]));
        if (idx === -1) throw new PyRuntimeError('ValueError', `串列中找不到 ${pyRepr(args[0])}`, line);
        target.items.splice(idx, 1);
        return null;
      }
      case 'sort':
        target.items.sort((a, b) => (a! < b! ? -1 : a! > b! ? 1 : 0));
        return null;
      case 'reverse':
        target.items.reverse();
        return null;
      case 'clear':
        target.items = [];
        return null;
      case 'index': {
        const idx = target.items.findIndex((item) => pyEquals(item, args[0]));
        if (idx === -1) throw new PyRuntimeError('ValueError', `串列中找不到 ${pyRepr(args[0])}`, line);
        return idx;
      }
      case 'count':
        return target.items.filter((item) => pyEquals(item, args[0])).length;
      default:
        throw new PyRuntimeError('AttributeError', `串列沒有方法 '.${method}()'`, line);
    }
  }

  if (isPyDict(target)) {
    switch (method) {
      case 'get': {
        const entry = target.entries.get(dictKeyId(args[0], line));
        return entry ? entry.value : args[1] ?? null;
      }
      case 'keys':
        return { __pyType: 'list', items: Array.from(target.entries.values()).map((e) => e.key) };
      case 'values':
        return { __pyType: 'list', items: Array.from(target.entries.values()).map((e) => e.value) };
      case 'items':
        return {
          __pyType: 'list',
          items: Array.from(target.entries.values()).map((e) => ({ __pyType: 'tuple', items: [e.key, e.value] })),
        };
      case 'pop': {
        const kId = dictKeyId(args[0], line);
        const entry = target.entries.get(kId);
        if (!entry) {
          if (args.length > 1) return args[1];
          throw new PyRuntimeError('KeyError', `字典中找不到鍵值 ${pyRepr(args[0])}`, line);
        }
        target.entries.delete(kId);
        return entry.value;
      }
      case 'clear':
        target.entries.clear();
        return null;
      default:
        throw new PyRuntimeError('AttributeError', `字典沒有方法 '.${method}()'`, line);
    }
  }

  throw new PyRuntimeError('AttributeError', `'${getPyTypeName(target)}' 型別不支援方法 '.${method}()'`, line);
}

const BUILTINS = new Set([
  'print',
  'len',
  'type',
  'int',
  'float',
  'str',
  'bool',
  'list',
  'tuple',
  'range',
  'sum',
  'min',
  'max',
  'abs',
  'round',
  'sorted',
  'enumerate',
  'zip',
]);

function isBuiltinName(name: string): boolean {
  return BUILTINS.has(name);
}

function execBuiltin(
  name: string,
  args: PyValue[],
  kwargs: Record<string, PyValue>,
  stdout: string[],
  line?: number
): PyValue {
  switch (name) {
    case 'print': {
      const sep = 'sep' in kwargs ? pyToString(kwargs.sep) : ' ';
      const text = args.map(pyToString).join(sep);
      const end = 'end' in kwargs ? pyToString(kwargs.end) : '\n';
      if (end === '\n') {
        stdout.push(text);
      } else {
        if (stdout.length === 0) stdout.push(text + end);
        else stdout[stdout.length - 1] += text + end;
      }
      return null;
    }
    case 'len': {
      const target = args[0];
      if (typeof target === 'string') return target.length;
      if (isPyList(target) || isPyTuple(target)) return target.items.length;
      if (isPyDict(target)) return target.entries.size;
      throw new PyRuntimeError('TypeError', `'${getPyTypeName(target)}' 型別沒有長度 len()`, line);
    }
    case 'type':
      return `<class '${getPyTypeName(args[0])}'>`;
    case 'int': {
      const v = args[0];
      if (v === undefined) return 0;
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return Math.trunc(v);
      if (typeof v === 'string') {
        const n = Number.parseInt(v.trim(), 10);
        if (Number.isNaN(n)) throw new PyRuntimeError('ValueError', `無法將字串 '${v}' 轉換為 int`, line);
        return n;
      }
      throw new PyRuntimeError('TypeError', `無法將 '${getPyTypeName(v)}' 轉換為 int`, line);
    }
    case 'float': {
      const v = args[0];
      if (v === undefined) return 0.0;
      if (typeof v === 'boolean') return v ? 1.0 : 0.0;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = Number.parseFloat(v.trim());
        if (Number.isNaN(n)) throw new PyRuntimeError('ValueError', `無法將字串 '${v}' 轉換為 float`, line);
        return n;
      }
      throw new PyRuntimeError('TypeError', `無法將 '${getPyTypeName(v)}' 轉換為 float`, line);
    }
    case 'str':
      return args[0] === undefined ? '' : pyToString(args[0]);
    case 'bool':
      return args[0] === undefined ? false : pyTruthy(args[0]);
    case 'list':
      return args[0] === undefined ? { __pyType: 'list', items: [] } : { __pyType: 'list', items: toIterable(args[0], line) };
    case 'tuple':
      return args[0] === undefined ? { __pyType: 'tuple', items: [] } : { __pyType: 'tuple', items: toIterable(args[0], line) };
    case 'range': {
      let start = 0;
      let stop = 0;
      let step = 1;
      if (args.length === 1) stop = Number(args[0]);
      else if (args.length === 2) {
        start = Number(args[0]);
        stop = Number(args[1]);
      } else if (args.length === 3) {
        start = Number(args[0]);
        stop = Number(args[1]);
        step = Number(args[2]);
      } else {
        throw new PyRuntimeError('TypeError', 'range() 需要 1 到 3 個整數參數', line);
      }
      if (step === 0) throw new PyRuntimeError('ValueError', 'range() 的 step 參數不可為 0', line);
      const items: number[] = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) items.push(i);
      } else {
        for (let i = start; i > stop; i += step) items.push(i);
      }
      return { __pyType: 'list', items };
    }
    case 'sum': {
      const items = toIterable(args[0], line);
      let total = args[1] !== undefined ? Number(args[1]) : 0;
      for (const item of items) {
        if (typeof item !== 'number') throw new PyRuntimeError('TypeError', 'sum() 的元素必須為數字', line);
        total += item;
      }
      return total;
    }
    case 'min': {
      const items = args.length === 1 ? toIterable(args[0], line) : args;
      if (items.length === 0) throw new PyRuntimeError('ValueError', 'min() 參數不可為空', line);
      return items.reduce((a, b) => (a! < b! ? a : b));
    }
    case 'max': {
      const items = args.length === 1 ? toIterable(args[0], line) : args;
      if (items.length === 0) throw new PyRuntimeError('ValueError', 'max() 參數不可為空', line);
      return items.reduce((a, b) => (a! > b! ? a : b));
    }
    case 'abs':
      return Math.abs(Number(args[0]));
    case 'round': {
      const num = Number(args[0]);
      const digits = args[1] !== undefined ? Number(args[1]) : 0;
      const factor = Math.pow(10, digits);
      return Math.round(num * factor) / factor;
    }
    case 'sorted': {
      const items = toIterable(args[0], line);
      const rev = Boolean(kwargs.reverse);
      items.sort((a, b) => (a! < b! ? -1 : a! > b! ? 1 : 0));
      if (rev) items.reverse();
      return { __pyType: 'list', items };
    }
    case 'enumerate': {
      const items = toIterable(args[0], line);
      const startIdx = args[1] !== undefined ? Number(args[1]) : 0;
      return {
        __pyType: 'list',
        items: items.map((val, idx) => ({ __pyType: 'tuple', items: [startIdx + idx, val] })),
      };
    }
    case 'zip': {
      const lists = args.map((a) => toIterable(a, line));
      const minLen = lists.length ? Math.min(...lists.map((l) => l.length)) : 0;
      const zipped: PyValue[] = [];
      for (let i = 0; i < minLen; i++) {
        zipped.push({ __pyType: 'tuple', items: lists.map((l) => l[i]) });
      }
      return { __pyType: 'list', items: zipped };
    }
    default:
      throw new PyRuntimeError('NameError', `未定義的內建函式 '${name}'`, line);
  }
}
