/* The vocabulary page is emitted from the family files and the manifests that answer them, so a
 * family is listed by being declared and a component by answering it. Each family has an anchor
 * a prompt links to. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderVocabulary, VOCABULARY_TARGET } from './generate-vocabulary.ts';

test('every family is a row and a section, with its options, its default, its reach and who answers it', () => {
  const page = renderVocabulary();
  assert.match(page, /^<!-- GENERATED from frameworks\/tailwind\/vocabulary\/ by bun run generate:vocabulary\./);
  assert.match(page, /\| \[`fill`\]\(#fill\) \| box \| `arena-fill`, `arena-fit` \(default\) \|/);
  assert.match(page, /\n## fill\n/);
  assert.match(page, /ArenaButton/);
  assert.equal(VOCABULARY_TARGET, 'frameworks/VOCABULARY.md');
});

test('a markup family is answered by markup you write, carries no default, and says where its class goes', () => {
  const base = mkdtempSync(join(tmpdir(), 'vocabulary-page-'));
  mkdirSync(join(base, 'frameworks/tailwind/components'), { recursive: true });
  const family = (dir: string, body: object) => {
    mkdirSync(join(base, 'frameworks/tailwind/vocabulary', dir), { recursive: true });
    writeFileSync(join(base, 'frameworks/tailwind/vocabulary', dir, `${dir}.family.json`), JSON.stringify(body));
  };
  family('fill', { family: 'fill', reach: 'box', description: 'd', default: 'arena-fit',
    variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' } });
  family('stack', { family: 'stack', reach: 'box', target: 'markup', description: 'd', variants: { 'arena-stack': '[display:flex]' } });
  family('density', { family: 'density', reach: 'context', target: 'markup', restates: 'dz', description: 'd',
    variants: { 'arena-compact': 'contracts/design/density.compact.json' } });
  const page = renderVocabulary(base);
  assert.match(page, /\| \[`stack`\]\(#stack\) \| box \| `arena-stack` \| {2}\| markup you write \|/);
  const section = page.split('\n## stack\n')[1]?.split('\n## ')[0] ?? '';
  assert.doesNotMatch(section, /\(default\)/);
  assert.match(section, /- \*\*Written on:\*\* an element you wrote, never a component\./);
  assert.match(section, /it decides that element alone/);
  assert.match(page, /A markup family's class goes on an element you wrote/);
  assert.match(page, /- \*\*Values:\*\* `arena-compact` restates `contracts\/design\/density\.compact\.json`\./);
});
