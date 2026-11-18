import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSlotDiff, slotDiff } from './slot-diff.ts';
import type { SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';

const catalogue = (slots: Record<string, object>) => ({ accepts: {}, refused: [], states: [], families: {}, rings: {}, slots }) as unknown as SlotCatalogue;

test('slotDiff reports added, removed and per-field changes', () => {
  const before = catalogue({ a: { default: '{x}', level: 'l' }, b: { default: '{y}' }, c: { default: '{z}' } });
  const after = catalogue({ a: { default: '{x2}' }, b: { default: '{y}' }, d: { default: '{w}' } });
  const diff = slotDiff(before, after);
  assert.deepEqual(diff.added, ['d']);
  assert.deepEqual(diff.removed, ['c']);
  assert.deepEqual(diff.changed, [{ name: 'a', fields: { default: ['{x}', '{x2}'], level: ['l', undefined] } }]);
  assert.match(formatSlotDiff(diff), /^1 added, 1 removed, 1 changed\n\+ d\n- c\n~ a /);
});
