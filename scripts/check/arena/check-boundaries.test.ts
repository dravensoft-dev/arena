/* The coverage half of the boundary rule, the way check:compliance holds the behaviour suites:
 * both layers keep a suite that renders the derived cases, every transparent slot exists with a
 * reason, and every ITEM_SLOTS entry names a contracted slot and a contracted item. What a render
 * places where is the suites' to assert; boundary-cases.test.ts holds the verdict. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { suiteProblems, transparentProblems, itemSlotProblems, SUITES } from './check-boundaries.ts';

const SUITE = "boundaryCases(); siteProblems(kase, readSites(root, kase), 'react'); staleTransparentProblems(";

test('both suites present and deriving their cases is clean, and a missing or hand-listed suite fails', () => {
  assert.deepEqual(suiteProblems(() => SUITE), []);
  assert.match(suiteProblems((rel) => (rel === SUITES.angular ? null : SUITE)).join('\n'), /frameworks\/angular\/test\/Boundaries\.test\.ts: missing/);
  assert.match(suiteProblems(() => 'test(...)').join('\n'), /does not derive its cases/);
});

test('a transparent slot the manifest lacks, or one with no reason, fails', () => {
  const text = transparentProblems([{ component: 'ArenaMenu', slots: { root: 'x' }, transparent: { trigger: 'why', root: ' ' } }]).join('\n');
  assert.match(text, /ArenaMenu: trigger is declared transparent and is no slot/);
  assert.match(text, /ArenaMenu: root is declared transparent with no reason/);
});

test('an ITEM_SLOTS entry naming no contracted slot or no contracted item fails', () => {
  const contracts = new Map<string, { api?: Record<string, { form?: string }> }>([['ArenaTable', { api: { content: { form: 'slot' } } }], ['ArenaTableRow', { api: {} }]]);
  assert.deepEqual(itemSlotProblems(new Map([['ArenaTable.content', { item: 'ArenaTableRow', part: 'table.row', why: 'w' }]]), contracts), []);
  assert.match(itemSlotProblems(new Map([['ArenaTable.footer', { item: 'ArenaTableRow', part: 'table.row', why: 'w' }]]), contracts).join('\n'), /ArenaTable\.footer is no contracted slot/);
  assert.match(itemSlotProblems(new Map([['ArenaTable.content', { item: 'ArenaGone', part: 'gone', why: 'w' }]]), contracts).join('\n'), /ArenaGone is no contracted component/);
});
