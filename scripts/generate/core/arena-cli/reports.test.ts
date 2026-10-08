// The per-command strict sets: which kinds each command may hold, and the text it prints when it does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS_BY_COMMAND, STRICT_KINDS, REPORT_KINDS, UNHOLDABLE_KINDS, holder, heldMessage, report,
  RULES_BY_KIND, heldAs, reported, strictNames } from './reports.ts';
import { RULE_TAGS } from './audit.ts';

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

test('heldMessage names the held kinds once each, in first-seen order', () => {
  const held = [report('glyph', 'a'), report('contrast', 'b'), report('glyph', 'c')];
  assert.equal(heldMessage(['contrast', 'glyph'], held),
    '--strict holds contrast, glyph, and this run reports 3 of them: glyph, contrast');
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

test('heldMessage names a report held by its rule as kind:rule', () => {
  const held = [report('audit', 'a', 'emoji'), report('restated', 'b'), report('audit', 'c', 'emoji')];
  assert.equal(heldMessage(['audit:emoji', 'restated'], held),
    '--strict holds audit:emoji, restated, and this run reports 3 of them: audit:emoji, restated');
});
