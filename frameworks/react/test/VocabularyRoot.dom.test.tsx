/* A vocabulary class written on a component lands on one element it draws, whatever the
 * component. Every demo fixture is rendered with a probe class its vocabulary is made to allow
 * for the duration of the case, so the placement is measured before any family answers most
 * components; a class that lands nowhere, or twice, is a binding that a later family would find
 * broken with nothing to say so. A component with no element of its own is excepted by name, and
 * one drawn by hand with no manifest (a chart) is held to one element without a part on it. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mount, cleanup } from './Harness.tsx';
import { element } from './FixtureRender.tsx';
import { ARENA_VOCABULARY } from '../Vocabulary.generated.ts';
import { loadDemos } from '../../../scripts/generate/arena/generate-kitchen-sink.ts';
import { instanceNode } from '../../../scripts/lib/arena/kitchen-sink-model.ts';
import { OWN_ELEMENTLESS } from '../../../scripts/check/arena/check-api.ts';
import { manifestFor } from '../../../scripts/lib/tailwind/manifest-surfaces.ts';

afterEach(cleanup);

const PROBE = 'arena-root-probe';
const allowed = ARENA_VOCABULARY as Record<string, readonly string[]>;
const demos = [...loadDemos()].filter(([component]) => !OWN_ELEMENTLESS.has(component));

test('the sweep found components to measure', () => {
  assert.ok(demos.length > 0, 'found no demo fixture; an empty sweep is a failure, not a clean pass');
});

for (const [component, fixture] of demos) {
  test(`${component}: a vocabulary class lands on exactly one element it draws`, () => {
    const before = allowed[component];
    allowed[component] = [PROBE];
    try {
      const root = mount(element(instanceNode({ ...fixture, seed: { ...(fixture.seed ?? {}), className: PROBE } })));
      const carriers = [...root.querySelectorAll(`.${PROBE}`)];
      assert.equal(carriers.length, 1, `${component} put the class on ${carriers.length} element(s)`);
      if (manifestFor(component)) assert.ok(carriers[0]?.hasAttribute('data-arena-part'), `${component} put the class on an element that is no drawn part`);
    } finally {
      allowed[component] = before ?? [];
    }
  });
}
