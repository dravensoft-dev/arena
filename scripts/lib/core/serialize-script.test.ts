import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeScript } from './serialize-script.ts';

const SCRIPT_VALUES: { name: string; token: Parameters<typeof serializeScript>[0]; expected: number }[] = [
  { name: 'a dimension yields its bare number, unit dropped', token: { $type: 'dimension', $value: { value: 280, unit: 'px' } }, expected: 280 },
  { name: 'a zero dimension yields 0, not the empty string', token: { $type: 'dimension', $value: { value: 0, unit: 'px' } }, expected: 0 },
  { name: 'a duration yields its bare number in ms', token: { $type: 'duration', $value: { value: 4200, unit: 'ms' } }, expected: 4200 },
  {
    name: 'a number yields itself, and the cssUnit render hint is ignored',
    token: { $type: 'number', $value: 0.02, $extensions: { 'com.dravensoft.arena': { cssUnit: 'em' } } },
    expected: 0.02,
  },
];

test('a script-readable token yields its bare number', () => {
  assert.ok(SCRIPT_VALUES.length > 0, 'the table has rows');
  for (const row of SCRIPT_VALUES) assert.equal(serializeScript(row.token), row.expected, row.name);
});

test('a type whose value is not a number is refused', () => {
  assert.throws(
    () => serializeScript({ $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0] } }),
    /not script-readable/,
  );
});

