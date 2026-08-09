/* A compiled copy is not a second source. dist/ and vendor/ are skipped by name, as three
 * neighbouring gates already skip them, and the Angular emit is skipped by its ANCHORED
 * path rather than by the name build, on layers.ts's own reasoning. Until the CLI shipped
 * as TypeScript nothing under dist/ matched, so this walk read 414 generated copies and
 * nobody noticed; what it holds is the hand-written tree. */

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { UNMODELLED_UNITS } from '../arena/check-dimension-literals.ts';
import { emittedTree } from '../../lib/arena/layers.ts';
import { captured } from '../../utils/captures.ts';
import { relPosix } from '../../utils/posix-path.ts';

export const SKIPPED_NAMES = new Set(['node_modules', 'dist', 'vendor']);

const EXTENSIONS = ['.json', '.ts', '.tsx', '.jsx', '.html', '.md'];

export const node = {
  name: 'check:arbitrary',
  reads: [
    ...EXTENSIONS.map((ext) => `frameworks/**/*${ext}`),
    '!frameworks/**/*.manifest.generated.ts',
  ],
  writes: [],
  feeds: [],
};
const CANDIDATE = /(?<![\w-])(-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\[([^\]\s"']+)\])/g;
const MARKER = /<!--\s*check-arbitrary-values allow:\s*([^>]*?)\s*-->/g;

const HINT = /^(?:length|color|number|percentage|integer|angle|time|url|image|family-name):/;

const TOKEN = /var\(\s*--[a-z0-9-]+\s*\)/g;

const UNMODELLED = new RegExp(`^-?\\d*\\.?\\d+(?:${UNMODELLED_UNITS.join('|')})$`);

const UNIT_LITERAL = /\d*\.?\d+\s*([a-z%]+)\b(?!\()/g;

const ZERO_RUN = /(?<![\w.])-?0(?:px|rem|em|%)?(?![\w.])/g;

const BARE_NUMBER = /(?<![\w.])-?\d*\.?\d+(?![\w.%])/g;

const MATH_OPEN = /\b(?:calc|min|max|clamp)$/;

function insideMathParens(rest: string, index: number) {
  const stack = [];
  for (let i = 0; i < index; i++) {
    if (rest[i] === '(') stack.push(MATH_OPEN.test(rest.slice(0, i)));
    else if (rest[i] === ')') stack.pop();
  }
  return stack.length > 0 && stack[stack.length - 1];
}

export function isLegalBracket(content: string) {
  const value = content.replace(HINT, '').replaceAll('_', ' ');
  if (UNMODELLED.test(value.trim())) return true;
  if (!/[\d#]/.test(value)) return true;
  if (value.includes('#')) return false;
  if (!TOKEN.test(value)) return false;
  TOKEN.lastIndex = 0;

  const rest = value.replace(TOKEN, ' ').replace(ZERO_RUN, ' ');
  for (const m of rest.matchAll(UNIT_LITERAL))
    if (!UNMODELLED_UNITS.includes(captured(m))) return false;

  for (const m of rest.matchAll(BARE_NUMBER))
    if (!insideMathParens(rest, m.index)) return false;
  return true;
}

export function scanText(text: string) {
  const out = [];
  for (const m of text.matchAll(CANDIDATE)) {
    const [, cls, content] = m;
    if (content === undefined || isLegalBracket(content)) continue;
    out.push({ cls, content });
  }
  return out;
}

export function findMarkers(text: string) {
  return [...text.matchAll(MARKER)].map((m) => ({
    raw: m[0],
    classes: captured(m).trim().split(/\s+/).filter(Boolean),
  }));
}

export function markerAllowlist(text: string) {
  const out = new Set<string>();
  for (const { classes } of findMarkers(text)) for (const cls of classes) out.add(cls);
  return out;
}

export function scanFile(relPath: string, text: string) {
  const isMarkdown = relPath.endsWith('.md');
  const markers = findMarkers(text);
  const errs = [];

  if (markers.length && !isMarkdown)
    errs.push(`${relPath}: check-arbitrary-values marker is only honoured in .md files`);

  const withoutMarkers = markers.length ? text.replace(MARKER, '') : text;
  const candidates = scanText(withoutMarkers);
  const allowed = isMarkdown ? markerAllowlist(text) : new Set<string>();

  for (const { cls } of candidates)
    if (cls !== undefined && !allowed.has(cls)) errs.push(`${relPath}: \`${cls}\` — a raw value, not a token`);

  if (isMarkdown) {
    const flagged = new Set(candidates.map((c) => c.cls));
    for (const cls of allowed)
      if (!flagged.has(cls))
        errs.push(`${relPath}: stale allowance \`${cls}\` — does not appear as a raw value in the file`);
  }

  return errs;
}

export function walk(dir: string, emitted = emittedTree()): string[] {
  return walkFiles(dir, { skip: (name, p) => SKIPPED_NAMES.has(name) || p === emitted })
    .filter((p) => !p.endsWith('.manifest.generated.ts') && EXTENSIONS.some((e) => p.endsWith(e)));
}

function main() {
  const root = join(repoRoot, 'frameworks');
  const errs = [];
  let scanned = 0;
  for (const file of walk(root)) {
    scanned++;
    errs.push(...scanFile(relPosix(repoRoot, file), readFileSync(file, 'utf8')));
  }
  if (errs.length) {
    console.error(`check-arbitrary-values: ${errs.length} problem(s) under frameworks/\n`);
    for (const e of errs) console.error(`  ${e}`);
    console.error('\nExpose the token in frameworks/tailwind/Theme.css and use the utility, or reference the token as var(--name). In .md, exempt a genuine counterexample with a check-arbitrary-values marker naming it.');
    process.exit(1);
  }
  console.log(`check-arbitrary-values: ${scanned} file(s) scanned, none`);
}

if (isMainModule(import.meta.url)) main();
