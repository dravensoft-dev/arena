import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { arenaColumnKey } from './ColumnKey.ts';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';

const warnings: string[] = [];
const savedWarn = console.warn;

beforeEach(() => {
  forgetArenaWarnings();
  warnings.length = 0;
  console.warn = (message: string) => { warnings.push(message); };
});
afterEach(() => { console.warn = savedWarn; });

test('a key of letters, digits, hyphens and underscores is returned and nothing is warned', () => {
  for (const key of ['status', 'order-id', 'order_id', 'Col2']) assert.equal(arenaColumnKey('T', key), key);
  assert.equal(warnings.length, 0);
});

test('no key names no column and warns nothing', () => {
  assert.equal(arenaColumnKey('T', undefined), null);
  assert.equal(warnings.length, 0);
});

test('a key that cannot name a property is null and warns once', () => {
  for (const key of ['order.id', 'first name', '']) {
    assert.equal(arenaColumnKey('T', key), null, `"${key}" named a column`);
    assert.equal(arenaColumnKey('T', key), null);
  }
  assert.equal(warnings.length, 3, 'one warning per distinct key');
  assert.match(warnings[0]!, /ArenaTable "T": column key "order\.id" is not a custom property name/);
});
