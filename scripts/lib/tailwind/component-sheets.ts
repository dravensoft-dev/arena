/* Cuts one compiled sheet into the per-component files a package ships, plus the prelude
 * they all depend on. An owner is the class base a selector carries, matched against the set
 * the caller already holds rather than parsed out of a known prefix, so the split and the
 * manifest it writes beside cannot disagree about what a name means. An at-rule has to be
 * split rather than assigned: Tailwind merges every `motion-reduce:` variant in the library
 * into ONE `@media` block. The prelude is not a recommendation. Without the `@property --tw-*`
 * registrations `border-style: var(--tw-border-style)` is invalid at computed-value time, so
 * every border disappears. Each component file imports it. `arena-plugin` is declared after
 * `utilities` and holds nothing here: every compiled rule lands in `utilities` at one class of
 * specificity, so a style plugin declared earlier would need `!important` to reach anything. */

const LAYER_UTILITIES = '@layer utilities {';
export const LAYER_ORDER = '@layer properties;\n@layer theme, base, components, utilities, arena-plugin;\n';
export const SLOT_CLASS = /\.([a-z0-9-]+?)__/g;

export function matchingBrace(css: string, open: number) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") {
      for (i += 1; i < css.length && css[i] !== c; i++) if (css[i] === '\\') i += 1;
      continue;
    }
    if (c === '/' && css[i + 1] === '*') { i = css.indexOf('*/', i + 2) + 1; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

export function topLevelChildren(body: string) {
  const children = [];
  let at = 0;
  while (at < body.length) {
    const open = body.indexOf('{', at);
    if (open === -1) break;
    const close = matchingBrace(body, open);
    if (close === -1) throw new Error('component-sheets: a block never closes');
    children.push({
      head: body.slice(at, open).trim(),
      inner: body.slice(open + 1, close),
      text: body.slice(at, close + 1).trim(),
    });
    at = close + 1;
  }
  return children;
}

export function ownersOf(text: string, bases: Set<string>) {
  const found = new Set([...text.matchAll(SLOT_CLASS)].map((m) => m[1]));
  const stray = [...found].filter((base) => base !== undefined && !bases.has(base));
  if (stray.length > 0) {
    throw new Error(`component-sheets: no manifest is named by ${stray.map((b) => `.${b}__`).join(', ')}, `
      + 'so those rules would ship nowhere');
  }
  return found;
}

export function splitUtilities(css: string, bases: Set<string>) {
  const at = css.indexOf(LAYER_UTILITIES);
  if (at === -1) {
    throw new Error('component-sheets: the compiled sheet carries no `@layer utilities` block, '
      + 'so there is nothing to cut into components. Tailwind\'s output shape moved.');
  }
  const open = at + LAYER_UTILITIES.length - 1;
  const close = matchingBrace(css, open);
  const body = css.slice(open + 1, close);
  const shared = (css.slice(0, at) + css.slice(close + 1)).replace(/\n{3,}/g, '\n\n').trim();

  const components = new Map();
  const add = (owner: string, text: string) => {
    if (!components.has(owner)) components.set(owner, []);
    components.get(owner).push(text);
  };

  for (const child of topLevelChildren(body)) {
    const owners = ownersOf(child.text, bases);
    if (owners.size === 0) {
      throw new Error(`component-sheets: a rule belongs to no manifest, so it would ship nowhere:\n${child.text.slice(0, 200)}`);
    }
    if (!child.head.startsWith('@')) {
      if (owners.size > 1) {
        throw new Error(`component-sheets: one selector names two manifests, which no emitter should produce:\n${child.head}`);
      }
      add([...owners][0] ?? '', child.text);
      continue;
    }
    for (const owner of owners) {
      const kept = topLevelChildren(child.inner)
        .filter((grand) => ownersOf(grand.text, bases).has(owner))
        .map((grand) => grand.text.replace(/^/gm, '  '))
        .join('\n');
      add(owner ?? '', `${child.head} {\n${kept}\n}`);
    }
  }

  return { shared, components };
}

export function dedent(text: string) {
  const indents = text.split('\n').slice(1).filter((line) => line.trim())
    .map((line) => (line.match(/^ */)?.[0] ?? '').length);
  const shortest = indents.length === 0 ? 0 : Math.min(...indents);
  return shortest === 0 ? text : text.split('\n')
    .map((line, i) => (i === 0 ? line : line.slice(shortest))).join('\n');
}

export function componentSheet(rules: string[], preludeSpecifier: string) {
  const body = rules.map((rule) => dedent(rule).replace(/^(?=.)/gm, '  ')).join('\n');
  return `@import '${preludeSpecifier}';\n\n@layer utilities {\n${body}\n}\n`;
}

export function preludeSheet(shared: string, keyframes: string) {
  const withoutBanner = shared.replace(/^\/\*![^]*?\*\/\n?/, '').replace(/^@layer properties;\n?/m, '').trim();
  return `${LAYER_ORDER}\n${keyframes.trim()}\n\n${withoutBanner}\n`;
}
