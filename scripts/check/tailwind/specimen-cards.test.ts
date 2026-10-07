/* A specimen card is a page a browser runs, so nothing else reads its script before a person
 * opens it. Every card's module script must parse, and a family's card must say each option and
 * each axis the family declares, because a card that leaves one out shows a vocabulary smaller
 * than the one that ships. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { axesOf, readFamilies, type Family } from '../../lib/tailwind/vocabulary.ts';

const MODULE_SCRIPT = /<script type="module">([\s\S]*?)<\/script>/g;

export const cardsUnder = (base: string): string[] =>
  readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.card.html'))
    .map((entry) => join(entry.parentPath, entry.name)).sort();

export function scriptProblems(rel: string, html: string): string[] {
  const problems: string[] = [];
  for (const [, script] of html.matchAll(MODULE_SCRIPT))
    try {
      new Bun.Transpiler({ loader: 'js' }).transformSync(script!);
    } catch (err) {
      problems.push(`${rel}: the module script does not parse: ${(err as Error).message.split('\n')[0]}`);
    }
  return problems;
}

export function optionProblems(rel: string, html: string, family: Family): string[] {
  const text = html.replace(MODULE_SCRIPT, (_, script) => script);
  const missing = [...Object.keys(family.variants), ...axesOf(family)].filter((name) => !text.includes(name));
  return missing.map((name) => `${rel}: the card for ${family.family} never names ${name}`);
}

const TAILWIND = join(repoRoot, 'frameworks/tailwind');

test('every specimen card under frameworks/tailwind has a module script that parses', () => {
  const cards = cardsUnder(TAILWIND);
  assert.ok(cards.length >= 80, `${cards.length} cards read, at least 80 expected`);
  assert.deepEqual(cards.flatMap((card) => scriptProblems(card, readFileSync(card, 'utf8'))), []);
});

test('every family card names every option and every axis of its family', () => {
  const families = [...readFamilies().values()].filter((family) => Object.keys(family.variants).length + axesOf(family).length > 0);
  let read = 0;
  const problems: string[] = [];
  for (const family of families) {
    const dir = join(TAILWIND, 'vocabulary', `arena-${family.family}`);
    const cards = readdirSync(dir).filter((file) => file.endsWith('.card.html'));
    for (const card of cards) {
      read++;
      problems.push(...optionProblems(card, readFileSync(join(dir, card), 'utf8'), family));
    }
  }
  assert.ok(read >= 18, `${read} family cards read, at least 18 expected`);
  assert.deepEqual(problems, []);
});

test('an unclosed apostrophe in a card script is a problem, and a clean one is not', () => {
  const page = (body: string) => `<head></head><script type="module">\n${body}\n</script>`;
  assert.equal(scriptProblems('x.card.html', page("const a = 'ok';")).length, 0);
  assert.equal(scriptProblems('x.card.html', page("const a = 'unclosed;")).length, 1);
});

test('a card that drops an option or an axis is a problem', () => {
  const family: Family = { family: 'demo', reach: 'box', description: 'd', axis: '--arena-demo-x',
    variants: { 'arena-demo-a': '[x:1]', 'arena-demo-b': '[x:2]' } };
  assert.deepEqual(optionProblems('c', 'arena-demo-a arena-demo-b --arena-demo-x', family), []);
  assert.equal(optionProblems('c', 'arena-demo-a --arena-demo-x', family).length, 1);
  assert.equal(optionProblems('c', 'arena-demo-a arena-demo-b', family).length, 1);
});
