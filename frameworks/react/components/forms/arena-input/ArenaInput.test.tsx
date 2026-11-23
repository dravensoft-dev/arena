import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaInput } from './ArenaInput.tsx';

test('validate is accepted and shows no message before the field has been touched', () => {
  const html = renderIcons(
    <ArenaInput label="Email" validate={() => 'Bad email'} value="x" />,
  );
  assert.match(html, /Email/);
  assert.doesNotMatch(html, /Bad email/, 'validate ran before blur');
});

test('type reaches the native control as its type attribute', () => {
  assert.match(renderIcons(<ArenaInput label="When" type="date" />), /type="date"/);
});

test('the icon class is drawn as an svg and hidden from assistive tech', () => {
  const html = renderIcons(<ArenaInput label="Search" icon="ph-bold ph-magnifying-glass" />);
  assert.deepEqual(symbols(html), ['bold-magnifying-glass'], 'the Phosphor class the consumer named is drawn as its sprite symbol');
  assert.match(html, /data-arena-part="input.icon"[^>]*><svg[^>]*aria-hidden="true"/, "inside the manifest's icon slot");
});

test('prefix renders its string before the control', () => {
  const html = renderIcons(<ArenaInput label="Repository" prefix="git@" />);
  assert.match(html, /<span[^>]*>git@<\/span>/);
});

test('placeholder, name and autoComplete each reach the native input', () => {
  const html = renderIcons(
    <ArenaInput label="Email" placeholder="you@example.com" name="email" autoComplete="email" />,
  );
  assert.match(html, /placeholder="you@example.com"/);
  assert.match(html, /name="email"/);

  assert.match(html, /autoComplete="email"/);
});

test('min, max, step, maxLength and pattern each reach the native input', () => {
  const html = renderIcons(
    <ArenaInput label="Count" type="number" min="1" max="9" step="2" maxLength={20} pattern="[0-9]+" />,
  );
  assert.match(html, /min="1"/);
  assert.match(html, /max="9"/);
  assert.match(html, /step="2"/);
  assert.match(html, /maxLength="20"/);
  assert.match(html, /pattern="\[0-9\]\+"/);
});

test('readOnly, disabled and required each reach the native input', () => {
  const html = renderIcons(<ArenaInput label="Slug" readOnly disabled required />);
  assert.match(html, /readonly=""/);
  assert.match(html, /disabled=""/);
  assert.match(html, /required=""/);
});

test('value reaches the native input as the controlled text', () => {
  assert.match(renderIcons(<ArenaInput label="Slug" value="customer-portal" />), /value="customer-portal"/);
});

test('the label wires htmlFor to the id the component generates from the label text', () => {
  const html = renderIcons(<ArenaInput label="Deploy date" />);
  assert.match(html, /<label for="in-deploy-date"/);
  assert.match(html, /<input id="in-deploy-date"/);
});

test('error renders below the field and marks the control invalid', () => {
  const html = renderIcons(<ArenaInput label="Email" error="Invalid format" hint="Ignored" />);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /Invalid format/);
  assert.doesNotMatch(html, /Ignored/);
});

test('the input carries the manifest slot class on the <input> itself', () => {
  const html = renderIcons(<ArenaInput label="A" />);
  assert.match(html, /<input[^>]*class="[^"]*\barena-input__input\b[^"]*"/);
});

test('the input draws its input slot and no hook class', () => {
  const html = renderIcons(<ArenaInput label="When" type="date" />);
  assert.match(html, /arena-input__input/, 'the input did not draw its input slot class');
  assert.doesNotMatch(html, /\barena-input\b/, 'the hook class the injected sheet needed is gone with it');
});

test('the three field states are three branches of one recipe', () => {
  const neutral = renderIcons(<ArenaInput label="A" />);
  assert.match(neutral, /data-arena-part="input.field"[^>]*\bdata-arena-state="neutral"/);

  const bad = renderIcons(<ArenaInput label="A" error="Nope" />);
  assert.match(bad, /data-arena-part="input.field"[^>]*\bdata-arena-state="error"/);
  assert.match(bad, /\barena-input__error\b/);

  const good = renderIcons(<ArenaInput label="A" valid />);
  assert.match(good, /data-arena-part="input.field"[^>]*\bdata-arena-state="valid"/);
  assert.match(good, /data-arena-part="input.status-icon"[^>]*\bdata-arena-state="valid"/);
});

test('a consumer id overrides the one generated from the label', () => {
  const html = renderIcons(<ArenaInput label="Email" id="signup-email" />);
  assert.match(html, /id="signup-email"/);
  assert.match(html, /for="signup-email"/);
  assert.doesNotMatch(html, /in-email/, 'the generated id is still being used despite an explicit one');
});

test('readOnly is a group on the field and the input', () => {
  const on = renderIcons(<ArenaInput label="Slug" readOnly />);
  assert.match(on, /data-arena-part="input.field"[^>]*\bdata-arena-read-only=""/);
  assert.match(on, /data-arena-part="input.input"[^>]*\bdata-arena-read-only=""/);
  assert.doesNotMatch(renderIcons(<ArenaInput label="Slug" />), /data-arena-read-only/);
});

test('validate returns the message or an empty string, never null', () => {
  renderIcons(<ArenaInput label="N" validate={() => ''} />);
  // @ts-expect-error a validator returns a string, empty for valid
  renderIcons(<ArenaInput label="N" validate={() => null} />);
});
