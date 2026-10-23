/* A vocabulary class written on a component lands on one element it draws, whatever the
 * component. Every demo fixture is rendered with a probe class its vocabulary is made to allow
 * for the duration of the case, so the placement is measured before any family answers most
 * components; a class that lands nowhere, or twice, is a binding that a later family would find
 * broken with nothing to say so. A component with no element of its own is excepted by name, and
 * a chart draws its plot by hand and owns a manifest for its legend and tooltip only, so its root is held to one element without a part on it. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mount, cleanup } from './Harness.tsx';
import { element } from './FixtureRender.tsx';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARENA_CONTEXT_VOCABULARY } from '../Vocabulary.generated.ts';
import { loadDemos } from '../../../scripts/generate/arena/generate-kitchen-sink.ts';
import { instanceNode } from '../../../scripts/lib/arena/kitchen-sink-model.ts';
import { OWN_ELEMENTLESS } from '../../../scripts/lib/arena/elementless.ts';
import { manifestFor, HAND_DRAWN } from '../../../scripts/lib/tailwind/manifest-surfaces.ts';

afterEach(cleanup);

const PROBE = 'arena-root-probe';
const COMPONENTS = fileURLToPath(new URL('../components/', import.meta.url));
const modules = new Map<string, string>();
for (const group of readdirSync(COMPONENTS, { withFileTypes: true })) {
  if (!group.isDirectory()) continue;
  for (const dir of readdirSync(join(COMPONENTS, group.name), { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of readdirSync(join(COMPONENTS, group.name, dir.name))) {
      if (file.endsWith('.classes.generated.ts')) modules.set(file.slice(0, -'.classes.generated.ts'.length), join(COMPONENTS, group.name, dir.name, file));
    }
  }
}
const demos = [...loadDemos()].filter(([component]) => !OWN_ELEMENTLESS.has(component));

test('the sweep found components to measure', () => {
  assert.ok(demos.length > 0, 'found no demo fixture; an empty sweep is a failure, not a clean pass');
});

for (const [component, fixture] of demos) {
  test(`${component}: a vocabulary class lands on exactly one element it draws`, async () => {
    const file = modules.get(component);
    const list = (file ? (await import(file)).default.vocabulary : ARENA_CONTEXT_VOCABULARY) as string[];
    const before = [...list];
    list.splice(0, list.length, PROBE);
    try {
      const root = mount(element(instanceNode({ ...fixture, seed: { ...(fixture.seed ?? {}), className: PROBE } })));
      const carriers = [...root.querySelectorAll(`.${PROBE}`)];
      assert.equal(carriers.length, 1, `${component} put the class on ${carriers.length} element(s)`);
      if (manifestFor(component) && !HAND_DRAWN.has(component)) assert.ok(carriers[0]?.hasAttribute('data-arena-part'), `${component} put the class on an element that is no drawn part`);
    } finally {
      list.splice(0, list.length, ...before);
    }
  });
}
