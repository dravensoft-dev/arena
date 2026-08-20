/* One reader for a compiled component sheet, so a rule inside `&:hover`, `@media` and `@supports`
 * is read as the rule it is rather than as whatever line came before it. It lives here because the
 * shipped CLI reads these sheets too and a package has no scripts/ to import from, and a second
 * copy of a parser is how two readers of the same file start disagreeing about what it says.
 * inkOf walks the parent chain rather than the line order: a declaration's ink is the nearest
 * `color` above it in the nesting, which is what the cascade does and what a flat scan cannot see. */

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
