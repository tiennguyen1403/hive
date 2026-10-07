/**
 * A small reader for this repository's TypeScript, JSX and CSS (round v6, tooling slice T1), enough for
 * `tools/impact.mjs`: where the comments and strings are, which top-level declarations a file has and what each
 * one mentions, what it imports and exports; which style rules a stylesheet has, inside which `@media`.
 *
 * It is regex and a character scanner, not a compiler. Two habits of this code base keep that honest: top-level
 * statements start at column 0 (Prettier), and every text a reader sees sits in a string. Where it cannot tell,
 * it says so (`unparsed`), and impact.mjs then treats the whole file as changed: the reader may report too much,
 * never too little.
 */

export const CODE = 0;
export const COMMENT = 1;
export const STRING = 2;
export const TEMPLATE = 3;
export const REGEX = 4;

const IDENT_START = /[A-Za-z_$]/;
const IDENT = /[\w$]/;
const REGEX_AFTER = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", ">", "~", "^", ""]);
const REGEX_KEYWORDS = new Set(["return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "yield", "await", "instanceof"]);

/**
 * What each character of a script is: code, comment, string, template text or regex. `literal[i]` is where the
 * string or template holding character `i` opens (-1 for code). Strings stop at a line end, so a stray quote in JSX
 * text (`Don't`) spoils one line at most; `</p>` is never read as a regex.
 *
 * @param {string} text
 */
export function scanJs(text) {
  const n = text.length;
  const kind = new Uint8Array(n);
  const literal = new Int32Array(n).fill(-1);
  const templates = []; // brace depth at each open `${`
  let depth = 0;
  let lastSig = "";
  let lastWord = "";
  let state = CODE;
  let quote = "";
  let open = -1;
  let inClass = false;
  let word = "";
  for (let i = 0; i < n; i++) {
    const c = text[i];
    const d = text[i + 1];
    if (state === CODE) {
      if (c === "/" && d === "/") {
        while (i < n && text[i] !== "\n") kind[i++] = COMMENT;
        i -= 1;
        continue;
      }
      if (c === "/" && d === "*") {
        const end = text.indexOf("*/", i + 2);
        const stop = end === -1 ? n : end + 2;
        for (; i < stop; i++) kind[i] = COMMENT;
        i -= 1;
        continue;
      }
      if (c === '"' || c === "'") {
        state = STRING;
        quote = c;
        open = i;
        kind[i] = STRING;
        literal[i] = i;
        word = "";
        continue;
      }
      if (c === "`") {
        state = TEMPLATE;
        open = i;
        kind[i] = TEMPLATE;
        literal[i] = i;
        word = "";
        continue;
      }
      if (c === "/") {
        const regexOk = lastSig !== "<" && (REGEX_AFTER.has(lastSig) || (IDENT.test(lastSig) && REGEX_KEYWORDS.has(lastWord)));
        if (regexOk) {
          state = REGEX;
          inClass = false;
          kind[i] = REGEX;
          word = "";
          continue;
        }
      }
      if (c === "{") depth += 1;
      else if (c === "}") {
        depth -= 1;
        if (templates.length && depth === templates[templates.length - 1]) {
          templates.pop();
          state = TEMPLATE;
          kind[i] = CODE;
          continue;
        }
      }
      if (IDENT.test(c)) word = IDENT_START.test(c) && !IDENT.test(text[i - 1] ?? "") ? c : word + c;
      else word = "";
      if (!/\s/.test(c)) {
        lastSig = c;
        if (IDENT.test(c)) lastWord = word;
      }
      continue;
    }
    if (state === STRING) {
      kind[i] = STRING;
      literal[i] = open;
      if (c === "\\" && d !== "\n") {
        i += 1;
        if (i < n) {
          kind[i] = STRING;
          literal[i] = open;
        }
      } else if (c === quote) {
        state = CODE;
        lastSig = '"';
      } else if (c === "\n") {
        kind[i] = CODE;
        literal[i] = -1;
        state = CODE;
        lastSig = "";
      }
      continue;
    }
    if (state === TEMPLATE) {
      if (c === "\\") {
        kind[i] = TEMPLATE;
        literal[i] = open;
        i += 1;
        if (i < n) {
          kind[i] = TEMPLATE;
          literal[i] = open;
        }
      } else if (c === "`") {
        kind[i] = TEMPLATE;
        literal[i] = open;
        state = CODE;
        lastSig = "`";
      } else if (c === "$" && d === "{") {
        kind[i] = CODE;
        kind[i + 1] = CODE;
        templates.push(depth);
        depth += 1;
        i += 1;
        state = CODE;
        lastSig = "{";
      } else {
        kind[i] = TEMPLATE;
        literal[i] = open;
      }
      continue;
    }
    // REGEX
    kind[i] = REGEX;
    if (c === "\\") {
      i += 1;
      if (i < n) kind[i] = REGEX;
    } else if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) {
      state = CODE;
      lastSig = ")";
      while (i + 1 < n && /[a-z]/.test(text[i + 1])) kind[++i] = CODE;
    } else if (c === "\n") {
      kind[i] = CODE;
      state = CODE;
      lastSig = "";
    }
  }
  return { kind, literal };
}

/** The text with every comment turned into spaces, line ends kept. Strings stay: a name inside one only adds a reference. */
export function withoutComments(text, kind) {
  let out = "";
  for (let i = 0; i < text.length; i++) out += kind[i] === COMMENT && text[i] !== "\n" ? " " : text[i];
  return out;
}

/** Offsets of each line start (line 1 at index 0). */
export function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return starts;
}

