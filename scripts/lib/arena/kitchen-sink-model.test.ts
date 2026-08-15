/* Drives the model with fixtures written here, because the real arrangements agree today by
 * construction and a suite that only read them would assert nothing about what happens when one
 * stops agreeing. Staging is the part worth pinning hardest: it is derived from a class string,
 * and a regex loose enough to match `border-fixed` would wrap every component in a box. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED, classStrings, drawsFixed, stagedComponents, substitute, instanceNode, componentsIn,
  rebase, rebaseNode, sinkModel, scopeClass, ROOT_SINK,
} from './kitchen-sink-model.ts';

const DEPTH = { from: '../../../../../', to: '../../../../' };

test('a scope class names the appearance, and the root one is the absence of a class', () => {
  assert.equal(scopeClass('editorial'), 'arena-editorial');
  assert.equal(scopeClass(ROOT_SINK), '');
});

test('the fixed utility is matched as a utility, so a class merely containing the word is not one', () => {
  assert.equal(FIXED.test('fixed inset-0 z-modal'), true);
  assert.equal(FIXED.test('sm:fixed inset-0'), true);
  assert.equal(FIXED.test('inline-flex rounded-pill'), false);
  assert.equal(FIXED.test('border-fixed'), false, 'a hyphenated neighbour is not the utility');
  assert.equal(FIXED.test('fixed-top'), false, 'nor is a hyphenated suffix');
});

test('class strings are read out of slots, variants and compounds alike', () => {
  const manifest = {
    slots: { root: 'inline-flex' },
    variants: { open: { true: { scrim: 'fixed inset-0' }, false: { scrim: 'hidden' } } },
    compoundVariants: [{ class: { root: 'shadow-surface-deep' } }],
  };
  assert.deepEqual(classStrings(manifest as never).sort(),
    ['fixed inset-0', 'hidden', 'inline-flex', 'shadow-surface-deep']);
  assert.equal(drawsFixed(manifest as never), true,
    'a surface that only goes fixed in one variant still escapes the page flow when it does');
});

test('a component is staged only where the manifest that draws it declares fixed', () => {
  const read = (path: string) => (path.includes('arena-dialog')
    ? { slots: { scrim: 'fixed inset-0' } }
    : { slots: { root: 'inline-flex' } });
  const staged = stagedComponents(['ArenaDialog', 'ArenaBadge'], undefined, read as never);
  assert.deepEqual([...staged], ['ArenaDialog']);
});

test('the subject replaces its marker wherever the host tree puts it', () => {
  const host = { component: 'ArenaTable', slots: { content: ['$subject' as const] } };
  const subject = { component: 'ArenaTableRow' };
  assert.deepEqual(substitute(host, subject),
    { component: 'ArenaTable', slots: { content: [subject] } });
});

test('a fixture with no host becomes the component itself, seed and slots carried across', () => {
  const node = instanceNode({
    component: 'ArenaCard',
    seed: { title: 'checkout-api' },
    slots: { content: [{ text: 'Last published 2 h ago.' }] },
  });
  assert.deepEqual(node, {
    component: 'ArenaCard',
    members: { title: 'checkout-api' },
    slots: { content: [{ text: 'Last published 2 h ago.' }] },
  });
});

test('a fixture with a host is placed inside it rather than drawn bare', () => {
  const node = instanceNode({
    component: 'ArenaTableRow',
    host: { component: 'ArenaTable', members: { label: 'Deployments' }, slots: { content: ['$subject'] } },
  });
  assert.equal(node.component, 'ArenaTable');
  assert.deepEqual(node.slots?.content, [{ component: 'ArenaTableRow' }]);
});

test('every component the tree reaches is collected, at any depth', () => {
  const node = {
    component: 'ArenaCard',
    slots: { action: [{ component: 'ArenaBadge', slots: { content: [{ text: 'Live' }] } }] },
  };
  assert.deepEqual([...componentsIn(node)].sort(), ['ArenaBadge', 'ArenaCard']);
});

test('a path written for the playground depth is rebased, and any other depth fails loudly', () => {
  assert.equal(rebase('../../../../../assets/rotor.svg', DEPTH.from, DEPTH.to),
    '../../../../assets/rotor.svg');
  assert.equal(rebase('#anchor', DEPTH.from, DEPTH.to), '#anchor', 'only a climb is rebased');
  assert.throws(() => rebase('../assets/rotor.svg', DEPTH.from, DEPTH.to), /resolves to nothing/,
    'a silent miss would leave an image 404ing, which is a differing pixel with no component behind it');
});

test('rebasing reaches an attribute nested in a slot, which is where the one real case lives', () => {
  const node = {
    component: 'ArenaAppLogo',
    slots: { mark: [{ element: 'img', attrs: { src: '../../../../../assets/rotor.svg', alt: '' } }] },
  };
  const out = rebaseNode(node, DEPTH.from, DEPTH.to) as typeof node;
  assert.equal(out.slots.mark[0]?.attrs.src, '../../../../assets/rotor.svg');
  assert.equal(node.slots.mark[0]?.attrs.src, '../../../../../assets/rotor.svg', 'the source is not mutated');
});

test('an arrangement naming a component with no demo fixture fails rather than emitting nothing for it', () => {
  assert.throws(
    () => sinkModel({ sink: 'none', sections: [{ title: 'Forms', items: ['ArenaGhost'] }] },
      new Map(), new Set(), DEPTH),
    /nothing says how to seed it/,
  );
});

test('the model carries the staging flag and the components every section reaches', () => {
  const demos = new Map([
    ['ArenaDialog', { component: 'ArenaDialog', seed: { open: true } }],
    ['ArenaBadge', { component: 'ArenaBadge', slots: { content: [{ text: 'Live' }] } }],
  ]);
  const model = sinkModel(
    { sink: 'editorial', note: 'a note', sections: [{ title: 'Both', items: ['ArenaDialog', 'ArenaBadge'] }] },
    demos, new Set(['ArenaDialog']), DEPTH,
  );
  assert.equal(model.sink, 'editorial');
  assert.equal(model.note, 'a note');
  assert.deepEqual(model.uses, ['ArenaBadge', 'ArenaDialog']);
  assert.deepEqual(model.sections[0]?.items.map((one) => [one.component, one.staged]),
    [['ArenaDialog', true], ['ArenaBadge', false]]);
});
