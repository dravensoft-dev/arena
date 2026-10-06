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

test('ArenaRadio throws when value is absent -- the fail-hard guard', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaRadioGroup ariaLabel={LABEL}><ArenaRadio label="A" /></ArenaRadioGroup>),
    /ArenaRadio: `value` is required/,
  );
});

test('ArenaRadioGroup drops a consumer style object -- the ...style escape is gone', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaRadioGroup ariaLabel={LABEL} style={{ color: '#ff00ff' }}><ArenaRadio value="a" label="A" /></ArenaRadioGroup>,
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaRadioGroup drops a consumer attribute -- the {...rest} escape is gone', () => {
  const html = renderToStaticMarkup(
    <ArenaRadioGroup ariaLabel={LABEL} data-stray="x"><ArenaRadio value="a" label="A" /></ArenaRadioGroup>,
  );
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});

test('ArenaRadioGroup throws when ariaLabel is absent -- each option names itself, the SET names nothing', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaRadioGroup><ArenaRadio value="a" label="A" /></ArenaRadioGroup>),
    /ArenaRadioGroup: `ariaLabel` is required/,
  );
});

test('ariaLabel names the group, and `name` is not a label', () => {
  const html = renderToStaticMarkup(
    <ArenaRadioGroup ariaLabel={LABEL} name="env"><ArenaRadio value="a" label="A" /></ArenaRadioGroup>,
  );
  assert.match(html, new RegExp(`<div role="radiogroup" aria-label="${LABEL}"`));
  assert.doesNotMatch(html, /aria-label="env"/, 'the form name must never reach a screen reader as the name');
});

test('the group draws its own column from ArenaRadio\'s manifest, which is the surface it belongs to', () => {
  const html = renderToStaticMarkup(
    <ArenaRadioGroup ariaLabel={LABEL}><ArenaRadio value="a" label="A" /></ArenaRadioGroup>,
  );
  assert.match(html, /<div role="radiogroup"[^>]*class="arena-radio__group"/,
    'ArenaRadioGroup carries no manifest of its own because it has no surface of its own');
});

test('the ring finds its own focus, so nothing injects a stylesheet to reach the input', () => {
  const html = renderToStaticMarkup(
    <ArenaRadioGroup ariaLabel={LABEL}><ArenaRadio value="a" label="A" /></ArenaRadioGroup>,
  );
  assert.match(html, /arena-radio__ring/);
  assert.doesNotMatch(html, /\barena-radio-ring\b/, 'the hook class the injected sheet needed is gone with it');
});
