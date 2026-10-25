import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assertPatternCases } from './AssertPattern.tsx';

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

function bindingFile(binding: unknown) {
  const dir = track(mkdtempSync(join(tmpdir(), 'arena-cases-')));
  const p = join(dir, 'X.behaviour.json');
  writeFileSync(p, JSON.stringify(binding));
  return p;
}

const TWO_CASES = {
  cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ],
};

test('a suite that renders only one declared case is refused', () => {
  const p = bindingFile(TWO_CASES);
  assert.throws(
    () => assertPatternCases({ bindingPath: p, cases: { danger: () => { throw new Error('never'); } } }),
    /advisory/,
    'the missing case must be named',
  );
});

test('a case name the binding does not declare is refused', () => {
  const p = bindingFile(TWO_CASES);
  assert.throws(
    () => assertPatternCases({
      bindingPath: p,
      // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
      cases: { danger: () => ({ root: null }), advisory: () => ({ root: null }), typo: () => ({ root: null }) },
    }),
    /typo/,
  );
});

test('a flat binding cannot be asserted through the cases entry point', () => {
  const p = bindingFile({ pattern: 'status', exceptions: [] });
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => assertPatternCases({ bindingPath: p, cases: { only: () => ({ root: null }) } }),
    /declares no cases/,
  );
});

test('a binding declaring the same case name twice is refused, not diffed', () => {
  const p = bindingFile({
    cases: [
      { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
      { name: 'danger', when: 'tone is still "danger"', pattern: 'status', exceptions: [] },
    ],
  });
  assert.throws(
    () => assertPatternCases({ bindingPath: p, cases: { danger: () => { throw new Error('never'); } } }),
    /danger/,
  );
});
