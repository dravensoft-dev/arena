import { scopeKey } from '../../generate/core/arena-cli/style-plugin-rules.ts';

const SCOPE_AT = /^@scope\s*\(([^()]*)\)$/;

const innerKey = (selector: string) => [...new Set(selector.split(',')
  .map((one) => one.trim().replace(/^:where\(:scope\)/, '')))].join(', ');

function frames(text: string) {
  const out: { selector: string; body: string; root?: string }[] = [];
  const roots: (string | undefined)[] = [];
  const brace = /[{}]/g;
  let at = 0;
  for (let m = brace.exec(text); m; m = brace.exec(text)) {
    if (m[0] === '}') { roots.pop(); at = m.index + 1; continue; }
    const selector = text.slice(at, m.index).trim();
    const next = text.indexOf('}', m.index);
    const inner = text.indexOf('{', m.index + 1);
    if (inner !== -1 && inner < next) {
      roots.push(SCOPE_AT.exec(selector)?.[1]?.trim());
      at = m.index + 1;
      continue;
    }
    const root = roots[roots.length - 1];
    out.push({ selector, body: text.slice(m.index + 1, next), ...(root === undefined ? {} : { root }) });
    brace.lastIndex = next + 1;
    at = next + 1;
  }
  return out;
}

export function parseDecls(cssText: string) {
  const stripped = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map();
  for (const { selector: written, body, root } of frames(stripped)) {
    if (!written) continue;
    const selector = root === undefined ? written : scopeKey(root, innerKey(written));
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
