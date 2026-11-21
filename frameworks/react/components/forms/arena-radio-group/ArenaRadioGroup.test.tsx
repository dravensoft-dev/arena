import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaRadioGroup } from './ArenaRadioGroup.tsx';
import { ArenaRadio } from '../arena-radio/ArenaRadio.tsx';

const LABEL = 'Deployment target';

test('ArenaRadioGroup marks the child whose value matches, and only it', () => {
  const html = renderToStaticMarkup(
    <ArenaRadioGroup ariaLabel={LABEL} value="b"><ArenaRadio value="a" label="A" /><ArenaRadio value="b" label="B" /></ArenaRadioGroup>,
  );

  assert.equal(html.match(/arena-radio__dot/g)?.length, 1,
    'the filled dot is drawn once, on the child whose value matches');
  assert.equal(html.match(/data-arena-part="radio.ring"[^>]*\bdata-arena-checked=""/g)?.length, 1, 'and one ring takes the accent border');
});

test('ArenaRadioGroup gives its children a shared name so the native radios group', () => {
  const html = renderToStaticMarkup(
    <ArenaRadioGroup ariaLabel={LABEL} name="env"><ArenaRadio value="a" label="A" /><ArenaRadio value="b" label="B" /></ArenaRadioGroup>,
  );
  assert.equal(html.match(/name="env"/g)?.length, 2);
});

test('ArenaRadio renders its label and hint', () => {
  const html = renderToStaticMarkup(<ArenaRadioGroup ariaLabel={LABEL}><ArenaRadio value="a" label="Prod" hint="Real users" /></ArenaRadioGroup>);
  assert.match(html, /Prod/);
  assert.match(html, /Real users/);
});

test('ariaLabel names the group, and `name` is not a label', () => {
  const html = renderToStaticMarkup(
    <ArenaRadioGroup ariaLabel={LABEL} name="env"><ArenaRadio value="a" label="A" /></ArenaRadioGroup>,
  );
  assert.match(html, new RegExp(`<div role="radiogroup" aria-label="${LABEL}"`));
  assert.doesNotMatch(html, /aria-label="env"/, 'the form name must never reach a screen reader as the name');
});

test('the group is a radiogroup on the radio group slot', () => {
  const html = renderToStaticMarkup(
    <ArenaRadioGroup ariaLabel={LABEL}><ArenaRadio value="a" label="A" /></ArenaRadioGroup>,
  );
  assert.match(html, /<div role="radiogroup"[^>]*class="arena-radio__group"/, 'the radiogroup did not draw the radio group slot class');
});

test('the radio draws its ring slot and no hook class', () => {
  const html = renderToStaticMarkup(
    <ArenaRadioGroup ariaLabel={LABEL}><ArenaRadio value="a" label="A" /></ArenaRadioGroup>,
  );
  assert.match(html, /arena-radio__ring/);
  assert.doesNotMatch(html, /\barena-radio-ring\b/, 'the hook class the injected sheet needed is gone with it');
});
