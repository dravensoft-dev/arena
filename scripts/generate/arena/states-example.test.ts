/* The toggle example on markup/states.md is the page's claim that a state is styled from the roles alone, so
 * it is run through arena audit as a project's own markup would be. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../core/arena-cli/command-audit.ts';
import { namesAnAlias } from '../core/arena-cli/audit.ts';
import { captureIo, hostRoot, readable, removeFixtures } from '../core/arena-cli/cli-fixtures.ts';

after(removeFixtures);

const made: string[] = [];
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });

const PAGE = join(import.meta.dirname, '..', '..', '..', 'skills', 'design', 'references', 'tokens', 'markup', 'states.md');

function example(): string {
  const text = readFileSync(PAGE, 'utf8');
  const at = text.indexOf('## A toggle that shows every state');
  assert.notEqual(at, -1, 'the page has no toggle section');
  const heading = text.indexOf('\n', at);
  const next = text.indexOf('\n## ', heading);
  const section = text.slice(heading, next === -1 ? undefined : next);
  const fences = [...section.matchAll(/```html\n([\s\S]*?)```/g)];
  assert.equal(fences.length, 1, 'the toggle section carries one html fence');
  return fences[0]![1]!;
}

test('the toggle example passes arena audit --strict=audit', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-states-'));
  made.push(root);
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'arena.config.json'), JSON.stringify(readable));
  writeFileSync(join(root, 'src', 'Toggle.html'), example());
  const arena = hostRoot('@dravensoft/arena-react', '1.0.0', {});
  const captured = captureIo(root, { arena, map: null, sheets: null, vocabulary: null, phosphor: null });
  const code = run(['--strict=audit', '--src', 'src'], captured.io);
  assert.equal(code, 0, captured.err.join('\n'));
  assert.equal(captured.err.concat(captured.out).some((line) => line.includes('[audit]')), false);
});

test('the example reads no compatibility alias', () => {
  for (const line of example().split('\n')) assert.equal(namesAnAlias(line), false, line);
});

test('the example names every state attribute', () => {
  const html = example();
  for (const needle of ['aria-pressed', 'focus-visible:', 'disabled:', 'aria-invalid']) assert.ok(html.includes(needle), needle);
});

test('the invalid edge sits under an aria-invalid variant and the field is labelled', () => {
  const html = example();
  assert.match(html, /aria-\[invalid=true\]:border-edge-invalid/);
  assert.equal(/(?<!aria-\[invalid=true\]:)border-edge-invalid/.test(html), false, 'a bare border-edge-invalid never turns off');
  const input = html.match(/<input\b[^>]*>/)![0];
  const id = input.match(/\bid="([^"]+)"/)?.[1];
  assert.ok(id, 'the input has an id');
  assert.ok(html.includes(`<label for="${id}">`), 'the input is labelled');
});
