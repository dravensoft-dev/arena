/* Covers check-text-runs.ts. The cases that matter are the three a looser reader gets wrong: an
 * element whose only child is one expression, which is the shape this gate exists to ask for; an
 * element separating two runs with a real element, which both layers spell the same way and which
 * is not the defect; and an exemption for a line that no longer splits anything. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { splitRuns, textRunProblems, SPLIT_RUN } from './check-text-runs.ts';

const reader = (files: Record<string, string>) => (path: string) => files[path] ?? '';

test('literal text beside an expression is a run built out of pieces', () => {
  const found = splitRuns('A.tsx', 'const A = () => <div>Type "{word}" to confirm</div>;');
  assert.equal(found.length, 1);
  assert.equal(found[0]?.line, 1);
});

test('one expression is the whole run, whatever it computes', () => {
  assert.deepEqual(splitRuns('A.tsx', 'const A = () => <div>{`Type "${word}" to confirm`}</div>;'), []);
  assert.deepEqual(splitRuns('A.tsx', 'const A = () => <div>{pct}</div>;'), []);
  assert.deepEqual(splitRuns('A.tsx', 'const A = () => <div>Plain words only</div>;'), []);
});

test('an element between two runs is not a run built out of pieces, and both layers spell it so', () => {
  assert.deepEqual(
    splitRuns('A.tsx', 'const A = () => <span><b>{count}</b>{` ${noun} selected`}</span>;'),
    [],
  );
});

test('a nested element is reached, because a render is not one element deep', () => {
  const found = splitRuns('A.tsx', 'const A = () => <div><p><span>{a}% of it</span></p></div>;');
  assert.equal(found.length, 1);
});

test('the problem names the pieces, because the line alone does not say what to join', () => {
  const files = { 'A.tsx': 'const A = () => <div>No results for "{q}".</div>;' };
  const { problems } = textRunProblems(Object.keys(files), reader(files), new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /A\.tsx:1:/);
  assert.match(problems[0] ?? '', /No results for/);
  assert.match(problems[0] ?? '', /template literal/);
});

test('an exemption silences its own line and nothing else', () => {
  const files = { 'A.tsx': 'const A = () => <div>a{b}</div>;\nconst B = () => <div>c{d}</div>;' };
  const exempt = new Map([['A.tsx:1', 'why the first must stay apart']]);
  const { problems } = textRunProblems(Object.keys(files), reader(files), exempt);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /A\.tsx:2/);
});

test('an exemption for a line that joined its run fails as stale', () => {
  const files = { 'A.tsx': 'const A = () => <div>{`a${b}`}</div>;' };
  const exempt = new Map([['A.tsx:1', 'why']]);
  const { problems } = textRunProblems(Object.keys(files), reader(files), exempt);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /stale exemption/);
});

test('a sweep that read no render fails rather than passing over nothing', () => {
  const { problems } = textRunProblems([], reader({}), new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /found 0 render/);
});

test('SPLIT_RUN is empty, and that emptiness is the claim', () => {
  assert.equal(SPLIT_RUN.size, 0);
});