/** The 1-based line holding offset `at`. */
export function lineOf(starts, at) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= at) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** Is every non-space character of line `line` (1-based) a comment? A blank line counts as one too. */
export function commentOnly(text, kind, starts, line) {
  const from = starts[line - 1];
  const to = line < starts.length ? starts[line] : text.length;
  for (let i = from; i < to; i++) if (!/\s/.test(text[i]) && kind[i] !== COMMENT) return false;
  return true;
}

// ──────────────────────────────────────────────────────────── modules

/**
 * @typedef {{ imported: string, local: string }} Binding
 * @typedef {{ spec: string, line: number, endLine: number, default: string | null, namespace: string | null,
 *   named: Binding[], sideEffect: boolean }} ImportStmt
 * @typedef {{ spec: string, line: number, star: boolean, named: { imported: string, exported: string }[] }} Reexport
 * @typedef {{ names: string[], exported: string[], start: number, end: number, kind: string, refs: Set<string>,
 *   dynamic: string[] }} Decl
 */

const DECL_START = /^[A-Za-z_$@"']/;

/**
 * The top-level shape of a script: its directives, imports, re-exports, export lists and declarations, each with
 * its 1-based line range, and what every runtime declaration mentions.
 *
 * Types (`interface`, `type`, `declare`, `import type`, `{ type X }`) are kept out: they change nothing a browser
 * draws.
 *
 * @param {string} text
 */
export function parseModule(text) {
  const src = text.replace(/\r\n/g, "\n");
  const { kind } = scanJs(src);
  const code = withoutComments(src, kind);
  const starts = lineStarts(src);
  const lines = code.split("\n");
  const total = lines.length;

  // Statement starts: a column-0 character that is code (not inside a template, a string or a comment).
  const heads = [];
  for (let l = 1; l <= total; l++) {
    const at = starts[l - 1];
    const line = lines[l - 1];
    if (!line || !DECL_START.test(line[0])) continue;
    if (kind[at] !== CODE && !(kind[at] === STRING && (line.startsWith('"use ') || line.startsWith("'use ")))) continue;
    heads.push(l);
  }
  const statements = heads.map((start, i) => {
    const end = (heads[i + 1] ?? total + 1) - 1;
    return { start, end, text: lines.slice(start - 1, end).join("\n") };
  });

  const directives = new Set();
  /** @type {ImportStmt[]} */
  const imports = [];
  /** @type {Reexport[]} */
  const reexports = [];
  /** @type {{ local: string, exported: string, line: number }[]} */
  const exportList = [];
  /** @type {Decl[]} */
  const decls = [];
  /** @type {{ start: number, end: number, why: string }[]} */
  const unparsed = [];
  /** line ranges that are types only */
  const types = [];

  const bindingsOf = (list) =>
    list
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("type "))
      .map((s) => {
        const m = s.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
        return m ? { imported: m[1], local: m[2] ?? m[1] } : null;
      });

  for (const st of statements) {
    const t = st.text.trim();
    let m;
    if ((m = t.match(/^["']use (client|server)["']/))) {
      directives.add(m[1]);
      continue;
    }
    if (t.startsWith("import")) {
      if (/^import\s+type\b/.test(t)) {
        types.push(st);
        continue;
      }
      if ((m = t.match(/^import\s+["']([^"']+)["']/))) {
        imports.push({ spec: m[1], line: st.start, endLine: st.end, default: null, namespace: null, named: [], sideEffect: true });
        continue;
      }
      m = t.match(/^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/);
      if (!m) {
        unparsed.push({ start: st.start, end: st.end, why: "import" });
        continue;
      }
      const clause = m[1].trim();
      const stmt = { spec: m[2], line: st.start, endLine: st.end, default: null, namespace: null, named: [], sideEffect: false };
      const ns = clause.match(/\*\s+as\s+([\w$]+)/);
      if (ns) stmt.namespace = ns[1];
      const braces = clause.match(/\{([\s\S]*)\}/);
      if (braces) {
        const named = bindingsOf(braces[1]);
        if (named.some((b) => b === null)) unparsed.push({ start: st.start, end: st.end, why: "import list" });
        stmt.named = named.filter(Boolean);
      }
      const def = clause.replace(/\{[\s\S]*\}/, "").replace(/\*\s+as\s+[\w$]+/, "").replace(/,/g, " ").trim();
      if (def && /^[\w$]+$/.test(def)) stmt.default = def;
      imports.push(stmt);
      continue;
    }
    if (t.startsWith("export")) {
      if (/^export\s+type\s*\{/.test(t) || /^export\s+(declare\s+)?(interface|type)\s/.test(t)) {
        types.push(st);
        continue;
      }
      if ((m = t.match(/^export\s+\*\s+(?:as\s+([\w$]+)\s+)?from\s+["']([^"']+)["']/))) {
        reexports.push({ spec: m[2], line: st.start, star: !m[1], named: m[1] ? [{ imported: "*", exported: m[1] }] : [] });
        continue;
      }
      if ((m = t.match(/^export\s*\{([\s\S]*?)\}\s*(?:from\s+["']([^"']+)["'])?/))) {
        const pairs = m[1]
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s && !s.startsWith("type "))
          .map((s) => {
            const p = s.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
            return p ? { local: p[1], exported: p[2] ?? p[1] } : null;
          });
        if (pairs.some((p) => p === null)) unparsed.push({ start: st.start, end: st.end, why: "export list" });
        if (m[2]) reexports.push({ spec: m[2], line: st.start, star: false, named: pairs.filter(Boolean).map((p) => ({ imported: p.local, exported: p.exported })) });
        else for (const p of pairs.filter(Boolean)) exportList.push({ ...p, line: st.start });
        continue;
      }
    }
    // A declaration, exported or not.
    const exp = /^export\s+/.test(t);
    const isDefault = /^export\s+default\s+/.test(t);
    const body = t.replace(/^export\s+(default\s+)?/, "");
    if (/^declare\s/.test(body) || /^(interface|type)\s+[\w$]+/.test(body)) {
      types.push(st);
      continue;
    }
    let names = [];
    let declKind = "other";
    if ((m = body.match(/^(?:async\s+)?function\s*\*?\s*([\w$]+)/))) {
      names = [m[1]];
      declKind = "function";
    } else if ((m = body.match(/^(?:abstract\s+)?class\s+([\w$]+)/))) {
      names = [m[1]];
      declKind = "class";
    } else if ((m = body.match(/^(?:const\s+)?enum\s+([\w$]+)/))) {
      names = [m[1]];
      declKind = "enum";
    } else if (/^(?:const|let|var)\s*[\w$[{]/.test(body)) {
      names = declaredNames(body);
      declKind = "variable";
      if (names === null) {
        unparsed.push({ start: st.start, end: st.end, why: "declaration" });
        continue;
      }
    } else if (isDefault && (m = body.match(/^([\w$]+)\s*;?\s*$/))) {
      exportList.push({ local: m[1], exported: "default", line: st.start });
      continue;
    } else if (isDefault) {
      names = ["default"];
      declKind = "default";
    } else {
      unparsed.push({ start: st.start, end: st.end, why: "statement" });
      continue;
    }
    const exported = exp ? (isDefault ? ["default"] : names.slice()) : [];
    const refs = new Set(st.text.match(/[A-Za-z_$][\w$]*/g) ?? []);
    for (const nm of names) refs.delete(nm);
    const dynamic = [...st.text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((x) => x[1]);
    decls.push({ names, exported, start: st.start, end: st.end, kind: declKind, refs, dynamic });
  }

  // `export { a as b }` adds an exported name to the declaration of `a`.
  for (const e of exportList) {
    const d = decls.find((x) => x.names.includes(e.local));
    if (d) d.exported.push(e.exported);
  }
  return { directives, imports, reexports, exportList, decls, unparsed, types, lines: total };
}

/**
 * The names a `const`/`let`/`var` statement declares: `const a = 1, b = 2` → a, b; `const { x, y: z } = o` → x, z;
 * `const [p, q] = l` → p, q. A type annotation (`Record<string, Pair>`) is skipped, its commas included. Null for a
 * pattern it cannot read (a nested destructuring).
 *
 * @param {string} body the statement, from its keyword on
 */
export function declaredNames(body) {
  const s = body.replace(/^(?:const|let|var)\s*/, "");
  const n = s.length;
  const names = [];
  let i = 0;
  const space = () => {
    while (i < n && /\s/.test(s[i])) i++;
  };
  // Up to the first top-level character in `stops`, brackets (and, in a type, angle brackets) and strings skipped.
  const scan = (stops, angles) => {
    let depth = 0;
    let q = "";
    for (; i < n; i++) {
      const c = s[i];
      if (q) {
        if (c === "\\") i++;
        else if (c === q) q = "";
        continue;
      }
      if (c === '"' || c === "'" || c === "`") q = c;
      else if ("([{".includes(c) || (angles && c === "<")) depth++;
      else if (")]}".includes(c) || (angles && c === ">" && s[i - 1] !== "=")) depth--;
      else if (depth === 0 && stops.includes(c) && !(c === "=" && s[i + 1] === ">")) return c;
    }
    return "";
  };
  while (i < n) {
    space();
    if (s[i] === "{" || s[i] === "[") {
      const from = i;
      let depth = 0;
      for (; i < n; i++) {
        if (s[i] === "{" || s[i] === "[") depth++;
        else if (s[i] === "}" || s[i] === "]") {
          depth--;
          if (depth === 0) break;
        }
      }
      const inner = s.slice(from + 1, i);
      if (/[{[]/.test(inner)) return null;
      for (const part of inner.split(",")) {
        const p = part.trim();
        if (!p) continue;
        const m = p.match(/^(?:\.\.\.)?([\w$]+)(?:\s*:\s*([\w$]+))?(?:\s*=[\s\S]*)?$/);
        if (!m) return null;
        names.push(m[2] ?? m[1]);
      }
      i += 1;
    } else {
      const m = s.slice(i).match(/^[\w$]+/);
      if (!m) return names.length ? names : null;
      names.push(m[0]);
      i += m[0].length;
    }
    space();
    let stop = s[i];
    if (stop === "!") i += 1; // `let x!: T`
    if (s[i] === ":") {
      i += 1;
      stop = scan("=,;", true);
    }
    if (s[i] === "=") {
      i += 1;
      stop = scan(",;", false);
    }
    if (stop !== ",") break;
    i += 1;
  }
  return names;
}

/** The statement (declaration, import, type, unparsed) a 1-based line falls in. */
export function statementAt(mod, line) {
  for (const d of mod.decls) if (line >= d.start && line <= d.end) return { type: "decl", decl: d };
  for (const s of mod.imports) if (line >= s.line && line <= s.endLine) return { type: "import", stmt: s };
  for (const s of mod.reexports) if (line === s.line) return { type: "reexport", stmt: s };
  for (const s of mod.exportList) if (line === s.line) return { type: "export", stmt: s };
  for (const t of mod.types) if (line >= t.start && line <= t.end) return { type: "type" };
  for (const u of mod.unparsed) if (line >= u.start && line <= u.end) return { type: "unparsed", why: u.why };
  return { type: "top" };
}

// ──────────────────────────────────────────────────────────────── CSS

/**
 * What each character of a stylesheet is: code, comment or string.
 *
 * @param {string} text
 */
export function scanCss(text) {
  const kind = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      for (; i < stop; i++) kind[i] = COMMENT;
      i -= 1;
    } else if (c === '"' || c === "'") {
      kind[i] = STRING;
      for (i += 1; i < text.length && text[i] !== c && text[i] !== "\n"; i++) {
        kind[i] = STRING;
        if (text[i] === "\\") kind[++i] = STRING;
      }
      if (i < text.length) kind[i] = STRING;
    }
  }
  return { kind };
}

/**
 * The style rules of a stylesheet with their places: the at-rules around each (outermost first), the selector,
 * and the offsets from the selector's first character to the closing brace. The same walk as `rules()` in
 * `app/styles/feed/scope.test.ts`, with positions. Also the at-rule blocks themselves (`@media`, `@keyframes`).
 *
 * @param {string} text
 */
export function cssRules(text) {
  const src = text.replace(/\r\n/g, "\n");
  const { kind } = scanCss(src);
  /** @type {{ at: string[], selector: string, from: number, to: number }[]} */
  const rules = [];
  /** @type {{ prelude: string, from: number, to: number }[]} */
  const blocks = [];
  const stack = [];
  let mark = 0;
  const preludeFrom = (from, to) => {
    let i = from;
    while (i < to && (/\s/.test(src[i]) || kind[i] === COMMENT)) i++;
    return i;
  };
  for (let i = 0; i < src.length; i++) {
    if (kind[i] !== CODE) continue;
    const ch = src[i];
    if (ch === "{") {
      const raw = [...src.slice(mark, i)].map((c, k) => (kind[mark + k] === COMMENT ? " " : c)).join("");
      const prelude = raw.trim().replace(/\s+/g, " ");
      stack.push({ kind: prelude.startsWith("@") ? "at" : "rule", prelude, from: preludeFrom(mark, i) });
      mark = i + 1;
    } else if (ch === "}") {
      const open = stack.pop();
      if (open?.kind === "rule") {
        const at = stack.filter((s) => s.kind === "at").map((s) => s.prelude);
        rules.push({ at, selector: open.prelude, from: open.from, to: i });
      } else if (open) blocks.push({ prelude: open.prelude, from: open.from, to: i });
      mark = i + 1;
    } else if (ch === ";" && (stack.length === 0 || stack[stack.length - 1].kind === "at")) {
      mark = i + 1;
    }
  }
  return { rules, blocks, kind, text: src };
}

/** The selector list split at its top-level commas. */
export function splitSelectors(list) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push(list.slice(from, i).trim());
      from = i + 1;
    }
  }
  out.push(list.slice(from).trim());
  return out.filter(Boolean);
}

/**
 * The classes a selector names outside any `(...)`: `.od-right .acc-sec:first-child` → od-right, acc-sec;
 * `.size:has(input:disabled)` → size; `html:has(.sheet) body` → none (the class there is a condition, not the
 * element styled). Also the language it is limited to, from `:lang(en)` or `:lang(vi)` outside parentheses.
 */
export function selectorClasses(selector) {
  const classes = [];
  let depth = 0;
  let lang = null;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && c === ".") {
      const m = selector.slice(i + 1).match(/^-?[_a-zA-Z][\w-]*/);
      if (m) classes.push(m[0]);
    } else if (depth === 0 && c === ":") {
      const m = selector.slice(i).match(/^:lang\(\s*([a-z]+)/i);
      if (m) lang = m[1].toLowerCase();
    }
  }
  return { classes: [...new Set(classes)], lang };
}

/**
 * The width bands of a chain of at-rules, outermost first: `null` when none limits the width, `"print"` when the
 * rules only print, else a list of `{ lo, hi }` (px, either may be null) that any one of may hold.
 *
 * @param {string[]} at
 */
export function mediaBands(at) {
  let bands = null;
  for (const prelude of at) {
    const m = prelude.match(/^@media\s+([\s\S]*)$/i);
    if (!m) continue;
    const queries = splitSelectors(m[1]).map(parseQuery);
    if (queries.every((q) => q === "print")) return "print";
    const screen = queries.filter((q) => q !== "print");
    if (screen.some((q) => q === null)) continue; // one query holds at any width: no limit from this at-rule
    bands = bands === null ? screen : bands.flatMap((a) => screen.map((b) => intersect(a, b))).filter(Boolean);
  }
  return bands;
}

function parseQuery(q) {
  const s = q.trim().toLowerCase();
  if (/^print\b/.test(s) || /^only\s+print\b/.test(s)) return "print";
  if (/^not\b/.test(s)) return null;
  let lo = null;
  let hi = null;
  for (const m of s.matchAll(/\(\s*min-width\s*:\s*([\d.]+)px\s*\)/g)) lo = Math.max(lo ?? -Infinity, Number(m[1]));
  for (const m of s.matchAll(/\(\s*max-width\s*:\s*([\d.]+)px\s*\)/g)) hi = Math.min(hi ?? Infinity, Number(m[1]));
  for (const m of s.matchAll(/\(\s*width\s*(>=|>|<=|<)\s*([\d.]+)px\s*\)/g)) {
    const v = Number(m[2]);
    if (m[1].startsWith(">")) lo = Math.max(lo ?? -Infinity, m[1] === ">" ? v + 0.02 : v);
    else hi = Math.min(hi ?? Infinity, m[1] === "<" ? v - 0.02 : v);
  }
  for (const m of s.matchAll(/\(\s*([\d.]+)px\s*(<=|<)\s*width\s*(<=|<)\s*([\d.]+)px\s*\)/g)) {
    lo = Math.max(lo ?? -Infinity, m[2] === "<" ? Number(m[1]) + 0.02 : Number(m[1]));
    hi = Math.min(hi ?? Infinity, m[3] === "<" ? Number(m[4]) - 0.02 : Number(m[4]));
  }
  if (lo === null && hi === null) return null;
  return { lo, hi };
}

function intersect(a, b) {
  const lo = a.lo === null ? b.lo : b.lo === null ? a.lo : Math.max(a.lo, b.lo);
  const hi = a.hi === null ? b.hi : b.hi === null ? a.hi : Math.min(a.hi, b.hi);
  if (lo !== null && hi !== null && lo > hi) return null;
  return { lo, hi };
}

/** The phone and desktop widths the full sweep uses, standing for an edge a band leaves open. */
export const PHONE = 390;
export const DESKTOP = 1280;

/**
 * Widths to shoot a band at (the brief's rule): its two edges and one point just outside. An open edge stands as
 * 390 (no lower edge) or 1280 (no upper edge). The point outside is under the lower edge when there is one, else
 * over the upper edge. No band: 390 and 1280.
 *
 * @param {null | "print" | { lo: number | null, hi: number | null }[]} bands
 */
export function widthsOf(bands) {
  if (bands === null) return [PHONE, DESKTOP];
  if (bands === "print") return [];
  const out = new Set();
  for (const { lo, hi } of bands) {
    const a = lo === null ? null : Math.ceil(lo);
    const b = hi === null ? null : Math.floor(hi);
    if (a !== null && b !== null) [a - 1, a, b].forEach((w) => out.add(w));
    else if (a !== null) [a - 1, a, a < DESKTOP ? DESKTOP : 1440].forEach((w) => out.add(w));
    else if (b !== null) [b > PHONE ? PHONE : 320, b, b + 1].forEach((w) => out.add(w));
  }
  return [...out].sort((x, y) => x - y);
}
