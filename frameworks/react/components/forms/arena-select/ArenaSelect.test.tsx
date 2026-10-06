import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSelect } from './ArenaSelect.tsx';

test('an option draws its label as the text and its value as the attribute, and the two differ', () => {
  const html = renderToStaticMarkup(
    <ArenaSelect label="Environment" options={[{ value: 'prod', label: 'Production' }]} />,
  );
  assert.match(html, /<option value="prod">Production<\/option>/);

  assert.doesNotMatch(html, />prod</, 'the option drew its value as its text, not its label');
});

test('required and name each reach the native select', () => {
  const html = renderToStaticMarkup(
    <ArenaSelect label="Environment" name="env" required options={[{ value: 'qa', label: 'QA' }]} />,
  );
  assert.match(html, /required=""/);
  assert.match(html, /name="env"/);
});

test('value marks the matching option selected and disabled reaches the native select', () => {
  const html = renderToStaticMarkup(
    <ArenaSelect label="Environment" value="qa" disabled onChange={() => {}}
      options={[{ value: 'prod', label: 'Production' }, { value: 'qa', label: 'QA' }]} />,
  );
  assert.match(html, /<option value="qa" selected="">QA<\/option>/);
  assert.match(html, /disabled=""/);
});

test('label renders its text above the control', () => {
  const html = renderToStaticMarkup(<ArenaSelect label="Environment" options={[]} />);
  assert.match(html, /<label[^>]*>Environment<\/label>/);
});

test('ArenaSelect drops a consumer style object -- the ...style escape is gone', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaSelect label="A" style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaSelect drops a consumer attribute -- the {...rest} escape is gone', () => {
  const html = renderToStaticMarkup(<ArenaSelect label="A" data-stray="x" />);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered select -- the {...rest} escape is back');
});

test('error takes the crimson state and names itself to the control, so the failure is announced', () => {
  const html = renderToStaticMarkup(<ArenaSelect label="Customer" error="Pick a customer" />);
  assert.match(html, /aria-invalid="true"/, 'an errored select did not announce itself as invalid');
  assert.match(html, /Pick a customer/);
  assert.match(html, /data-arena-part="select.field"[^>]*\bdata-arena-state="error"/, 'the error state did not reach the border');
  const described = /aria-describedby="([^"]+)"/.exec(html);
  assert.ok(described, 'the message is drawn but nothing points at it, so a screen reader never reaches it');
  assert.ok(html.includes(`id="${described![1]}"`), 'aria-describedby names an id the render does not contain');
});

test('error wins over hint, which is the same state order ArenaInput declares', () => {
  const html = renderToStaticMarkup(<ArenaSelect label="Customer" hint="Start typing" error="Pick a customer" />);
  assert.match(html, /Pick a customer/);
  assert.doesNotMatch(html, /Start typing/,
    'both notes rendered: an errored field that still shows its hint buries the failure under advice');
});

test('a hint alone is neutral, and is still named to the control', () => {
  const html = renderToStaticMarkup(<ArenaSelect label="Customer" hint="Start typing" />);
  assert.doesNotMatch(html, /aria-invalid/, 'a hint is help, not a failure');
  assert.match(html, /aria-describedby=/);
  assert.match(html, /Start typing/);
});

test('valid takes the green state, and error still beats it', () => {
  assert.match(renderToStaticMarkup(<ArenaSelect label="A" valid />), /data-arena-part="select.field"[^>]*\bdata-arena-state="valid"/);
  assert.match(renderToStaticMarkup(<ArenaSelect label="A" valid error="No" />), /data-arena-part="select.field"[^>]*\bdata-arena-state="error"/,
    'valid won over error, so a field reports success while it is failing');
  assert.doesNotMatch(renderToStaticMarkup(<ArenaSelect label="A" valid error="No" />), /data-arena-part="select.field"[^>]*\bdata-arena-state="valid"/);
});

test('placeholder is a disabled empty first option, so "nothing chosen" is not the first choice', () => {
  const html = renderToStaticMarkup(
    <ArenaSelect label="Customer" placeholder="Choose a customer" options={[{ value: 'a', label: 'Acme' }]} />,
  );
  assert.match(html, /<option value="" disabled="">Choose a customer<\/option>/);
  assert.ok(html.indexOf('Choose a customer') < html.indexOf('Acme'), 'the placeholder is not first');
});

test('icon is drawn hidden and pushes the text clear of it', () => {
  const html = renderToStaticMarkup(<ArenaSelect label="A" icon="ph-bold ph-user" />);
  assert.match(html, /class="ph-bold ph-user [^"]*"/,
    "the Phosphor class the consumer named leads, and the manifest's iconWrap slot places it");
  assert.match(html, /aria-hidden="true"/);
});

test('an icon shifts the field padding through a variant rather than a computed string', () => {
  assert.doesNotMatch(renderToStaticMarkup(<ArenaSelect label="A" options={[]} />), /data-arena-part="select.field"[^>]*\bdata-arena-has-icon=""/);
  assert.match(renderToStaticMarkup(<ArenaSelect label="A" options={[]} icon="ph-bold ph-globe" />), /data-arena-part="select.field"[^>]*\bdata-arena-has-icon=""/);
});

test('focus is a modifier the control answers, so nothing reports it to a state', () => {
  assert.match(renderToStaticMarkup(<ArenaSelect label="A" options={[]} />), /arena-select__field/);
});
