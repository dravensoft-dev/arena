/* The utilities Arena's theme clears and a project's Tailwind still knows, found by compiling.
 * The compiler is the project's own, loaded at run time by file URL, so nothing here imports
 * tailwindcss and no list of its utilities is kept: a candidate is dead when it emits nothing
 * under Arena's sheet and something under Tailwind's own theme, and the Arena utilities that
 * answer it are the keys of the cleared namespaces that emit and set the same properties.
 * Imports only node built-ins and its siblings, because the CLI ships as bin/*.mjs. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { packageRoot } from './package-root.ts';
import { parseBlocks, type CssBlock } from './css-blocks.ts';

export const TAILWIND_THEME = 'tailwind-theme.css';

export type Compile = (css: string) => Promise<{ build(candidates: string[]): string }>;
export type Tailwind = { compile: Compile; version: string; stock: string };
type Pair = { ns: string; key: string; value: string };
type Emitter = { emits(candidate: string): boolean; output(candidates: string[]): string };

const SHOWN = 6;
const CHANNELS: Record<string, RegExp> = {
  ink: /^color$/, fill: /^background-color$/, overlay: /^background-color$/, edge: /^border(-[a-z]+)*-color$/,
};
const FORMS = ['@theme', '@utility', '@custom-variant'];

export function tailwindRoot(from: string) {
  return packageRoot(['tailwindcss'], from, from);
}

type Entry = string | { import?: Entry; default?: Entry } | undefined;

function entryFile(entry: Entry): string | undefined {
  if (typeof entry === 'string') return entry;
  return entry ? entryFile(entry.import ?? entry.default) : undefined;
}

export async function loadTailwind(root: string | null): Promise<Tailwind | { skip: string }> {
  if (root === null) {
    return { skip: 'no tailwindcss resolves from this project, so a utility that emits nothing under Arena\'s theme is not reported' };
  }
  const resolved = 'the tailwindcss this project resolves';
  let manifest: { version?: string; exports?: Record<string, Entry> };
  try {
    manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  } catch {
    return { skip: `${resolved} has no readable package.json` };
  }
  const version = manifest.version ?? '';
  if (version === '') return { skip: `${resolved} names no version, and the rule compiles with v4` };
  if (version.split('.')[0] !== '4') {
    return { skip: `${resolved} is ${version}, and the rule compiles with v4` };
  }
  const file = entryFile(manifest.exports?.['.']);
  let loaded: { compile?: unknown } = {};
  try {
    if (file) loaded = await import(pathToFileURL(join(root, file)).href) as { compile?: unknown };
  } catch (error) {
    return { skip: `${resolved} fails to load: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (typeof loaded.compile !== 'function') return { skip: `${resolved} exports no compile()` };
  let stock: string;
  try {
    stock = readFileSync(join(root, 'theme.css'), 'utf8');
  } catch {
    return { skip: `${resolved} has no theme.css` };
  }
  return { compile: loaded.compile as Compile, version, stock };
}

function withoutComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (found) => found.replace(/[^\n]/g, ' '));
}

export function ownThemeBlocks(css: string) {
  const text = withoutComments(css);
  const pieces: { at: number; text: string }[] = [];
  for (const block of parseBlocks(text).children) {
    if (FORMS.some((form) => block.selector.startsWith(form))) {
      pieces.push({ at: block.head, text: text.slice(block.head, block.close + 1) });
    }
  }
  for (const found of text.matchAll(/@custom-variant\s[^;{}]*;/g)) {
    const before = text.slice(0, found.index);
    if (before.split('{').length === before.split('}').length) pieces.push({ at: found.index, text: found[0] });
  }
  return pieces.sort((a, b) => a.at - b.at).map((piece) => piece.text).join('\n');
}

export function themePairs(sheet: string): Pair[] {
  const themes = parseBlocks(withoutComments(sheet)).children.filter((block) => block.selector.startsWith('@theme'));
  const decls = themes.flatMap((block) => block.decls);
  const spaces = decls
    .filter((decl) => /^--[a-z0-9-]+-\*$/.test(decl.name) && decl.value === 'initial')
    .map((decl) => decl.name.slice(2, -2))
    .sort((a, b) => b.length - a.length);
  const pairs: Pair[] = [];
  for (const decl of decls) {
    if (!decl.name.startsWith('--') || decl.name.endsWith('*')) continue;
    const name = decl.name.slice(2);
    const ns = spaces.find((space) => name.startsWith(`${space}-`));
    if (ns) pairs.push({ ns, key: name.replace(`${ns}-`, ''), value: decl.value });
  }
  return pairs;
}

async function emitter(tailwind: Tailwind, css: string): Promise<Emitter> {
  const compiler = await tailwind.compile(`${css}\n@tailwind utilities;`);
  let length = compiler.build([]).length;
  const seen = new Map<string, boolean>();
  return {
    emits(candidate) {
      const known = seen.get(candidate);
      if (known !== undefined) return known;
      const next = compiler.build([candidate]).length;
      const grew = next > length;
      length = next;
      seen.set(candidate, grew);
      return grew;
    },
    output: (candidates) => compiler.build(candidates),
  };
}

function splitVariants(candidate: string) {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < candidate.length; i += 1) {
    const char = candidate[i];
    if (char === '[' || char === '(') depth += 1;
    else if (char === ']' || char === ')') depth -= 1;
    else if (char === ':' && depth === 0) {
      parts.push(candidate.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(candidate.slice(from));
  return { variants: parts.slice(0, -1), base: parts[parts.length - 1] as string };
}

function propertiesOf(block: CssBlock): string[] {
  if (block.selector.startsWith('@property') || block.selector.startsWith('@layer theme')) return [];
  return [...block.decls.map((decl) => decl.name), ...block.children.flatMap(propertiesOf)];
}

function ruleOf(block: CssBlock, name: string): CssBlock[] {
  const literal = escaped(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const token = new RegExp(`(^|[^a-zA-Z0-9_\\\\-])${literal}(?![a-zA-Z0-9_-])`);
  if (token.test(block.selector)) return [block];
  return block.children.flatMap((child) => ruleOf(child, name));
}

function valuesOf(block: CssBlock): string[] {
  return [...block.decls.map((decl) => decl.value), ...block.children.flatMap(valuesOf)];
}

const escaped = (name: string) => `.${name.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

function listed(answers: string[]) {
  if (answers.length === 0) return null;
  const shown = answers.slice(0, SHOWN).map((name) => `\`${name}\``).join(', ');
  const more = answers.length - SHOWN;
  return `Write one of ${shown}${more > 0 ? `, and ${more} more in css/${TAILWIND_THEME}` : ''}`;
}

async function utilityAnswers(
  base: string, pairs: Pair[], stock: Emitter, tailwind: Tailwind, arenaCss: string, stockCss: string,
  roles: ReadonlySet<string>, prefix: string,
) {
  const bare = base.replace(/^!/, '').replace(/^-/, '').replace(/\/[^/[\]]*$/, '');
  const dashes = [...bare.matchAll(/-/g)].map((found) => found.index).reverse();
  const root = dashes.map((at) => bare.slice(0, at)).find((prefix) => stock.emits(`${prefix}-[x]`)) ?? bare;
  const own = await emitter(tailwind, stockCss);
  const wanted = new Set(ruleOf(parseBlocks(own.output([bare])), bare).flatMap(propertiesOf));
  const fresh = await emitter(tailwind, arenaCss);
  const names = pairs.map((pair) => `${root}-${pair.key}`);
  const rules = parseBlocks(fresh.output(names));
  const roleOf = (pair: Pair) => {
    const read = /^var\(--([a-z0-9-]+)\)$/.exec(pair.value.trim())?.[1];
    if (read && roles.has(read)) return read;
    return roles.has(pair.key) ? pair.key : null;
  };
  const keep = pairs.filter((pair, index) => {
    const found = ruleOf(rules, names[index] as string);
    if (found.length === 0) return false;
    const own = pair.value.trim();
    const reads = found.flatMap(valuesOf).some((value) => value.includes(`var(--${pair.ns}-${pair.key})`)
      || (own !== '' && value.trim() === own));
    const props = found.flatMap(propertiesOf);
    return reads && (wanted.size === 0 || props.some((name) => wanted.has(name)));
  });
  const channelOf = (pair: Pair) => CHANNELS[(roleOf(pair) ?? '').split('-')[0] as string];
  const leads = (pair: Pair) => [...wanted].some((name) => channelOf(pair)?.test(name));
  const ordered = [
    ...keep.filter((pair) => leads(pair)),
    ...keep.filter((pair) => roleOf(pair) !== null && !leads(pair)),
    ...keep.filter((pair) => roleOf(pair) === null),
  ];
  return [...new Set(ordered.map((pair) => `${prefix}${root}-${pair.key}`))];
}

export async function deadUtilities(
  candidates: readonly string[], sheets: { arena: string; own: string }, tailwind: Tailwind,
  roles: ReadonlySet<string> = new Set(),
): Promise<Map<string, string>> {
  const arenaCss = `${tailwind.stock}\n${sheets.arena}\n${sheets.own}`;
  const arena = await emitter(tailwind, arenaCss);
  const stock = await emitter(tailwind, tailwind.stock);
  const pairs = themePairs(sheets.arena);
  const dead = new Map<string, string>();
  for (const candidate of new Set(candidates)) {
    if (arena.emits(candidate) || !stock.emits(candidate)) continue;
    const { variants, base } = splitVariants(candidate);
    let tail: string;
    let head: string;
    if (variants.length > 0 && arena.emits(base)) {
      const at = variants.findIndex((_, index) => !arena.emits(`${variants[index]}:${base}`));
      const variant = variants[at < 0 ? variants.length - 1 : at] as string;
      const [, sigil, limit, name] = /^(@?)(max-|min-)?(.*)$/.exec(variant) as RegExpExecArray;
      const keys = pairs
        .filter((pair) => pair.ns === (sigil ? 'container' : 'breakpoint'))
        .map((pair) => `${sigil}${limit ?? ''}${pair.key}`)
        .filter((alt) => name !== '' && arena.emits(`${alt}:${base}`))
        .map((alt) => `${alt}:`);
      head = `which has no \`${variant}:\` variant`;
      tail = listed(keys) ?? 'Arena\'s theme answers it with no variant';
    } else {
      const answers = await utilityAnswers(base, pairs, stock, tailwind, arenaCss, tailwind.stock, roles, variants.map((v) => `${v}:`).join(''));
      head = 'which clears the Tailwind default it names';
      tail = listed(answers) ?? 'Arena\'s theme answers it with no utility';
    }
    dead.set(candidate, `\`${candidate}\` emits nothing under Arena's theme, ${head}. ${tail}`);
  }
  return dead;
}
