/* A small cascade reader over one compiled sheet: for an element holding some states it returns the
 * declaration that wins per property, with the media it needs, so a test can compare state classes
 * with the components they must compile like. It reads nesting, @layer, @scope, @supports and the
 * hover media query, and ranks by specificity and then by source position. */
import { parseBlocks, type CssBlock } from '../../generate/core/arena-cli/css-blocks.ts';

export type Declared = { value: string; media: string[] };
type Tuple = [number, number, number];
type Context = { selectors: string[] | null; scope: string | null; media: string[] };

const HOVER_MEDIA = /^@media\s*\(\s*hover\s*:\s*hover\s*\)$/;
const COLOR_MIX_SUPPORTS = /^@supports\s*\(\s*color\s*:\s*color-mix\(/;

function closing(text: string, open: number) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const char = text[i];
    if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return text.length - 1;
}

function splitTop(text: string, separator: string) {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    else if (char === separator && depth === 0) {
      parts.push(text.slice(from, i).trim());
      from = i + 1;
    }
  }
  parts.push(text.slice(from).trim());
  return parts.filter(Boolean);
}

function simples(text: string) {
  const parts: string[] = [];
  let combinator = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i] as string;
    if (/\s|[>+~]/.test(char)) {
      combinator = true;
      i += 1;
    } else if (char === '[') {
      const end = closing(text, i);
      parts.push(text.slice(i, end + 1));
      i = end + 1;
    } else if (char === ':') {
      let end = i + 1;
      if (text[end] === ':') end += 1;
      while (end < text.length && /[\w-]/.test(text[end] as string)) end += 1;
      if (text[end] === '(') end = closing(text, end) + 1;
      parts.push(text.slice(i, end));
      i = end;
    } else if (char === '*') {
      parts.push('*');
      i += 1;
    } else {
      let end = i + 1;
      while (end < text.length && /[\w-]/.test(text[end] as string)) end += 1;
      parts.push(text.slice(i, end));
      i = end;
    }
  }
  return { parts, combinator };
}

function argumentsOf(simple: string) {
  return splitTop(simple.slice(simple.indexOf('(') + 1, -1), ',');
}

function larger(a: Tuple, b: Tuple): Tuple {
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return (a[i] as number) > (b[i] as number) ? a : b;
  return a;
}

function compare(a: Tuple, b: Tuple) {
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return (a[i] as number) - (b[i] as number);
  return 0;
}

export function specificity(selector: string): Tuple {
  const total: Tuple = [0, 0, 0];
  const add = (by: Tuple) => { total[0] += by[0]; total[1] += by[1]; total[2] += by[2]; };
  for (const simple of simples(selector).parts) {
    if (simple.startsWith(':where(') || simple === '*') continue;
    if (simple.startsWith(':is(') || simple.startsWith(':not(')) {
      add(argumentsOf(simple).map(specificity).reduce<Tuple>(larger, [0, 0, 0]));
    } else if (simple.startsWith('::')) add([0, 0, 1]);
    else if (simple.startsWith('#')) add([1, 0, 0]);
    else if (/^[.[:]/.test(simple)) add([0, 1, 0]);
    else add([0, 0, 1]);
  }
  return total;
}

function holds(simple: string, active: ReadonlySet<string>): boolean {
  if (simple.startsWith(':is(') || simple.startsWith(':where(')) return argumentsOf(simple).some((one) => compound(one, active));
  if (simple.startsWith(':not(')) return !argumentsOf(simple).some((one) => compound(one, active));
  if (active.has(simple)) return true;
  const bare = /^\[([^=\]\s]+)\]$/.exec(simple);
  return bare ? [...active].some((one) => one.startsWith(`[${bare[1]}=`)) : false;
}

function compound(text: string, active: ReadonlySet<string>) {
  const { parts, combinator } = simples(text);
  return !combinator && parts.every((part) => holds(part, active));
}

function applies(selector: string, element: string, active: ReadonlySet<string>) {
  if (!selector.startsWith(element)) return false;
  const rest = selector.slice(element.length);
  if (/^[\w-]/.test(rest)) return false;
  return compound(rest, active);
}

function resolve(raw: string, context: Context) {
  const out: string[] = [];
  for (const one of splitTop(raw, ',')) {
    const named = context.scope ? one.replaceAll(':scope', context.scope) : one;
    if (!context.selectors) out.push(named);
    else if (named.includes('&')) for (const parent of context.selectors) out.push(named.replaceAll('&', parent));
    else for (const parent of context.selectors) out.push(`${parent} ${named}`);
  }
  return out;
}

export function stateDeclarations(css: string, element: string, active: ReadonlySet<string>): Map<string, Declared> {
  const best = new Map<string, { rank: Tuple; position: number; declared: Declared }>();
  const walk = (block: CssBlock, context: Context) => {
    for (const decl of block.decls) {
      for (const selector of context.selectors ?? []) {
        if (!applies(selector, element, active)) continue;
        const rank = specificity(selector);
        const held = best.get(decl.name);
        if (held && (compare(held.rank, rank) > 0 || (compare(held.rank, rank) === 0 && held.position > decl.from))) continue;
        best.set(decl.name, { rank, position: decl.from, declared: { value: decl.value, media: context.media } });
      }
    }
    for (const child of block.children) {
      const head = child.selector;
      if (head.startsWith('@layer')) walk(child, context);
      else if (head.startsWith('@scope')) { const open = head.indexOf('('); walk(child, { ...context, scope: open < 0 ? null : head.slice(open + 1, closing(head, open)).trim() }); }
      else if (head.startsWith('@supports')) { if (COLOR_MIX_SUPPORTS.test(head)) walk(child, context); }
      else if (head.startsWith('@media')) { if (HOVER_MEDIA.test(head)) walk(child, { ...context, media: [...context.media, '(hover: hover)'] }); }
      else if (head.startsWith('@')) continue;
      else walk(child, { ...context, selectors: resolve(head, context) });
    }
  };
  walk(parseBlocks(css), { selectors: null, scope: null, media: [] });
  return new Map([...best].map(([name, one]) => [name, one.declared]));
}

export function propertyInitials(css: string): Map<string, string> {
  const initials = new Map<string, string>();
  const walk = (block: CssBlock) => {
    const named = /^@property\s+(--[\w-]+)$/.exec(block.selector);
    const initial = block.decls.find((decl) => decl.name === 'initial-value');
    if (named && initial) initials.set(named[1] as string, initial.value);
    block.children.forEach(walk);
  };
  walk(parseBlocks(css));
  return initials;
}

function topComma(text: string) {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    else if (char === ',' && depth === 0) return i;
  }
  return -1;
}

function unwrapOnce(value: string, vars: ReadonlyMap<string, string>) {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const at = value.indexOf('var(', i);
    if (at < 0) break;
    const end = closing(value, at + 3);
    const inside = value.slice(at + 4, end);
    const comma = topComma(inside);
    let replacement = value.slice(at, end + 1);
    if (comma >= 0) replacement = inside.slice(comma + 1).trim();
    else if (vars.has(inside.trim())) replacement = vars.get(inside.trim()) as string;
    out += value.slice(i, at) + replacement;
    i = end + 1;
  }
  return out + value.slice(i);
}

export function roleValue(value: string, vars: ReadonlyMap<string, string>): string {
  let current = value;
  for (let next = unwrapOnce(current, vars); next !== current; next = unwrapOnce(current, vars)) current = next;
  return current
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s*([,*])\s*/g, '$1')
    .trim();
}
