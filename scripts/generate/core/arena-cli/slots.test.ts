/* slotChain and channelValue: the reader-side expansion of a colour slot into its custom
 * property chain, from the answer, to the role it falls to, to the channel the part reads. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readColorSlots } from '../../../lib/core/color-slots.ts';
import { channelValue, componentValue, fadeMarkers, slotChain } from './slots.ts';

const c = readColorSlots();

test('a rest chain falls to the role', () => {
  assert.equal(channelValue(c, 'emphasis-primary-root-fill-rest', 'tailwind'),
    'var(--emphasis-primary-root-fill-rest,var(--emphasis-primary-fill))');
});

test('a level wraps the rest answer', () => {
  assert.equal(channelValue(c, 'emphasis-ghost-root-ink-rest', 'tailwind'),
    'color-mix(in_oklab,var(--emphasis-ghost-root-ink-rest,var(--emphasis-ghost-ink))_var(--level-ink-body),transparent)');
});

test('the icon falls to its ink inside the ink\'s level', () => {
  assert.equal(channelValue(c, 'emphasis-ghost-root-icon-rest', 'tailwind'),
    'color-mix(in_oklab,var(--emphasis-ghost-root-icon-rest,var(--emphasis-ghost-root-ink-rest,var(--emphasis-ghost-ink)))_var(--level-ink-body),transparent)');
});

test('a hover the part paints as rest falls to the rest channel', () => {
  assert.equal(channelValue(c, 'emphasis-primary-root-fill-hover', 'tailwind'),
    'var(--emphasis-primary-root-fill-hover,var(--arena-emphasis-fill))');
  assert.equal(channelValue(c, 'emphasis-secondary-root-fill-hover', 'tailwind'),
    'var(--emphasis-secondary-root-fill-hover,var(--emphasis-secondary-fill-hover))');
});

test('pressed mixes the drawn fill toward the drawn ink', () => {
  assert.equal(channelValue(c, 'emphasis-primary-root-fill-pressed', 'tailwind'),
    'var(--emphasis-primary-root-fill-pressed,color-mix(in_oklab,var(--arena-emphasis-fill),var(--arena-emphasis-ink)_calc(var(--mix-pressed)*100%)))');
});

test('selected-hover mixes from selected', () => {
  assert.equal(channelValue(c, 'emphasis-ghost-root-fill-selected-hover', 'tailwind'),
    'var(--emphasis-ghost-root-fill-selected-hover,color-mix(in_oklab,var(--arena-emphasis-fill-selected),var(--arena-emphasis-ink-selected)_calc(var(--mix-hover)*100%)))');
});

test('a disabled slot falls to the rest channel', () => {
  assert.equal(channelValue(c, 'emphasis-primary-root-fill-disabled', 'tailwind'),
    'var(--emphasis-primary-root-fill-disabled,var(--arena-emphasis-fill))');
});

test('a destructive chain reaches the hue channels', () => {
  assert.equal(slotChain(c, 'button-destructive-root-fill-pressed'),
    'var(--button-destructive-root-fill-pressed,color-mix(in_oklab,var(--button-destructive-root-fill-rest,var(--arena-hue-fill-strong)),var(--button-destructive-root-ink-rest,var(--arena-hue-ink))_calc(var(--mix-pressed)*100%)))');
});

test('the css form of a hue soft fill', () => {
  assert.equal(channelValue(c, 'hue-warning-soft-fill-rest', 'css'),
    'color-mix(in oklab,var(--hue-warning-soft-fill-rest,var(--hue-warning-fill-soft)) var(--level-hue-soft-warning),transparent)');
});

test('a slot whose default cannot be read names itself', () => {
  const broken = structuredClone(c);
  (broken.slots['emphasis-primary-root-fill-rest'] as { default: string }).default = '#fff';
  assert.throws(() => slotChain(broken, 'emphasis-primary-root-fill-rest'), /emphasis-primary-root-fill-rest: default "#fff"/);
});

test('a component slot wraps its family slot inside the level', () => {
  const family = 'color-mix(in_oklab,var(--emphasis-ghost-root-ink-rest,var(--emphasis-ghost-ink))_var(--level-ink-body),transparent)';
  assert.equal(componentValue(family, c.slots['button-ghost-root-ink-rest']!, 'button-ghost-root-ink-rest'),
    'color-mix(in_oklab,var(--button-ghost-root-ink-rest,var(--emphasis-ghost-root-ink-rest,var(--emphasis-ghost-ink)))_var(--level-ink-body),transparent)');
});

test('a component-only edge wraps the whole value', () => {
  assert.equal(componentValue('var(--emphasis-ghost-icon-edge)', c.slots['icon-button-ghost-root-edge-rest']!, 'icon-button-ghost-root-edge-rest'),
    'var(--icon-button-ghost-root-edge-rest,var(--emphasis-ghost-icon-edge))');
});

test('every balanced read of the family slot is wrapped, and a copy button wraps the icon button slot it follows', () => {
  const family = 'var(--emphasis-primary-root-fill-pressed,color-mix(in_oklab,var(--arena-emphasis-fill),var(--arena-emphasis-ink)_calc(var(--mix-pressed)*100%)))';
  assert.equal(componentValue(family, c.slots['button-primary-root-fill-pressed']!, 'button-primary-root-fill-pressed'),
    `var(--button-primary-root-fill-pressed,${family})`);
  assert.equal(componentValue('var(--icon-button-ghost-root-fill-rest,var(--emphasis-ghost-root-fill-rest,transparent))', c.slots['copy-button-ghost-root-fill-rest']!, 'copy-button-ghost-root-fill-rest'),
    'var(--copy-button-ghost-root-fill-rest,var(--icon-button-ghost-root-fill-rest,var(--emphasis-ghost-root-fill-rest,transparent)))');
});

test('a derived slot with no ink to mix toward names the slot being built', () => {
  const broken = structuredClone(c);
  delete broken.slots['emphasis-solid-root-ink-rest'];
  assert.throws(() => channelValue(broken, 'emphasis-solid-root-fill-pressed', 'tailwind'),
    /emphasis-solid-root-fill-pressed: .*emphasis-solid-root-fill-rest/);
});

test('a selected disabled slot falls to the selected channel and writes its own fade marker', () => {
  assert.equal(channelValue(c, 'emphasis-ghost-root-ink-selected-disabled', 'tailwind'),
    'var(--emphasis-ghost-root-ink-selected-disabled,var(--arena-emphasis-ink-selected))');
  assert.equal(slotChain(c, 'icon-button-ghost-root-edge-selected-disabled'),
    'var(--icon-button-ghost-root-edge-selected-disabled,var(--arena-emphasis-icon-edge-selected))');
  assert.deepEqual(fadeMarkers(['icon-button-ghost-root-ink-disabled', 'icon-button-ghost-root-ink-selected-disabled', 'icon-button-ghost-root-fill-selected-disabled'], c),
    [['--icon-button-ghost-root-fade-disabled', '1'], ['--icon-button-ghost-root-fade-selected-disabled', '1']]);
});
