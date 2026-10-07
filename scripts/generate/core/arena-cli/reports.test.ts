// The per-command strict sets: which kinds each command may hold, and the text it prints when it does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS_BY_COMMAND, STRICT_KINDS, REPORT_KINDS, UNHOLDABLE_KINDS, holder, heldMessage, report } from './reports.ts';

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
