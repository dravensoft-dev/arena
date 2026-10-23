// weight-measure: the figures check:weight reads, from small inputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { brotliCompressSync, constants } from 'node:zlib';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import { brotliKB, reactBundle, typicalScreen, weightProblems } from './weight-measure.ts';

const BUDGETS = [{ figure: 'a', kb: 1, reason: 'start × 1.05' }, { figure: 'b', kb: 0, reason: 'start × 1.05' }];
const CEILINGS = [{ figure: 'total', kb: 5, reason: 'acceptance' }];

test('weightProblems names each figure over its budget and each total over its ceiling', () => {
  const figures = [{ figure: 'a', kb: 1.5 }, { figure: 'b', kb: 0 }, { figure: 'total', kb: 6 }];
  const problems = weightProblems(figures, BUDGETS, CEILINGS);
  assert.equal(problems.length, 2);
  assert.match(problems[0] ?? '', /^a: 1\.5 KB is over its budget of 1 KB/);
  assert.match(problems[1] ?? '', /^total: 6 KB is over its ceiling of 5 KB/);
  assert.deepEqual(weightProblems([{ figure: 'a', kb: 1 }, { figure: 'b', kb: 0 }, { figure: 'total', kb: 5 }], BUDGETS, CEILINGS), []);
  assert.match(weightProblems([{ figure: 'b', kb: 0 }, { figure: 'total', kb: 1 }], BUDGETS, CEILINGS).join(), /a: budgeted at 1 KB but not measured/);
});

test('brotliKB matches node zlib q11', () => {
  const bytes = Buffer.from(Array.from({ length: 400 }, (_, i) => `const v${i} = ${i * 7};`).join('\n'));
  const out = brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 } });
  assert.equal(brotliKB(bytes), Math.round(out.length / 10.24) / 100);
});

test('a patched chunk with its predecessor as dictionary costs less than without', () => {
  const before = Buffer.from(Array.from({ length: 800 }, (_, i) => `function f${i}(a){return a*${i}+Math.sqrt(a)}`).join('\n'));
  const after = Buffer.concat([before, Buffer.from('\nfunction patched(){return 1}')]);
  assert.ok(brotliKB(after, before) < brotliKB(after), 'the dictionary saved nothing');
});

test('reactBundle keeps Arena in its own chunk', async () => {
  const dist = join(repoRoot, '.cache', 'plan-1.29', 'weight-fixture');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  try {
    const names = typicalScreen('react').components;
    assert.equal(names.length, 12);
    writeFileSync(join(dist, 'shared.js'), "export const MARK = 'arena-shared-marker';\n");
    writeFileSync(join(dist, 'Index.generated.js'), "import { createElement } from 'react';\nimport { MARK } from './shared.js';\n"
      + names.map((n) => `export function ${n}(p) { return createElement('div', null, MARK, p.title); }`).join('\n') + '\n');
    const out = await reactBundle(dist, 'typical');
    assert.match(Buffer.from(out.arena).toString(), /arena-shared-marker/);
    assert.doesNotMatch(Buffer.from(out.app).toString(), /arena-shared-marker/);
    assert.doesNotMatch(Buffer.from(out.arena).toString(), /Sales dashboard/);
    assert.match(Buffer.from(out.app).toString(), /Sales dashboard/);
    assert.ok(out.react.length > 1000, 'React is not in a chunk of its own');
    const patched = await reactBundle(dist, 'typical', (file, text) => (file === 'shared.js' ? text.replace('marker', 'patched') : text));
    assert.match(Buffer.from(patched.arena).toString(), /arena-shared-patched/);
    assert.deepEqual(Buffer.from(patched.react), Buffer.from(out.react));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});
