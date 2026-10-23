import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { FROM_SOURCE, PROJECT, emitJit, jitProgram } from './jit-program.ts';
import { repoRoot } from '../arena/repo-root.ts';

const BUTTON = join(repoRoot, 'frameworks/angular/components/forms/arena-button/ArenaButton.ts');

test('a layer source loads through the transform, and the emitted tree, the package and an install do not', () => {
  assert.match(BUTTON, FROM_SOURCE);
  for (const outside of [
    'frameworks/angular/build/test/components/forms/arena-button/ArenaButton.js',
    'frameworks/angular/build/test/frameworks/angular/Phrase.ts',
    'frameworks/angular/dist/index.ts',
    'frameworks/angular/node_modules/x/index.ts',
    'frameworks/react/components/forms/arena-button/ArenaButton.tsx',
    'scripts/lib/angular/jit-program.ts',
  ]) assert.doesNotMatch(join(repoRoot, outside), FROM_SOURCE, outside);
});

test('a signal input keeps the metadata a template reads, which a plain strip of the types drops', () => {
  const out = emitJit(BUTTON, jitProgram());
  assert.match(out, /isSignal: true/, 'the transform wrote no signal-input metadata, so a binding would throw NG0950');
  assert.match(out, /sourceMappingURL=data:/, 'a failing case would point into emitted JavaScript rather than the source');
});

test('a file no program reads is refused with the tsconfig to add it to, never loaded untransformed', () => {
  assert.throws(() => emitJit(join(repoRoot, 'frameworks/angular/Nowhere.ts'), jitProgram()),
    (error: Error) => error.message.includes(PROJECT));
});
