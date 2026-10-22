/* Parses a stylesheet into selector -> custom-property maps. A rule nested in at-rules is keyed by the
 * stack of their preludes then its selector, such as `@media (x) .a` or `@scope (.p) @media (x) .b`;
 * an @scope with a lower bound throws, since no key could say where it stops. */

import { scopeKey } from '../../generate/core/arena-cli/style-plugin-rules.ts';

const SCOPE_AT = /^@scope\s*\(([^()]*)\)$/;

const innerKey = (selector: string) => [...new Set(selector.split(',')
  .map((one) => one.trim().replace(/^:where\(:scope\)/, '')))].join(', ');

function prelude(selector: string) {
  const text = selector.replace(/\s+/g, ' ');
  if (!text.startsWith('@scope')) return { text, scoped: false };
  const root = SCOPE_AT.exec(text)?.[1]?.trim();
  if (root === undefined) throw new Error(`parseDecls reads @scope (root) alone and cannot key "${text}"`);
  return { text: scopeKey(root, '').trim(), scoped: true };
}

function frames(text: string) {
  const out: { selector: string; body: string; stack: { text: string; scoped: boolean }[] }[] = [];
  const stack: { text: string; scoped: boolean }[] = [];
  const brace = /[{}]/g;
  let at = 0;
  for (let m = brace.exec(text); m; m = brace.exec(text)) {
    if (m[0] === '}') { stack.pop(); at = m.index + 1; continue; }
    const selector = text.slice(at, m.index).trim();
    const next = text.indexOf('}', m.index);
    const inner = text.indexOf('{', m.index + 1);
    if (inner !== -1 && inner < next) {
      stack.push(prelude(selector));
      at = m.index + 1;
      continue;
    }
    out.push({ selector, body: text.slice(m.index + 1, next), stack: [...stack] });
    brace.lastIndex = next + 1;
    at = next + 1;
  }
  return out;
}

export function parseDecls(cssText: string) {
  const stripped = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map();
  for (const { selector: written, body, stack } of frames(stripped)) {
    if (!written) continue;
    const inner = stack.some((p) => p.scoped) ? innerKey(written) : written;
    const selector = [...stack.map((p) => p.text), inner].join(' ');
    const decls = out.get(selector) ?? new Map();
    for (const d of body.split(';')) {
      const i = d.indexOf(':');
      if (i === -1) continue;
      const name = d.slice(0, i).trim();
      if (!name.startsWith('--')) continue;
      decls.set(name.slice(2), d.slice(i + 1).trim());
    }
    out.set(selector, decls);
  }
  return out;
}
