import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSegmentedControl } from './ArenaSegmentedControl.tsx';

test('an option draws its label as its text and its value onto the hidden radio, and the two differ', () => {
  const html = renderToStaticMarkup(
    <ArenaSegmentedControl ariaLabel="Time range" name="tr"
      options={[{ value: 'ov', label: 'Overview' }, { value: 'dp', label: 'Deployments' }]} />,
  );
  assert.match(html, /<label[^>]*>Overview<input[^>]*\/><\/label>/);
  assert.match(html, /<input[^>]*value="ov"[^>]*\/>/);
  assert.match(html, /<input[^>]*value="dp"[^>]*\/>/);
  assert.doesNotMatch(html, />ov</, 'an option drew its value as its text, not its label');
});

test('value selects the option whose `value` matches, and only it is checked and raised', () => {
  const html = renderToStaticMarkup(
    <ArenaSegmentedControl ariaLabel="Time range" name="tr" value="dp" onValueChange={() => {}}
      options={[{ value: 'ov', label: 'Overview' }, { value: 'dp', label: 'Deployments' }]} />,
  );

  assert.match(html, /<label[^>]*\bdata-arena-selected=""[^>]*>Deployments</);

  assert.equal((html.match(/data-arena-part="segmented-control.segment"[^>]*\bdata-arena-selected=""/g) || []).length, 1,
    'more than one segment wore the raised thumb');
  assert.equal((html.match(/checked=""/g) || []).length, 1,
    'more than one radio was checked');
});

test('an empty options array renders rather than throwing', () => {
  const html = renderToStaticMarkup(<ArenaSegmentedControl ariaLabel="Time range" options={[]} />);
  assert.match(html, /role="radiogroup"/);
});

test('the track draws its slot class and an unselected segment draws no thumb', () => {
  const html = renderToStaticMarkup(
    <ArenaSegmentedControl ariaLabel="Time range" name="tr" value="ov"
      options={[{ value: 'ov', label: 'Overview' }, { value: 'dp', label: 'Deployments' }]} />,
  );
  assert.match(html, /arena-segmented-control__track/);
  assert.match(html, /data-arena-part="segmented-control.segment"(?:(?!data-arena-selected=)[^>])*>/, 'an unselected segment drew a selected marker');
  assert.doesNotMatch(html, /<label[^>]*\bdata-arena-selected=""[^>]*>Deployments</,
    'the unselected segment draws no thumb');
});
