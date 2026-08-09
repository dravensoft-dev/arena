import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { scanText, scanFile, markerAllowlist, walk, SKIPPED_NAMES } from './check-arbitrary-values.ts';

const found = (s: string) => scanText(s).map((f) => f.cls);

test('flags a raw length', () => {
  assert.deepEqual(found('"root": "px-3 text-[13px] font-semibold"'), ['text-[13px]']);
});

test('flags a raw hex and a raw rgb', () => {
  assert.deepEqual(found('bg-[#b52a20] text-[rgb(20,16,16)]'), ['bg-[#b52a20]', 'text-[rgb(20,16,16)]']);
});

test('allows a var() reference to a token, with or without a type hint', () => {
  assert.deepEqual(found('h-[var(--dz-ctl-h)] duration-[var(--dur-mid)] border-[length:var(--bw-strong)]'), []);
});

test('allows a bracket that names properties rather than values', () => {
  assert.deepEqual(found('transition-[background,transform,box-shadow]'), []);
});

test('allows a keyword', () => {
  assert.deepEqual(found('bg-[currentColor]'), []);
});

test('does not flag array indexing or object access in JS', () => {
  assert.deepEqual(found('const s = SIZES[size] || SIZES.md; rows[0].cells[2]'), []);
});

test('does not flag a React inline style with a literal px', () => {
  assert.deepEqual(found("style={{ padding: '0 12px', fontSize: 13 }}"), []);
});

test('a marker exempts the class it lists, in a .md file', () => {
  const text = 'Don\'t: `text-[13px]`\n\n<!-- check-arbitrary-values allow: text-[13px] -->\n';
  assert.deepEqual(scanFile('a.prompt.md', text), []);
});

test('a listed class still fails in a .md file with no marker', () => {
  const errs = scanFile('a.prompt.md', 'Don\'t: `text-[13px]`\n');
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /`text-\[13px\]` — a raw value, not a token/);
});

test('an unlisted class still fails in a .md file that has a marker', () => {
  const text =
    'Don\'t: `text-[13px]` or `bg-[#b52a20]`\n\n<!-- check-arbitrary-values allow: text-[13px] -->\n';
  const errs = scanFile('a.prompt.md', text);
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /`bg-\[#b52a20\]` — a raw value, not a token/);
});

test('two markers in one file union their allowances', () => {
  const text =
    'Don\'t: `text-[13px]` or `bg-[#b52a20]`\n\n' +
    '<!-- check-arbitrary-values allow: text-[13px] -->\n' +
    '<!-- check-arbitrary-values allow: bg-[#b52a20] -->\n';
  assert.deepEqual(markerAllowlist(text), new Set(['text-[13px]', 'bg-[#b52a20]']));
  assert.deepEqual(scanFile('a.prompt.md', text), []);
});

test('a stale allowance fails: a marker naming a class the file does not carry', () => {
  const text = 'No bad examples here.\n\n<!-- check-arbitrary-values allow: text-[13px] -->\n';
  const errs = scanFile('a.prompt.md', text);
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /stale allowance `text-\[13px\]`/);
});

test('a marker in a non-.md file is itself reported as an error', () => {
  const text = '// <!-- check-arbitrary-values allow: text-[13px] -->\nconst x = "text-[13px]";\n';
  const errs = scanFile('a.jsx', text);
  assert.equal(errs.length, 2);
  assert.match(errs[0] ?? '', /marker is only honoured in \.md files/);
  assert.match(errs[1] ?? '', /`text-\[13px\]` — a raw value, not a token/);
});

test('a calc() over tokens is a derivation, not a literal', () => {
  assert.deepEqual(scanText('text-[length:calc(var(--avatar-md)*0.4)]'), []);
  assert.deepEqual(scanText('shadow-[inset_0_calc(var(--bw-strong)*-1)_0_var(--crimson)]'), []);
  assert.deepEqual(scanText('w-[calc(var(--container-max)-var(--layout-sidebar))]'), []);
  assert.deepEqual(scanText('h-[min(var(--dz-ctl-h),var(--icon-xl))]'), []);
});

test('a bracket carrying a unit the token layer does not model is legal', () => {
  assert.deepEqual(scanText('max-w-[42ch] max-w-[92vw] pt-[12vh] w-[62%] rotate-[120deg]'), []);
});

test('a modelled unit is still a violation, inside calc() or not', () => {
  const hits = scanText('text-[13px] duration-[200ms] p-[1rem] w-[calc(var(--sp-4)+8px)]');
  assert.deepEqual(hits.map((h) => h.cls).sort(),
    ['duration-[200ms]', 'p-[1rem]', 'text-[13px]', 'w-[calc(var(--sp-4)+8px)]']);
});

test('a bare number outside a math function is still a violation', () => {
  assert.deepEqual(scanText('z-[900]').map((h) => h.cls), ['z-[900]']);
});

test('a hex is a violation however it is wrapped', () => {
  assert.deepEqual(scanText('bg-[#b52a20] bg-[color-mix(in_oklab,#b52a20_14%,transparent)]').length, 2);
});

test('a bare number outside the math function is still a violation, even when the bracket also contains one', () => {
  assert.deepEqual(scanText('z-[calc(var(--z-modal))_900]').map((h) => h.cls), ['z-[calc(var(--z-modal))_900]']);
  assert.deepEqual(scanText('z-[calc(var(--sp-1)*2)_900]').map((h) => h.cls), ['z-[calc(var(--sp-1)*2)_900]']);
  assert.deepEqual(scanText('shadow-[shadow_calc(var(--bw))_5]').map((h) => h.cls), ['shadow-[shadow_calc(var(--bw))_5]']);
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
