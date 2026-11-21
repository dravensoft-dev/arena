import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { scanText, scanFile, markerAllowlist, walk, SKIPPED_NAMES } from './check-arbitrary-values.ts';

const SCAN_ROWS: { name: string; source: string; classes?: string[]; sorted?: boolean; count?: number }[] = [
  { name: 'flags a raw length', source: '"root": "px-3 text-[13px] font-semibold"', classes: ['text-[13px]'] },
  { name: 'flags a raw hex and a raw rgb', source: 'bg-[#b52a20] text-[rgb(20,16,16)]', classes: ['bg-[#b52a20]', 'text-[rgb(20,16,16)]'] },
  { name: 'allows a var() reference to a token, with or without a type hint', source: 'h-[var(--dz-ctl-h)] duration-[var(--dur-mid)] border-[length:var(--bw-strong)]', classes: [] },
  { name: 'allows a bracket that names properties rather than values', source: 'transition-[background,transform,box-shadow]', classes: [] },
  { name: 'allows a keyword', source: 'bg-[currentColor]', classes: [] },
  { name: 'does not flag array indexing or object access in JS', source: 'const s = SIZES[size] || SIZES.md; rows[0].cells[2]', classes: [] },
  { name: 'does not flag a React inline style with a literal px', source: "style={{ padding: '0 12px', fontSize: 13 }}", classes: [] },
  { name: 'a calc() over a token times a number is a derivation, not a literal', source: 'text-[length:calc(var(--avatar-md)*0.4)]', classes: [] },
  { name: 'a calc() inside a shadow is a derivation, not a literal', source: 'shadow-[inset_0_calc(var(--bw-strong)*-1)_0_var(--crimson)]', classes: [] },
  { name: 'a calc() over two tokens is a derivation, not a literal', source: 'w-[calc(var(--container-max)-var(--layout-sidebar))]', classes: [] },
  { name: 'a min() over tokens is a derivation, not a literal', source: 'h-[min(var(--dz-ctl-h),var(--icon-xl))]', classes: [] },
  { name: 'a bracket carrying a unit the token layer does not model is legal', source: 'max-w-[42ch] max-w-[92vw] pt-[12vh] w-[62%] rotate-[120deg]', classes: [] },
  {
    name: 'a modelled unit is still a violation, inside calc() or not',
    source: 'text-[13px] duration-[200ms] p-[1rem] w-[calc(var(--sp-4)+8px)]',
    classes: ['duration-[200ms]', 'p-[1rem]', 'text-[13px]', 'w-[calc(var(--sp-4)+8px)]'],
    sorted: true,
  },
  { name: 'a bare number outside a math function is still a violation', source: 'z-[900]', classes: ['z-[900]'] },
  { name: 'a hex is a violation however it is wrapped', source: 'bg-[#b52a20] bg-[color-mix(in_oklab,#b52a20_14%,transparent)]', count: 2 },
  { name: 'a bare number after a calc() of a bare token is still a violation', source: 'z-[calc(var(--z-modal))_900]', classes: ['z-[calc(var(--z-modal))_900]'] },
  { name: 'a bare number after a calc() of a product is still a violation', source: 'z-[calc(var(--sp-1)*2)_900]', classes: ['z-[calc(var(--sp-1)*2)_900]'] },
  { name: 'a bare number after a calc() in a shadow is still a violation', source: 'shadow-[shadow_calc(var(--bw))_5]', classes: ['shadow-[shadow_calc(var(--bw))_5]'] },
];

test('scanText flags a raw value however it is wrapped and lets a token reference, a keyword, a property list and a derivation through', () => {
  for (const row of SCAN_ROWS) {
    const hits = scanText(row.source);
    if (row.count !== undefined) assert.equal(hits.length, row.count, row.name);
    if (row.classes) {
      const classes = hits.map((h) => h.cls);
      assert.deepEqual(row.sorted ? classes.sort() : classes, row.classes, row.name);
    }
  }
});

const MARKER = (cls: string) => `<!-- check-arbitrary-values allow: ${cls} -->\n`;
const TWO_MARKERS = "Don't: `text-[13px]` or `bg-[#b52a20]`\n\n" + MARKER('text-[13px]') + MARKER('bg-[#b52a20]');

const FILE_ROWS: { name: string; file: string; text: string; patterns: RegExp[]; allowlist?: Set<string> }[] = [
  { name: 'a marker exempts the class it lists, in a .md file', file: 'a.prompt.md', text: "Don't: `text-[13px]`\n\n" + MARKER('text-[13px]'), patterns: [] },
  { name: 'a listed class still fails in a .md file with no marker', file: 'a.prompt.md', text: "Don't: `text-[13px]`\n", patterns: [/`text-\[13px\]` — a raw value, not a token/] },
  {
    name: 'an unlisted class still fails in a .md file that has a marker',
    file: 'a.prompt.md',
    text: "Don't: `text-[13px]` or `bg-[#b52a20]`\n\n" + MARKER('text-[13px]'),
    patterns: [/`bg-\[#b52a20\]` — a raw value, not a token/],
  },
  { name: 'two markers in one file union their allowances', file: 'a.prompt.md', text: TWO_MARKERS, patterns: [], allowlist: new Set(['text-[13px]', 'bg-[#b52a20]']) },
  {
    name: 'a stale allowance fails: a marker naming a class the file does not carry',
    file: 'a.prompt.md',
    text: 'No bad examples here.\n\n' + MARKER('text-[13px]'),
    patterns: [/stale allowance `text-\[13px\]`/],
  },
  {
    name: 'a marker in a non-.md file is itself reported as an error',
    file: 'a.jsx',
    text: '// ' + MARKER('text-[13px]') + 'const x = "text-[13px]";\n',
    patterns: [/marker is only honoured in \.md files/, /`text-\[13px\]` — a raw value, not a token/],
  },
];

test('scanFile honours a marker in a .md file only, reports an unlisted class and a stale allowance, and reports a marker anywhere else', () => {
  for (const row of FILE_ROWS) {
    if (row.allowlist) assert.deepEqual(markerAllowlist(row.text), row.allowlist, row.name);
    const errs = scanFile(row.file, row.text);
    assert.equal(errs.length, row.patterns.length, row.name);
    row.patterns.forEach((pattern, i) => assert.match(errs[i] ?? '', pattern, row.name));
  }
});

test('a compiled copy is not a second source, and only copies are skipped', () => {
  const root = mkdtempSync(join(tmpdir(), 'arbitrary-walk-'));
  try {
    for (const dir of ['react', 'react/dist', 'react/vendor', 'angular/build', 'angular/components'])
      mkdirSync(join(root, dir), { recursive: true });
    for (const rel of ['react/Real.ts', 'react/dist/Copy.ts', 'react/vendor/Dep.ts',
      'angular/build/Emitted.ts', 'angular/components/Real.html'])
      writeFileSync(join(root, rel), '// fixture');

    const found = [...walk(root, join(root, 'angular', 'build'))].map((p) => relPosix(root, p)).sort();
    assert.deepEqual(found, ['angular/components/Real.html', 'react/Real.ts'],
      'a walk that reads dist/ reports on the same code twice and on output nobody wrote');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the emitted tree is skipped by its anchored path, so scripts/build/ would still be read', () => {
  assert.equal(SKIPPED_NAMES.has('build'), false,
    'skipping every directory called build would take the phase directory with it, which is '
    + 'the reason layers.ts anchors emittedTree rather than naming it');
});
