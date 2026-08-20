/* A plugin declaration that restates what the part's slot already paints. The audit counts a part
 * as painted by reading selector text, which is right for a rule about a language and wrong for a
 * count a promotion argument stands on: a plugin can raise it without changing a pixel. This reads
 * the shipped sheet behind the part and compares property against property, RESOLVED rather than
 * as text, because a declaration naming a token that computes to the value the slot already paints
 * changes nothing either. A part maps to its class by arithmetic on the hook, so no manifest is
 * needed. Where a name does not resolve the pair stays textual and a miss is silent, since a
 * silent miss costs a reader nothing and a false report costs them a search. A selector carrying
 * a state is skipped: the slot's rule is its resting one, and calling a pressed rule a restatement
 * of it would refuse a real gesture. */

const PART_SELECTOR = /^\[data-arena-part\s*=\s*"([^"]+)"\]$/;

const SIMPLE_VAR = /var\(\s*(--[\w-]+)\s*\)/g;

const PROPERTY = /^(?:--)?[a-z][-a-z0-9]*$/;

const RESOLVE_DEPTH = 12;

export function classFor(part: string) {
  const [base, slot] = part.split('.');
  return `arena-${base}__${slot ?? 'root'}`;
}

export function sheetFor(part: string) {
  return `arena-${part.split('.')[0]}.css`;
}

export function rules(css: string) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out: { selectors: string[]; body: string }[] = [];
  const open: { head: string; from: number }[] = [];
  let head = '';
  for (let at = 0; at < source.length; at += 1) {
    const character = source[at];
    if (character === '{') {
      open.push({ head: head.trim(), from: at + 1 });
      head = '';
      continue;
    }
    if (character === '}') {
      const started = open.pop();
      if (started && started.head && !started.head.startsWith('@'))
        out.push({ selectors: selectorsOf(started.head), body: source.slice(started.from, at) });
      head = '';
      continue;
    }
    if (character === ';') {
      head = '';
      continue;
    }
    head += character;
  }
  return out;
}

export function selectorsOf(head: string) {
  return head.split(',').map((one) => one.trim()).filter(Boolean);
}

export function declarations(body: string) {
  const out = new Map<string, string>();
  let buffer = '';
  let depth = 0;
  for (const character of body) {
    if (character === '{') { depth += 1; buffer = ''; continue; }
    if (character === '}') { depth -= 1; buffer = ''; continue; }
    if (depth > 0) continue;
    if (character === ';') { keep(out, buffer); buffer = ''; continue; }
    buffer += character;
  }
  keep(out, buffer);
  return out;
}

function parse(text: string) {
  const at = text.indexOf(':');
  if (at < 0) return null;
  const property = text.slice(0, at).trim();
  if (!PROPERTY.test(property)) return null;
  return { property, value: text.slice(at + 1).trim().replace(/\s+/g, ' ') };
}

function keep(out: Map<string, string>, text: string) {
  const one = parse(text);
  if (one) out.set(one.property, one.value);
}

export function paintedValues(body: string) {
  const out = new Map<string, Set<string>>();
  let buffer = '';
  for (const character of body.replace(/\/\*[\s\S]*?\*\//g, ' ')) {
    if (character === '{' || character === '}') { buffer = ''; continue; }
    if (character === ';') { add(out, buffer); buffer = ''; continue; }
    buffer += character;
  }
  add(out, buffer);
  return out;
}

function add(out: Map<string, Set<string>>, text: string) {
  const one = parse(text);
  if (!one) return;
  const seen = out.get(one.property) ?? new Set<string>();
  seen.add(one.value);
  out.set(one.property, seen);
}

export function declarationsFor(css: string, className: string) {
  const out = new Map<string, Set<string>>();
  for (const rule of rules(css)) {
    if (!rule.selectors.includes(`.${className}`)) continue;
    for (const [property, values] of paintedValues(rule.body)) {
      const seen = out.get(property) ?? new Set<string>();
      for (const value of values) seen.add(value);
      out.set(property, seen);
    }
  }
  return out;
}

export function pluginRules(css: string) {
  const out: { part: string; declarations: Map<string, string> }[] = [];
  for (const rule of rules(css)) {
    const parts = rule.selectors
      .map((one) => PART_SELECTOR.exec(one)?.[1])
      .filter((one): one is string => Boolean(one));
    if (!parts.length) continue;
    const made = declarations(rule.body);
    for (const part of parts) out.push({ part, declarations: made });
  }
  return out;
}

export function resolveValue(value: string, at: Map<string, string> | null) {
  if (!at) return value;
  let out = value;
  for (let pass = 0; pass < RESOLVE_DEPTH; pass += 1) {
    const next = out.replace(SIMPLE_VAR, (whole, name: string) => at.get(name.slice(2)) ?? whole);
    if (next === out) break;
    out = next;
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function declaredTwice(made: { part: string; declarations: Map<string, string> }[]) {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const { part, declarations: rule } of made) for (const property of rule.keys()) {
    const at = `${part} ${property}`;
    if (seen.has(at)) twice.add(at);
    seen.add(at);
  }
  return twice;
}

export function restatedFindings(
  pluginCss: string, sheetOf: (part: string) => string | null, at: Map<string, string> | null = null,
) {
  const found: { part: string; property: string; value: string }[] = [];
  const made = pluginRules(pluginCss);
  const overridden = declaredTwice(made);
  for (const { part, declarations: rule } of made) {
    const sheet = sheetOf(part);
    if (!sheet) continue;
    const painted = declarationsFor(sheet, classFor(part));
    for (const [property, value] of rule) {
      if (overridden.has(`${part} ${property}`)) continue;
      const values = painted.get(property);
      if (values?.size !== 1) continue;
      const [other] = [...values];
      if (other === undefined) continue;
      if (other === value || resolveValue(value, at) === resolveValue(other, at))
        found.push({ part, property, value });
    }
  }
  return found;
}
