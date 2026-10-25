/* The markup of a meter: one element with the meter role and every value attribute, a head
 * that draws the name, the reading and the standing word, and a fill as wide as the clamped share.
 * Nothing here is live and nothing takes focus, because a meter is read and never operated. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaMeter } from './ArenaMeter.tsx';
import { ArenaLocaleProvider, ARENA_DEFAULT_LOCALE } from '../../../ArenaLocale.ts';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const meterOf = (html: string) => /<div role="meter"[^>]*>/.exec(html)?.[0] ?? '';

test('the track is the meter, carrying the name, the three values and no live region or tab stop', () => {
  const html = render(<ArenaMeter label="Storage used" value={72} valueText="72 of 100 GB" />);
  const meter = meterOf(html);
  assert.match(meter, /aria-label="Storage used"/);
  assert.match(meter, /aria-valuenow="72"/);
  assert.match(meter, /aria-valuemin="0"/);
  assert.match(meter, /aria-valuemax="100"/);
  assert.match(meter, /aria-valuetext="72 of 100 GB"/);
  assert.doesNotMatch(html, /aria-live|tabindex/, 'a meter announces nothing on render and takes no focus');
  assert.match(html, /data-arena-part="meter\.label"[^>]*>Storage used</);
  assert.match(html, /data-arena-part="meter\.value"[^>]*>72 of 100 GB</);
  assert.doesNotMatch(html, /meter\.standing/, 'with no threshold given there is no standing to draw');
});

test('the drawing and aria-valuenow clamp, while the readout shows the number as passed', () => {
  const html = render(<ArenaMeter label="Load" value={143} />);
  assert.match(meterOf(html), /aria-valuenow="100"/);
  assert.match(html, /style="width:100%"/);
  assert.match(html, /data-arena-part="meter\.value"[^>]*>143</);
  const loose = render(<ArenaMeter label="Load" value={Number.NaN} min={10} max={20} />);
  assert.match(meterOf(loose), /aria-valuenow="10"/, 'a value that is not a number reads as min');
  assert.match(loose, /data-arena-part="meter\.value"[^>]*>10</);
  const inverted = render(<ArenaMeter label="Load" value={5} min={50} max={10} />);
  assert.match(meterOf(inverted), /aria-valuemax="50"/, 'max below min reads as min, so the range never inverts');
});

test('thresholds draw the standing word beside the reading and say it after the reading', () => {
  const cases = [[30, 'optimum', 'Good'], [72, 'fair', 'Fair'], [91, 'poor', 'Poor']] as const;
  for (const [value, standing, word] of cases) {
    const html = render(<ArenaMeter label="Storage used" value={value} low={50} high={80} optimum={0} />);
    assert.match(html, new RegExp(`data-arena-standing="${standing}"`));
    assert.match(html, new RegExp(`data-arena-part="meter\\.standing"[^>]*>${word}<`));
    assert.match(meterOf(html), new RegExp(`aria-valuetext="${value}, ${word}"`), 'the standing is said as well as drawn, so colour is never its only carrier');
  }
});

test('the standing words come from the locale', () => {
  const spanish = { ...ARENA_DEFAULT_LOCALE, meterFair: 'Regular' };
  const html = render(<ArenaLocaleProvider value={spanish}><ArenaMeter label="Uso" value={72} low={50} high={80} optimum={0} /></ArenaLocaleProvider>);
  assert.match(html, /data-arena-part="meter\.standing"[^>]*>Regular</);
});

test('showLabel false hides the drawn name and keeps the accessible one', () => {
  const html = render(<ArenaMeter label="Storage used" value={40} showLabel={false} />);
  assert.doesNotMatch(html, /meter\.label/);
  assert.match(meterOf(html), /aria-label="Storage used"/);
});

test('a blank label throws, while a value that is not a number and an inverted range never do', () => {
  assert.throws(() => render(<ArenaMeter label="  " value={1} />), /ArenaMeter: `label` is required/);
  assert.doesNotThrow(() => render(<ArenaMeter label="Load" value={Number.POSITIVE_INFINITY} min={9} max={1} low={Number.NaN} />));
});
