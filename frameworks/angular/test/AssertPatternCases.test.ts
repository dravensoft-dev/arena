import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assertPattern, assertPatternCases } from './Compliance';

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

function bindingFile(binding: unknown): string {
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
      cases: {
        danger: () => ({ root: null as unknown as Element }),
        advisory: () => ({ root: null as unknown as Element }),
        typo: () => ({ root: null as unknown as Element }),
      },
    }),
    /typo/,
  );
});

test('a flat binding cannot be asserted through the cases entry point', () => {
  const p = bindingFile({ pattern: 'status', exceptions: [] });
  assert.throws(
    () => assertPatternCases({ bindingPath: p, cases: { only: () => ({ root: null as unknown as Element }) } }),
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

test('an also pattern with no file is refused, and the message says it came from also', () => {
  const p = bindingFile({ pattern: 'status', exceptions: [], also: [{ pattern: 'no-such-pattern', exceptions: [] }] });
  assert.throws(
    () => assertPattern({ root: null as unknown as Element, bindingPath: p }),
    /names pattern "no-such-pattern" in `also`/,
  );
});
