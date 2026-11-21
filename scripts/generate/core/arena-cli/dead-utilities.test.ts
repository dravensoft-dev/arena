/* The compiler load, the theme readers and the dead map, each over a table of inputs measured against the repo's own tailwindcss. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deadUtilities, loadTailwind, ownThemeBlocks, themePairs, tailwindRoot, type Tailwind } from './dead-utilities.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import { tailwindThemeSheet } from '../../../lib/tailwind/theme-sheet.ts';
import { tokenCatalogue } from '../../../lib/arena/package-assembly.ts';

const TW = join(repoRoot, 'node_modules', 'tailwindcss');
const ARENA = tailwindThemeSheet(repoRoot);
const ROLES = new Set(Object.keys(tokenCatalogue(repoRoot).roles));

function fake(version: string, entry: string, extra: { exports?: unknown; theme?: boolean } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'arena-tailwind-'));
  mkdirSync(join(dir, 'dist'));
  const exports = extra.exports ?? { '.': { import: './dist/lib.mjs' } };
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'tailwindcss', ...(version ? { version } : {}), exports }));
  writeFileSync(join(dir, 'dist', 'lib.mjs'), entry);
  if (extra.theme !== false) writeFileSync(join(dir, 'theme.css'), '@theme default { --font-sans: x; }');
  return dir;
}

const COMPILES = 'export const compile = async () => ({ build: () => \'\' });';
const LOADS = [
  { name: 'no tailwindcss', root: () => null, skip: /no tailwindcss resolves/ },
  { name: 'a v3 package', root: () => fake('3.4.17', ''), skip: /is 3\.4\.17, and the rule compiles with v4/ },
  { name: 'no version', root: () => fake('', COMPILES), skip: /the tailwindcss this project resolves names no version/ },
  { name: 'a v4 entry with no compile', root: () => fake('4.0.0', 'export const x = 1;'), skip: /exports no compile\(\)/ },
  { name: 'a v4 entry that throws', root: () => fake('4.0.0', 'throw new Error(\'boom\');'), skip: /resolves fails to load: .*boom/ },
  { name: 'no theme.css', root: () => fake('4.0.0', COMPILES, { theme: false }), skip: /resolves has no theme\.css/ },
  { name: 'an import condition that is an object', root: () => fake('4.0.0', COMPILES, { exports: { '.': { import: { default: './dist/lib.mjs' } } } }), skip: null, version: '4.0.0' },
  { name: 'the repo copy', root: () => TW, skip: null, version: '4.3.3' },
];

test('loadTailwind loads a v4 compiler and says why it skips anything else', async () => {
  for (const row of LOADS) {
    const root = row.root();
    try {
      const got = await loadTailwind(root);
      if (row.skip) {
        assert.ok('skip' in got, `${row.name}: skips`);
        assert.match((got as { skip: string }).skip, row.skip, row.name);
      } else {
        assert.ok(!('skip' in got), `${row.name}: loads`);
        const loaded = got as Tailwind;
        assert.equal(loaded.version, row.version, row.name);
        assert.equal(typeof loaded.compile, 'function', row.name);
      }
    } finally {
      if (root && root !== TW) rmSync(root, { recursive: true });
    }
  }
});

test('tailwindRoot finds the nearest installed tailwindcss from a project', () => {
  assert.equal(tailwindRoot(repoRoot), TW, 'the repo resolves its own copy');
});

test('themePairs reads the keys of every namespace the sheet clears, in sheet order', () => {
  const pairs = themePairs(ARENA);
  const keys = (ns: string) => pairs.filter((pair) => pair.ns === ns).map((pair) => pair.key);
  assert.deepEqual(keys('breakpoint'), ['sm', 'md', 'lg'], 'breakpoint keys');
  assert.deepEqual(keys('shadow').slice(0, 3), ['1', '2', '3'], 'shadow keys start in sheet order');
  assert.ok(!keys('font').some((key) => key.startsWith('weight')), 'font-weight keys never land under font');
  assert.ok(!pairs.some((pair) => pair.key.endsWith('*')), 'no pair has a starred key');
});

const BLOCKS = [
  {
    name: 'the three forms',
    css: '@import \'tailwindcss\';\n@theme { --color-brand: red; }\n.x { color: red; }\n@utility tile { padding: 1px; }\n@custom-variant dark (&:where(.dark, .dark *));',
    keeps: ['@theme { --color-brand: red; }', '@utility tile { padding: 1px; }', '@custom-variant dark (&:where(.dark, .dark *));'],
    drops: ['@import', '.x'],
  },
  {
    name: 'a custom-variant nested in a rule',
    css: '.x { @custom-variant inner (&:hover); color: red; }\n@theme { --color-a: red; }',
    keeps: ['@theme { --color-a: red; }'],
    drops: ['@custom-variant', '.x'],
  },
];

test('ownThemeBlocks keeps the top-level @theme, @utility and @custom-variant of a stylesheet', () => {
  for (const row of BLOCKS) {
    const kept = ownThemeBlocks(row.css);
    for (const part of row.keeps) assert.ok(kept.includes(part), `${row.name}: keeps ${part}`);
    for (const part of row.drops) assert.ok(!kept.includes(part), `${row.name}: drops ${part}`);
  }
});

const DEAD = [
  { candidate: 'shadow-md', want: /^`shadow-md` emits nothing under Arena's theme, which clears the Tailwind default it names\. Write one of `shadow-1`, `shadow-2`, `shadow-3`/ },
  { candidate: 'ease-in', want: /`ease-out`, `ease-in-out`, `ease-emphatic`, `ease-hover`, `ease-state`$/ },
  { candidate: 'rounded-3xl', want: /`rounded-xs`.*, and 8 more in css\/tailwind-theme\.css$/ },
  { candidate: 'text-gray-500', want: /Write one of `text-ink-/, not: /`text-overlay-/ },
  { candidate: 'bg-gray-100', want: /Write one of `bg-(surface|page)[a-z-]*`/, not: /`bg-ink-/ },
  { candidate: 'divide-gray-200', want: /`divide-edge-separator`/ },
  { candidate: 'placeholder-gray-500', want: /`placeholder-ink-/ },
  { candidate: 'border-x-gray-200', want: /Write one of `border-x-edge-/ },
  { candidate: 'font-sans', want: /`font-display`, `font-body`, `font-mono`/ },
  { candidate: 'max-w-lg', want: /Write one of `max-w-page`$/ },
  { candidate: 'hover:shadow-md', want: /^`hover:shadow-md` .*`hover:shadow-1`/ },
  { candidate: 'xl:flex', want: /^`xl:flex` emits nothing under Arena's theme, which has no `xl:` variant\. Write one of `sm:`, `md:`, `lg:`$/ },
  { candidate: 'hover:xl:flex', want: /no `xl:` variant/ },
  { candidate: 'max-xl:p-2', want: /`max-sm:`, `max-md:`, `max-lg:`$/ },
  { candidate: '@xl:p-2', want: /answers it with no variant$/ },
  { candidate: 'aspect-video', want: /answers it with no utility$/ },
  ...['p-7', 'gap-1.5', 'md:flex', 'bg-selected', 'text-ink-muted/62', 'text-[13px]', 'container',
    'bg-fill-selected', 'text-wrapper', 'arena-stack'].map((candidate) => ({ candidate, want: null })),
];

test('a candidate is dead when it emits nothing under Arena and something under Tailwind, with the answers named', async () => {
  const tailwind = await loadTailwind(TW) as Tailwind;
  const got = await deadUtilities(DEAD.map((row) => row.candidate), { arena: ARENA, own: '' }, tailwind, ROLES);
  for (const row of DEAD) {
    if (row.want === null) assert.ok(!got.has(row.candidate), `${row.candidate}: alive or dead under both`);
    else assert.match(got.get(row.candidate) ?? '', row.want, row.candidate);
    if ('not' in row && row.not) assert.doesNotMatch(got.get(row.candidate) ?? '', row.not, `${row.candidate}: leads with no wash`);
  }
});

test('the adopter\'s own theme compiles with Arena\'s, and a block Tailwind refuses rejects', async () => {
  const tailwind = await loadTailwind(TW) as Tailwind;
  const themed = await deadUtilities(['shadow-md'], { arena: ARENA, own: '@theme { --shadow-md: 0 1px 2px var(--ink-body); }' }, tailwind, ROLES);
  assert.ok(!themed.has('shadow-md'), 'a key the adopter declares is alive');
  await assert.rejects(
    deadUtilities(['shadow-md'], { arena: ARENA, own: '@utility x { @apply shadow-md; }' }, tailwind, ROLES),
    'a block Tailwind refuses rejects',
  );
});
