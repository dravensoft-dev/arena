import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { kebab } from '../../utils/case.ts';
import {
  arenaClassesFor, classBase, classesFor, classesManifest, slotClass, slotPart,
} from '../../lib/tailwind/component-css.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';

const tag = readJson(join(repoRoot, 'frameworks/tailwind/components/display/arena-tag/ArenaTag.manifest.json'));

test('the default variants apply when nothing is chosen', () => {
  const { root = '', dot = '' } = classesFor(tag);
  assert.ok(root.includes('rounded-pill'), 'the base slot is present');
  assert.ok(root.includes('border-edge-surface'), 'tone=neutral is the default');
  assert.equal(dot, 'size-1.5 rounded-pill bg-current');
});

test('a chosen variant replaces the default', () => {
  const { root = '' } = classesFor(tag, { tone: 'danger' });
  assert.ok(root.includes('border-error'), 'the chosen tone applies');
  assert.ok(!root.includes('border-base-300'), 'the default tone does not');
});

test('the base slot always precedes the variant slot', () => {
  const { root = '' } = classesFor(tag, { tone: 'primary' });
  assert.ok(root.indexOf('inline-flex') < root.indexOf('border-primary'));
});

test('an unknown variant value is a loud failure, not a silent base-only render', () => {
  assert.throws(() => classesFor(tag, { tone: 'chartreuse' }), /tone="chartreuse"/);
});

test('a slot with no variant contribution is still returned', () => {
  assert.ok('dot' in classesFor(tag, { tone: 'danger' }));
});

test('a compoundVariant applies only when every variant it names matches', () => {
  const withCompound = { ...tag, compoundVariants: [{ tone: 'danger', class: { root: 'ring-2' } }] };
  assert.ok((classesFor(withCompound, { tone: 'danger' }).root ?? '').includes('ring-2'), 'applies when the condition matches');
  assert.ok(!(classesFor(withCompound, { tone: 'primary' }).root ?? '').includes('ring-2'), 'does not apply when it does not');
});

test('a compoundVariant matches the defaulted variant value, not only a chosen one', () => {

  const withCompound = { ...tag, compoundVariants: [{ tone: 'neutral', class: { root: 'ring-2' } }] };
  assert.ok((classesFor(withCompound).root ?? '').includes('ring-2'), 'the default value satisfies the condition');
});

test('a compoundVariant is appended after the single-variant slots', () => {
  const withCompound = { ...tag, compoundVariants: [{ tone: 'danger', class: { root: 'ring-2' } }] };
  const { root = '' } = classesFor(withCompound, { tone: 'danger' });
  assert.ok(root.indexOf('border-error') < root.indexOf('ring-2'), 'the compound class follows the variant class');
});

test('the harness spells a class the way the generator does, for every manifest that ships', () => {
  const manifests = [...layerManifests(repoRoot).values()];
  assert.ok(manifests.length > 0, 'no manifest was read, so this asserts nothing');
  for (const manifest of manifests) {
    const base = classBase(manifest.component);
    assert.equal(base, kebab(manifest.component), `${manifest.component}: the harness and layers.ts disagree on kebab`);
    assert.ok(base.startsWith('arena-'), `${manifest.component}: a class base no longer carries the arena prefix the DOM depends on`);
    for (const [slot, classes] of Object.entries(arenaClassesFor(manifest))) {
      for (const one of classes.split(/\s+/).filter(Boolean)) {
        assert.ok(one.startsWith(`${base}__`),
          `${manifest.component}: the specimen would render "${one}" on slot "${slot}", which no sheet `
          + `defines, because the generator writes "${slotClass(manifest.component, slot)}"`);
      }
    }
  }
});

test('the root slot is the bare component and every other is qualified', () => {
  assert.equal(slotPart('ArenaCard', 'root'), 'card');
  assert.equal(slotPart('ArenaCard', 'body'), 'card.body');
  assert.equal(slotPart('ArenaSideNavItem', 'triggerLabel'), 'side-nav-item.trigger-label');
});

test('classesManifest carries a part for every slot', () => {
  const out = classesManifest({ component: 'ArenaCard', slots: { root: 'a', body: 'b' } });
  assert.deepEqual(out.parts, { root: 'card', body: 'card.body' });
});

test('every manifest that ships names a part for every slot it names', () => {
  const manifests = [...layerManifests(repoRoot).values()];
  assert.ok(manifests.length > 0, 'no manifest was read, so this asserts nothing');
  for (const manifest of manifests) {
    const built = classesManifest(manifest);
    assert.deepEqual(Object.keys(built.parts ?? {}), Object.keys(built.slots),
      `${manifest.component}: a slot with no part is a slot a style plugin cannot reach`);
  }
});
