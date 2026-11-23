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
