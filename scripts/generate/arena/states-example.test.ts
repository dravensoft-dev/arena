/* The toggle example on markup/states.md is the page's claim that a state is styled from the roles alone, so
 * it is run through arena audit as a project's own markup would be. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../core/arena-cli/command-audit.ts';
import { namesAnAlias } from '../core/arena-cli/audit.ts';
import { readFamilies } from '../../lib/tailwind/vocabulary.ts';
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

test('the toggle example passes arena audit --strict=audit', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-states-'));
  made.push(root);
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'arena.config.json'), JSON.stringify(readable));
  writeFileSync(join(root, 'src', 'Toggle.html'), example());
  const arena = hostRoot('@dravensoft/arena-react', '1.0.0', {});
  const captured = captureIo(root, { arena, map: null, sheets: null, vocabulary: null, phosphor: null });
  const code = await run(['--strict=audit', '--src', 'src'], captured.io);
  assert.equal(code, 0, captured.err.join('\n'));
  assert.equal(captured.err.concat(captured.out).some((line) => line.includes('[audit]')), false);
});

test('the example reads no compatibility alias but the level a role combines with', () => {
  const roles = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'contracts', 'design', 'roles.json'), 'utf8'));
  const levels = new Set<string>();
  for (const role of Object.values(roles) as { $extensions?: Record<string, { combines?: { with: string }[] }> }[])
    for (const one of role.$extensions?.['com.dravensoft.arena']?.combines ?? []) levels.add(one.with);
  assert.ok(levels.has('level-accent-soft-primary'), 'fill-selected combines with its level');
  for (const line of example().split('\n')) {
    const bare = line.replaceAll(/var\(\s*--(level-[a-z-]+)\s*[,)]/g, (all, name) => (levels.has(name) ? 'x' : all));
    assert.equal(namesAnAlias(bare), false, line);
  }
});

test('every arena- class the example writes is a state class, and it writes all four', () => {
  const written = new Set<string>();
  for (const [, value] of example().matchAll(/class="([^"]*)"/g))
    for (const token of value!.split(/\s+/)) if (token.startsWith('arena-')) written.add(token);
  const family = Object.keys(readFamilies().get('state')!.variants).sort();
  assert.deepEqual([...written].sort(), family);
});

test('the toggle and the field carry the attributes the classes read', () => {
  const html = example();
  assert.match(html.match(/<button\b[^>]*>/)![0], /\baria-pressed=/, 'the toggle carries aria-pressed');
  assert.match(html.match(/<input\b[^>]*>/)![0], /\baria-invalid="true"/, 'the field carries aria-invalid');
  for (const variant of ['hover:', 'aria-pressed:', 'focus-visible:', 'disabled:', 'aria-[']) assert.equal(html.includes(variant), false, variant);
});

test('the field is labelled and describes itself by its message', () => {
  const html = example();
  const input = html.match(/<input\b[^>]*>/)![0];
  const id = input.match(/\bid="([^"]+)"/)?.[1];
  assert.ok(id, 'the input has an id');
  assert.ok(html.includes(`<label for="${id}">`), 'the input is labelled');
  const described = input.match(/\baria-describedby="([^"]+)"/)?.[1];
  assert.ok(described, 'the input names its message');
  const message = html.match(new RegExp(`<[a-z]+\\b[^>]*\\bid="${described}"[^>]*>`))?.[0];
  assert.ok(message, 'the described element exists');
  assert.match(message, /class="[^"]*\barena-invalid__message\b/, 'the message wears the message class');
});
