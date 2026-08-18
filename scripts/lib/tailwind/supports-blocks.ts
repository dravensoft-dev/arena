/* What Tailwind's `@supports` emit does to a compiled rule, and the two repairs it needs. An
 * opacity modifier compiles to the colour at full strength with the mix behind the at-rule, which
 * is progressive enhancement until the wash washes the INK'S OWN colour: then the fallback paints
 * the glyph in the ground it stands on, and a pressed ArenaIconButton is a solid accent block with
 * nothing in it. `dropBlindFallbacks` takes that half out, so the background is invalid at
 * computed-value time and does not paint, which leaves the ink on the surface it was measured
 * against; no engine that resolves color-mix sees a change. `mergeSupports` is the second: one
 * rule states a condition once, because `bun build` keeps the FIRST block of a repeated condition
 * and discards the rest, measured on Bun 1.3.14. It merges into the LAST of a group, which is what
 * makes it safe, and refuses any move a plain declaration of the same property would start losing to. */

export type CssBlock = {
  selector: string;
  parent: CssBlock | null;
  decls: { name: string; value: string; from: number; to: number }[];
  children: CssBlock[];
  head: number;
  open: number;
  close: number;
};

export const COLOUR_VAR = /var\(\s*--([a-z0-9-]+)\s*\)/;
export const MIXED_VAR = /color-mix\([^)]*var\(\s*--([a-z0-9-]+)\s*\)/;

export function parseBlocks(css: string, from = 0, selector = '', parent: CssBlock | null = null): CssBlock {
  const block: CssBlock = {
    selector, parent, decls: [], children: [], head: from, open: from, close: css.length,
  };
  let text = '';
  let start = -1;
  let index = from;
  const take = (end: number) => {
    const trimmed = text.trim();
    const colon = trimmed.indexOf(':');
    if (colon > 0 && start >= 0) {
      block.decls.push({
        name: trimmed.slice(0, colon).trim(),
        value: trimmed.slice(colon + 1).trim(),
        from: start,
        to: end,
      });
    }
    text = '';
    start = -1;
  };
  while (index < css.length) {
    const char = css[index] as string;
    if (char === '{') {
      const child = parseBlocks(css, index + 1, text.trim(), block);
      child.head = start < 0 ? index : start;
      block.children.push(child);
      index = child.close + 1;
      text = '';
      start = -1;
      continue;
    }
    if (char === '}') {
      block.close = index;
      return block;
    }
    if (char === ';') {
      take(index);
      index += 1;
      continue;
    }
    if (start < 0 && !/\s/.test(char)) start = index;
    text += char;
    index += 1;
  }
  return block;
}

export function selectorPath(block: CssBlock) {
  const parts = [];
  for (let at: CssBlock | null = block; at; at = at.parent) if (at.selector) parts.unshift(at.selector);
  return parts.join(' ');
}

export function inkOf(block: CssBlock) {
  for (let at: CssBlock | null = block; at; at = at.parent) {
    for (let i = at.decls.length - 1; i >= 0; i -= 1) {
      const decl = at.decls[i];
      if (!decl || decl.name !== 'color') continue;
      const named = COLOUR_VAR.exec(decl.value) ?? MIXED_VAR.exec(decl.value);
      if (named) return named[1] as string;
    }
  }
  return null;
}

function enhancedBy(block: CssBlock, after: number, property: string, token: string) {
  const following = block.children
    .filter((child) => child.open > after && child.selector.startsWith('@supports'))
    .sort((a, b) => a.open - b.open)[0];
  if (!following) return false;
  return following.decls.some((decl) => decl.name === property && MIXED_VAR.exec(decl.value)?.[1] === token);
}

export function blindFallbacks(css: string) {
  const found: { selector: string; property: string; token: string; from: number; to: number }[] = [];
  const walk = (block: CssBlock) => {
    const ink = inkOf(block);
    for (const decl of block.decls) {
      if (decl.name !== 'background-color' || ink === null) continue;
      if (COLOUR_VAR.exec(decl.value)?.[1] !== ink) continue;
      if (!enhancedBy(block, decl.to, decl.name, ink)) continue;
      found.push({ selector: selectorPath(block), property: decl.name, token: ink, from: decl.from, to: decl.to });
    }
    for (const child of block.children) walk(child);
  };
  walk(parseBlocks(css));
  return found;
}

export function dropBlindFallbacks(css: string) {
  const cuts = blindFallbacks(css).sort((a, b) => b.from - a.from);
  let out = css;
  for (const cut of cuts) out = `${out.slice(0, cut.from)}${out.slice(cut.to + 1)}`;
  return out.replace(/^[ \t]+\r?\n/gm, '');
}

export function supportsGroups(block: CssBlock) {
  const groups = new Map<string, CssBlock[]>();
  for (const child of block.children) {
    if (!child.selector.startsWith('@supports')) continue;
    const key = child.selector.replace(/\s+/g, ' ');
    groups.set(key, [...(groups.get(key) ?? []), child]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

function movable(block: CssBlock, source: CssBlock, target: CssBlock) {
  if (source.children.length > 0) return false;
  if (source.decls.length === 0) return false;
  return source.decls.every((decl) => {
    if (target.decls.some((held) => held.name === decl.name)) return false;
    return !block.decls.some((plain) => plain.name === decl.name && plain.from > source.close && plain.from < target.head);
  });
}

export function mergeSupports(css: string) {
  const edits: { from: number; to: number; text: string }[] = [];
  const walk = (block: CssBlock) => {
    for (const group of supportsGroups(block)) {
      const target = group[group.length - 1] as CssBlock;
      const moved = group.slice(0, -1).filter((source) => movable(block, source, target));
      if (moved.length === 0) continue;
      const indent = /\n([ \t]*)\S/.exec(css.slice(target.open, target.close))?.[1] ?? '  ';
      const last = target.decls[target.decls.length - 1];
      const at = last ? last.to + 1 : target.open;
      const carried = moved.flatMap((source) => source.decls.map((decl) => css.slice(decl.from, decl.to).trim()));
      edits.push({ from: at, to: at, text: carried.map((one) => `\n${indent}${one};`).join('') });
      for (const source of moved) edits.push({ from: source.head, to: source.close + 1, text: '' });
    }
    for (const child of block.children) walk(child);
  };
  walk(parseBlocks(css));

  let out = css;
  for (const edit of edits.sort((a, b) => b.from - a.from)) {
    out = `${out.slice(0, edit.from)}${edit.text}${out.slice(edit.to)}`;
  }
  return out.replace(/^[ \t]+\r?\n/gm, '');
}

export function repeatedSupports(css: string) {
  const found: { selector: string; condition: string; count: number }[] = [];
  const walk = (block: CssBlock) => {
    for (const group of supportsGroups(block)) {
      const first = group[0] as CssBlock;
      found.push({ selector: selectorPath(block), condition: first.selector, count: group.length });
    }
    for (const child of block.children) walk(child);
  };
  walk(parseBlocks(css));
  return found;
}
