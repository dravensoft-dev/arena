import test from 'node:test';
import assert from 'node:assert/strict';
import { stepBlock } from './step-block.ts';

test('a block names the runner in its reason, heads the output with the step and ends with the note', () => {
  assert.equal(stepBlock('run-build', { name: 'build:site', reason: 'this is a full run' }, 'built\n', { status: 'pass' }),
    '\nrun-build: build:site runs, because this is a full run\n\n> build:site\n\nbuilt\n');
  assert.equal(stepBlock('check-all', { name: 'check:y' }, 'no newline', { status: 'fail', note: 'exited 3' }),
    '\n> check:y\n\nno newline\n  exited 3\n');
  assert.equal(stepBlock('run-build', { name: 'x', reason: null }, '', { status: 'pass' }), '\n> x\n\n');
});
