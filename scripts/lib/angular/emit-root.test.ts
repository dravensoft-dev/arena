import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { emitRoot, angularEmitRoot, declaredOption } from './emit-root.ts';
import { repoRoot } from '../arena/repo-root.ts';

const LAYER = '/repo/frameworks/angular';

test('a rootDir that is the layer root puts the emit at outDir itself', () => {
  assert.equal(
    emitRoot({ rootDir: LAYER, outDir: `${LAYER}/build/test`, layerRoot: LAYER }),
    join(LAYER, 'build', 'test'),
  );
});

test('a rootDir one directory above the layer pushes the emit down into a named subtree', () => {
  assert.equal(
    emitRoot({ rootDir: '/repo/frameworks', outDir: `${LAYER}/build/test`, layerRoot: LAYER }),
    join(LAYER, 'build', 'test', 'angular'),
  );
});

test('a layer outside rootDir emits nowhere this can name, so it is refused rather than guessed', () => {
  assert.throws(
    () => emitRoot({ rootDir: '/repo/frameworks/react', outDir: `${LAYER}/build/test`, layerRoot: LAYER }),
    /not under/,
  );
});

test('the test surface emits where bun is pointed, so a rootDir edit cannot empty the tree unseen', () => {
  assert.equal(
    angularEmitRoot(join(repoRoot, 'frameworks', 'angular', 'tsconfig.test.json')),
    join(repoRoot, 'frameworks', 'angular', 'build', 'test'),
  );
});

test('an option is read from the config that declares it, however far up the extends chain it sits', () => {
  const layer = join(repoRoot, 'frameworks', 'angular');
  assert.equal(declaredOption(join(layer, 'tsconfig.test.json'), 'outDir').value, './build/test');
  assert.equal(declaredOption(join(layer, 'tsconfig.test.json'), 'rootDir').value, '.');
  assert.equal(declaredOption(join(layer, 'tsconfig.test.json'), 'rootDir').dir, layer);
});
