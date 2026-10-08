import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaInput } from './ArenaInput.tsx';

test('validate is accepted and shows no message before the field has been touched', () => {
  const html = renderToStaticMarkup(
    <ArenaInput label="Email" validate={() => 'Bad email'} value="x" />,
  );
  assert.match(html, /Email/);
  assert.doesNotMatch(html, /Bad email/, 'validate ran before blur');
});

test('type reaches the native control as its type attribute', () => {
  assert.match(renderToStaticMarkup(<ArenaInput label="When" type="date" />), /type="date"/);
});

test('the icon class is drawn on an <i> and hidden from assistive tech', () => {
  const html = renderToStaticMarkup(<ArenaInput label="Search" icon="ph-bold ph-magnifying-glass" />);
  assert.match(html, /<i[^>]*class="ph-bold ph-magnifying-glass [^"]*"/,
    "the Phosphor class the consumer named leads, and the manifest's icon slot follows it");
  assert.match(html, /<i[^>]*aria-hidden="true"/);
});

test('prefix renders its string before the control', () => {
  const html = renderToStaticMarkup(<ArenaInput label="Repository" prefix="git@" />);
  assert.match(html, /<span[^>]*>git@<\/span>/);
});

test('placeholder, name and autoComplete each reach the native input', () => {
  const html = renderToStaticMarkup(
    <ArenaInput label="Email" placeholder="you@example.com" name="email" autoComplete="email" />,
  );
  assert.match(html, /placeholder="you@example.com"/);
  assert.match(html, /name="email"/);

  assert.match(html, /autoComplete="email"/);
});

test('min, max, step, maxLength and pattern each reach the native input', () => {
  const html = renderToStaticMarkup(
    <ArenaInput label="Count" type="number" min="1" max="9" step="2" maxLength={20} pattern="[0-9]+" />,
  );
  assert.match(html, /min="1"/);
  assert.match(html, /max="9"/);
  assert.match(html, /step="2"/);
  assert.match(html, /maxLength="20"/);
  assert.match(html, /pattern="\[0-9\]\+"/);
});

test('readOnly, disabled and required each reach the native input', () => {
  const html = renderToStaticMarkup(<ArenaInput label="Slug" readOnly disabled required />);
  assert.match(html, /readonly=""/);
  assert.match(html, /disabled=""/);
  assert.match(html, /required=""/);
});

test('value reaches the native input as the controlled text', () => {
  assert.match(renderToStaticMarkup(<ArenaInput label="Slug" value="customer-portal" />), /value="customer-portal"/);
});

test('the label wires htmlFor to the id the component generates from the label text', () => {
  const html = renderToStaticMarkup(<ArenaInput label="Deploy date" />);
  assert.match(html, /<label for="in-deploy-date"/);
  assert.match(html, /<input id="in-deploy-date"/);
});

test('error renders below the field and marks the control invalid', () => {
  const html = renderToStaticMarkup(<ArenaInput label="Email" error="Invalid format" hint="Ignored" />);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /Invalid format/);
  assert.doesNotMatch(html, /Ignored/);
});

test('a consumer className does not reach the input -- its class is the manifest\'s and nothing else', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaInput label="A" className="mine" />);
  assert.match(html, /<input[^>]*class="[^"]*\barena-input__input\b[^"]*"/);
  assert.doesNotMatch(html, /mine/, 'a consumer className was merged into the input class');
});

test('the picker indicator is styled by the manifest, so nothing injects a stylesheet for it', () => {
  const html = renderToStaticMarkup(<ArenaInput label="When" type="date" />);
  assert.match(html, /arena-input__input/,
    'the vendor pseudo-element is an arbitrary variant of the manifest now');
  assert.doesNotMatch(html, /\barena-input\b/, 'the hook class the injected sheet needed is gone with it');
});

test('the three field states are three branches of one recipe', () => {
  const neutral = renderToStaticMarkup(<ArenaInput label="A" />);
  assert.match(neutral, /data-arena-part="input.field"[^>]*\bdata-arena-state="neutral"/);

  const bad = renderToStaticMarkup(<ArenaInput label="A" error="Nope" />);
  assert.match(bad, /data-arena-part="input.field"[^>]*\bdata-arena-state="error"/);
  assert.match(bad, /\barena-input__error\b/);

  const good = renderToStaticMarkup(<ArenaInput label="A" valid />);
  assert.match(good, /data-arena-part="input.field"[^>]*\bdata-arena-state="valid"/);
  assert.match(good, /data-arena-part="input.status-icon"[^>]*\bdata-arena-state="valid"/);
});

test('ArenaInput drops a consumer style object -- the ...style escape is gone', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaInput label="A" style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaInput drops a consumer attribute -- the {...rest} escape is gone', () => {
  const html = renderToStaticMarkup(<ArenaInput label="A" data-stray="x" />);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered input -- the {...rest} escape is back');
});

test('a consumer id overrides the one generated from the label', () => {
  const html = renderToStaticMarkup(<ArenaInput label="Email" id="signup-email" />);
  assert.match(html, /id="signup-email"/);
  assert.match(html, /for="signup-email"/);
  assert.doesNotMatch(html, /in-email/, 'the generated id is still being used despite an explicit one');
});

test('without a consumer id the label-derived one is still generated', () => {
  const html = renderToStaticMarkup(<ArenaInput label="Email" />);
  assert.match(html, /id="in-email"/);
  assert.match(html, /for="in-email"/);
});

test('readOnly is a group on the field and the input', () => {
  const on = renderToStaticMarkup(<ArenaInput label="Slug" readOnly />);
  assert.match(on, /data-arena-part="input.field"[^>]*\bdata-arena-read-only=""/);
  assert.match(on, /data-arena-part="input.input"[^>]*\bdata-arena-read-only=""/);
  assert.doesNotMatch(renderToStaticMarkup(<ArenaInput label="Slug" />), /read-only-true/);
});
