/* slotChain and channelValue: the reader-side expansion of a colour slot into its custom
 * property chain, from the answer, to the role it falls to, to the channel the part reads. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readColorSlots } from '../../../lib/core/color-slots.ts';
import { channelValue, slotChain } from './slots.ts';

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
