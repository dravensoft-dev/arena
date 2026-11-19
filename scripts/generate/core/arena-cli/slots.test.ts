/* slotChain and channelValue: the reader-side expansion of a colour slot into its custom
 * property chain, from the answer, to the role it falls to, to the channel the part reads. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readColorSlots } from '../../../lib/core/color-slots.ts';
import { channelValue, fadeMarkers, haloValue, memberChain, memberValue, slotChain } from './slots.ts';
import type { SlotCatalogue } from './slots.ts';

const c = readColorSlots();

test('a rest chain falls to the role', () => {
  assert.equal(channelValue(c, 'actions-primary-root-fill-rest', 'tailwind'),
    'var(--actions-primary-root-fill-rest,var(--emphasis-primary-fill))');
});

test('a level wraps the rest answer', () => {
  assert.equal(channelValue(c, 'actions-ghost-root-ink-rest', 'tailwind'),
    'color-mix(in_oklab,var(--actions-ghost-root-ink-rest,var(--emphasis-ghost-ink))_var(--level-ink-body),transparent)');
});

test('the icon falls to its ink inside the ink\'s level', () => {
  assert.equal(channelValue(c, 'actions-ghost-root-icon-rest', 'tailwind'),
    'color-mix(in_oklab,var(--actions-ghost-root-icon-rest,var(--actions-ghost-root-ink-rest,var(--emphasis-ghost-ink)))_var(--level-ink-body),transparent)');
});

test('a hover the part paints as rest falls to the rest channel', () => {
  assert.equal(channelValue(c, 'actions-primary-root-fill-hover', 'tailwind'),
    'var(--actions-primary-root-fill-hover,var(--arena-emphasis-fill))');
  assert.equal(channelValue(c, 'actions-secondary-root-fill-hover', 'tailwind'),
    'var(--actions-secondary-root-fill-hover,var(--emphasis-secondary-fill-hover))');
});

test('pressed mixes the drawn fill toward the drawn ink', () => {
  assert.equal(channelValue(c, 'actions-primary-root-fill-pressed', 'tailwind'),
    'var(--actions-primary-root-fill-pressed,color-mix(in_oklab,var(--arena-emphasis-fill),var(--arena-emphasis-ink)_calc(var(--mix-pressed)*100%)))');
});

test('selected-hover mixes from selected', () => {
  assert.equal(channelValue(c, 'actions-ghost-root-fill-selected-hover', 'tailwind'),
    'var(--actions-ghost-root-fill-selected-hover,color-mix(in_oklab,var(--arena-emphasis-fill-selected),var(--arena-emphasis-ink-selected)_calc(var(--mix-hover)*100%)))');
});

test('a disabled slot falls to the rest channel', () => {
  assert.equal(channelValue(c, 'actions-primary-root-fill-disabled', 'tailwind'),
    'var(--actions-primary-root-fill-disabled,var(--arena-emphasis-fill))');
});

test('a destructive chain ends in the danger roles', () => {
  assert.equal(slotChain(c, 'actions-destructive-root-fill-pressed'),
    'var(--actions-destructive-root-fill-pressed,color-mix(in_oklab,var(--actions-destructive-root-fill-rest,var(--hue-danger-fill-strong)),var(--actions-destructive-root-ink-rest,var(--hue-danger-ink))_calc(var(--mix-pressed)*100%)))');
});

test('the css form of a level-wrapped slot', () => {
  assert.equal(channelValue(c, 'actions-ghost-root-ink-rest', 'css'),
    'color-mix(in oklab,var(--actions-ghost-root-ink-rest,var(--emphasis-ghost-ink)) var(--level-ink-body),transparent)');
});

test('a slot whose default cannot be read names itself', () => {
  const broken = structuredClone(c);
  (broken.slots['actions-primary-root-fill-rest'] as { default: string }).default = '#fff';
  assert.throws(() => slotChain(broken, 'actions-primary-root-fill-rest'), /actions-primary-root-fill-rest: default "#fff"/);
});

test('a derived slot with no ink to mix toward names the slot being built', () => {
  const broken = structuredClone(c);
  delete broken.slots['actions-solid-root-ink-rest'];
  assert.throws(() => channelValue(broken, 'actions-solid-root-fill-pressed', 'tailwind'),
    /actions-solid-root-fill-pressed: .*actions-solid-root-fill-rest/);
});

test('a selected disabled slot falls to the selected channel and writes its own fade marker', () => {
  assert.equal(channelValue(c, 'actions-ghost-root-ink-selected-disabled', 'tailwind'),
    'var(--actions-ghost-root-ink-selected-disabled,var(--arena-emphasis-ink-selected))');
  assert.equal(memberChain(c, 'ArenaIconButton.root', 'actions-ghost-root-edge-selected-disabled'),
    'var(--actions-ghost-root-edge-selected-disabled,var(--arena-emphasis-icon-edge-selected))');
  assert.deepEqual(fadeMarkers(['actions-ghost-root-ink-disabled', 'actions-ghost-root-ink-selected-disabled', 'actions-ghost-root-fill-selected-disabled'], c),
    [['--actions-ghost-root-fade-disabled', '1'], ['--actions-ghost-root-fade-selected-disabled', '1']]);
});

test('a disabled icon falls to the ink of its own state, and an optional slot with a default follows it', () => {
  assert.equal(channelValue(c, 'actions-primary-root-icon-disabled', 'tailwind'),
    'var(--actions-primary-root-icon-disabled,var(--arena-emphasis-ink-disabled))');
  assert.equal(channelValue(c, 'actions-solid-root-icon-selected-disabled', 'tailwind'),
    'var(--actions-solid-root-icon-selected-disabled,var(--arena-emphasis-ink-selected-disabled))');
  assert.equal(slotChain(c, 'actions-destructive-root-icon-disabled'),
    'var(--actions-destructive-root-icon-disabled,var(--actions-destructive-root-ink-disabled,var(--actions-destructive-root-ink-rest,var(--hue-danger-ink))))');
  assert.equal(slotChain(c, 'actions-primary-root-fill-disabled'),
    'var(--actions-primary-root-fill-disabled,var(--arena-emphasis-fill))');
});

test('a member default reaches the derived states', () => {
  assert.equal(memberChain(c, 'ArenaIconButton.root', 'actions-ghost-root-edge-hover'),
    'var(--actions-ghost-root-edge-hover,var(--actions-ghost-root-edge-rest,var(--emphasis-ghost-icon-edge)))');
  assert.equal(memberChain(c, 'ArenaIconButton.root', 'actions-ghost-root-edge-rest'), 'var(--actions-ghost-root-edge-rest,var(--emphasis-ghost-icon-edge))');
  assert.equal(slotChain(c, 'actions-ghost-root-edge-rest'), 'var(--actions-ghost-root-edge-rest,transparent)', 'the group keeps its own default');
  assert.equal(memberChain(c, 'ArenaIconButton.root', 'actions-ghost-root-edge-selected-hover'),
    'var(--actions-ghost-root-edge-selected-hover,color-mix(in_oklab,var(--arena-emphasis-icon-edge-selected),var(--arena-emphasis-ink-selected)_calc(var(--mix-hover)*100%)))', 'a state the default does not reach reads the member channel');
});

test('a member channel replaces the group channel only for the property it names, and a level still wraps the member chain', () => {
  assert.equal(memberChain(c, 'ArenaIconButton.root', 'actions-ghost-root-fill-hover'), slotChain(c, 'actions-ghost-root-fill-hover'));
  assert.equal(memberValue(c, 'ArenaIconButton.root', 'actions-ghost-root-ink-rest', 'tailwind'), channelValue(c, 'actions-ghost-root-ink-rest', 'tailwind'));
  assert.equal(memberChain(c, 'ArenaIconButton.root', 'actions-solid-root-edge-hover'), 'var(--actions-solid-root-edge-hover,var(--arena-emphasis-icon-edge))');
  assert.throws(() => memberChain(c, 'ArenaCopyButton.root', 'actions-ghost-root-edge-rest'), /ArenaCopyButton\.root is no member part/);
});

test('a group part with no option axis writes a fade marker with no option segment', () => {
  const fixture = structuredClone(c);
  fixture.slots['actions-dismiss-ink-disabled'] = { group: 'actions', part: 'dismiss', property: 'ink', state: 'disabled', accepts: 'ink', optional: true };
  assert.deepEqual(fadeMarkers(['actions-dismiss-ink-disabled'], fixture), [['--actions-dismiss-fade-disabled', '1']]);
});

test('haloValue is the edge-rest chain at the halo level', () => {
  const g: SlotCatalogue = {
    ...c, halos: { 'actions-primary-root': 'level-hue-soft-danger' },
  };
  const edge = 'actions-primary-root-edge-rest';
  assert.equal(haloValue(g, 'ArenaButton.root', 'primary'),
    `color-mix(in_oklab,${memberChain(g, 'ArenaButton.root', edge)}_var(--level-hue-soft-danger),transparent)`);
  assert.throws(() => haloValue(g, 'ArenaButton.root', 'ghost'), /ghost/);
});

test('the halo follows the edge it belongs to', () => {
  const edge = (option: string, role: string) => `var(--fields-${option}-field-edge-rest,var(--${role}))`;
  assert.equal(haloValue(c, 'ArenaInput.field', 'error'), `color-mix(in_oklab,${edge('error', 'edge-invalid')}_var(--level-hue-soft-danger),transparent)`);
  assert.equal(haloValue(c, 'ArenaSelect.field', 'valid'), `color-mix(in_oklab,${edge('valid', 'hue-success-edge')}_var(--level-hue-soft-success),transparent)`);
  assert.throws(() => haloValue(c, 'ArenaInput.field', 'neutral'), /neutral/);
  const moved = structuredClone(c);
  moved.slots['fields-error-field-edge-rest']!.default = '{hue-warning-edge}';
  assert.match(haloValue(moved, 'ArenaTextarea.field', 'error'), /var\(--fields-error-field-edge-rest,var\(--hue-warning-edge\)\)_var\(--level-hue-soft-danger\)/,
    'moving the edge moves the halo with it');
});

test('a member declaring hoverIn, edgeAs and disabledModifier carries them into the catalogue', async () => {
  const { deriveSlots } = await import('../../../lib/core/color-slots.ts');
  const { slotFixture } = await import('../../../lib/core/color-slots-fixture.ts');
  const keys = { hoverIn: { axis: 'linked', value: 'true' }, edgeAs: 'rule' as const, disabledModifier: 'aria-disabled:' };
  const built = deriveSlots(slotFixture(
    { box: { properties: ['edge'], states: ['rest', 'hover', 'disabled'], rest: { edge: '{edge-control}' } } },
    { ArenaCrumb: { group: 'choices', parts: { box: { to: 'choices.box', options: [], states: ['rest', 'hover', 'disabled'], ...keys } } } },
    'choices',
  ));
  const m = built.members['ArenaCrumb.box'];
  assert.deepEqual({ hoverIn: m?.hoverIn, edgeAs: m?.edgeAs, disabledModifier: m?.disabledModifier }, keys);
});
