// The per-command strict sets: which kinds each command may hold, and the text it prints when it does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS_BY_COMMAND, STRICT_KINDS, REPORT_KINDS, UNHOLDABLE_KINDS, holder, heldMessage, report,
  RULES_BY_KIND, heldAs, reported, strictNames } from './reports.ts';
import { RULE_TAGS } from './audit.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../../lib/arena/repo-root.ts';

const sets = Object.entries(KINDS_BY_COMMAND) as [string, readonly string[]][];

test('the command sets are pairwise disjoint', () => {
  for (const [a, left] of sets) {
    for (const [b, right] of sets) {
      if (a !== b) assert.deepEqual(left.filter((kind) => right.includes(kind)), [], `${a} and ${b}`);
    }
  }
});

test('the command sets together cover STRICT_KINDS exactly', () => {
  const all = sets.flatMap(([, kinds]) => kinds);
  assert.deepEqual([...all].sort(), [...STRICT_KINDS].sort());
});

test('wash is in no command set and stays a report kind', () => {
  assert.deepEqual(UNHOLDABLE_KINDS, ['wash']);
  assert.ok(REPORT_KINDS.includes('wash'));
  assert.ok(!sets.some(([, kinds]) => kinds.includes('wash')));
});

test('holder names the command that holds a kind, and null for wash or an unknown one', () => {
  assert.equal(holder('contrast'), 'check');
  assert.equal(holder('restated'), 'audit');
  assert.equal(holder('environment'), 'doctor');
  assert.equal(holder('wash'), null);
  assert.equal(holder('nonsense'), null);
});

test('a report carries a rule only when it is given one', () => {
  assert.deepEqual(report('glyph', 'a'), { kind: 'glyph', message: 'a' });
  assert.deepEqual(report('audit', 'a', 'emoji'), { kind: 'audit', message: 'a', rule: 'emoji' });
});

test('reported holds a whole kind, a named rule, and not an unnamed rule of a kind not held whole', () => {
  const emoji = report('audit', 'e', 'emoji');
  const raw = report('audit', 'r', 'raw-value');
  const bare = report('audit', 'b');
  const restated = report('restated', 's');
  assert.deepEqual(reported([emoji, raw, bare, restated], ['audit']), [emoji, raw, bare]);
  assert.deepEqual(reported([emoji, raw, bare, restated], ['audit:emoji', 'restated']), [emoji, restated]);
  assert.deepEqual(reported([raw, bare], ['audit:emoji']), []);
});

test('the names strictNames writes hold every report the bare switch holds', () => {
  assert.deepEqual(RULES_BY_KIND, { audit: RULE_TAGS });
  assert.deepEqual(strictNames('audit'), [...RULE_TAGS.map((rule) => `audit:${rule}`), 'restated']);
  assert.deepEqual(strictNames('check'), [...KINDS_BY_COMMAND.check]);
  assert.deepEqual(strictNames('doctor'), ['environment']);
  const every = [...RULE_TAGS.map((rule) => report('audit', rule, rule)), report('restated', 's')];
  assert.deepEqual(reported(every, strictNames('audit')), reported(every, KINDS_BY_COMMAND.audit));
});

test('heldAs names the whole kind when it is held whole, and kind:rule otherwise', () => {
  const emoji = report('audit', 'e', 'emoji');
  assert.equal(heldAs(emoji, ['audit', 'audit:emoji']), 'audit');
  assert.equal(heldAs(emoji, ['audit:emoji']), 'audit:emoji');
  assert.equal(heldAs(emoji, ['audit:raw-value']), null);
  assert.equal(heldAs(report('audit', 'b'), ['audit:emoji']), null);
});

const HELD_MESSAGES: { name: string; holds: string[]; reports: ReturnType<typeof report>[]; expected: string }[] = [
  {
    name: 'heldMessage names the held kinds once each, in first-seen order',
    holds: ['contrast', 'glyph'],
    reports: [report('glyph', 'a'), report('contrast', 'b'), report('glyph', 'c')],
    expected: '--strict holds contrast, glyph, and this run reports 3 of them: glyph, contrast',
  },
  {
    name: 'heldMessage names a report held by its rule as kind:rule',
    holds: ['audit:emoji', 'restated'],
    reports: [report('audit', 'a', 'emoji'), report('restated', 'b'), report('audit', 'c', 'emoji')],
    expected: '--strict holds audit:emoji, restated, and this run reports 3 of them: audit:emoji, restated',
  },
];

test('heldMessage names the held kinds once each, and a rule-held report as kind:rule', () => {
  assert.ok(HELD_MESSAGES.length > 0, 'the table has rows');
  for (const row of HELD_MESSAGES) assert.equal(heldMessage(row.holds, row.reports), row.expected, row.name);
});

test('the cli page names every kind each command reports and holds', () => {
  const page = readFileSync(join(repoRoot, 'skills/design/references/cli.md'), 'utf8').split('\n');
  const spoken: Record<string, string> = { components: 'component', markers: 'marker' };
  const kindsOf = (row: string) => [...row.matchAll(/`([a-z]+)`/g)].map((hit) => hit[1]);
  for (const [command, kinds] of sets) {
    const held = page.find((line) => line.startsWith(`| \`arena ${command} --strict\` |`));
    assert.ok(held, `${command}: the --strict row`);
    assert.deepEqual(kindsOf(held), [...kinds], `${command}: the kinds the --strict row holds`);
  }
  const row = page.find((line) => line.startsWith('| `arena check` |'));
  assert.ok(row, 'the arena check row');
  const reports = /get wrong: (.+?) reports\b/.exec(row.split('|')[2] ?? '')?.[1] ?? '';
  const named = reports.split(/, | and /).map((word) => Object.entries(spoken).find(([, said]) => said === word)?.[0] ?? word);
  assert.deepEqual([...named].sort(), [...KINDS_BY_COMMAND.check].sort(), 'check: the report list names exactly the kinds the command reports');
});
