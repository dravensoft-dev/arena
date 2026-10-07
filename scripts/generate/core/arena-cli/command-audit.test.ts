/* arena audit against throwaway projects: a rule break, a restated declaration, the strict set and the
 * summary line. A project is a temp directory, so every case reads real files and nothing else. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './command-audit.ts';
import { captureIo, hostRoot, readable } from './cli-fixtures.ts';

const BREAK = '<div style={{ color: "#b52a20" }} />';
const CARD = '.arena-card__title {\n  color: var(--ink-muted);\n}\n';
const RESTATE = '[data-arena-part="card.title"] { color: var(--ink-muted); }\n';

function tree(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' }).sort()
    .map((name) => (statSync(join(root, name)).isFile() ? `${name}=${readFileSync(join(root, name), 'utf8')}` : name));
}

function setup(files: Record<string, string>, plugin = false) {
  const root = mkdtempSync(join(tmpdir(), 'arena-audit-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'arena.config.json'),
    JSON.stringify(plugin ? { ...readable, stylePlugins: ['plugin'] } : readable));
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(root, name, '..'), { recursive: true });
    writeFileSync(join(root, name), content);
  }
  const arena = hostRoot('@dravensoft/arena-react', '1.0.0', {});
  mkdirSync(join(arena, 'css', 'components'), { recursive: true });
  writeFileSync(join(arena, 'css', 'components', 'arena-card.css'), CARD);
  return { root, arena };
}

function audit(root: string, arena: string, argv: string[] = []) {
  const captured = captureIo(root, { arena, map: null, sheets: null, vocabulary: null, phosphor: null });
  const code = run(argv, captured.io);
  return { code, out: captured.out, err: captured.err };
}

test('audit writes nothing', () => {
  const { root, arena } = setup({ 'src/App.tsx': BREAK });
  const before = tree(root);
  audit(root, arena, ['--strict']);
  assert.deepEqual(tree(root), before);
});

test('a rule break is reported, and exits 0 without --strict', () => {
  const { root, arena } = setup({ 'src/App.tsx': BREAK });
  const result = audit(root, arena);
  assert.equal(result.code, 0);
  assert.match(result.err.join('\n'), /\[audit\] .*raw hex/);
});

test('--strict exits 1 on audit and on restated', () => {
  const broken = setup({ 'src/App.tsx': BREAK });
  const first = audit(broken.root, broken.arena, ['--strict']);
  assert.equal(first.code, 1);
  assert.match(first.err.join('\n'), /--strict holds audit, restated, and this run reports 1 of them: audit/);

  const restated = setup({ 'src/App.tsx': '<p />', 'plugin/rules.css': RESTATE }, true);
  const second = audit(restated.root, restated.arena, ['--strict']);
  assert.match(second.err.join('\n'), /\[restated\]/);
  assert.equal(second.code, 1);
});

test('--strict=restated does not hold an audit finding', () => {
  const { root, arena } = setup({ 'src/App.tsx': BREAK });
  const result = audit(root, arena, ['--strict=restated']);
  assert.equal(result.code, 0);
  assert.match(result.err.join('\n'), /\[audit\]/);
});

test('the summary line counts files and findings, and the painted note is absent', () => {
  const { root, arena } = setup({ 'src/App.tsx': BREAK, 'src/b.tsx': '<p />' });
  const result = audit(root, arena);
  assert.equal(result.out.length, 1);
  assert.match(result.out[0]!, /^arena audit: audited 2 file\(s\), 1 finding\(s\)\. No gate reads your application, so these hold because you hold them$/);
  assert.doesNotMatch(result.out.join('\n'), /paint/);
  const clean = setup({ 'src/b.tsx': '<p />' });
  assert.match(audit(clean.root, clean.arena).out[0]!, /audited 1 file\(s\), no finding\(s\)/);
});

test('a missing --src exits 2', () => {
  const { root, arena } = setup({});
  const result = audit(root, arena, ['--src', 'nowhere']);
  assert.equal(result.code, 2);
  assert.match(result.err.join('\n'), /arena audit: .*nowhere is not there/);
});
