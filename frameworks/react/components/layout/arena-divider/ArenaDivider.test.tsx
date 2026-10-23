/* What a reader meets is decided by the element, so the markup is the whole question here: an <hr>
 * with no label, which the platform names a separator, and with a label the word as plain text
 * between two rules nobody hears. The vertical rule is a class and changes no markup, so it is
 * asserted as a class passed through and nothing else; how it stretches is a layout question a
 * browser answers, and the prompt carries it as a by-hand check. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaDivider } from './ArenaDivider.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('with no label it is one hr, which a reader meets as a separator', () => {
  const html = render(<ArenaDivider />);
  assert.match(html, /^<hr [^>]*\/>$/, 'a rule drawn on a div is a line nobody hears as a separator');
  assert.doesNotMatch(html, /aria-hidden/, 'hiding the hr takes away the one thing the element says');
  assert.doesNotMatch(html, /role=/, 'naming a role on an hr replaces the separator the element already is');
  assert.match(html, /data-arena-part="divider"/);
});

test('a blank label draws the plain rule, because a space between two rules names nothing', () => {
  assert.match(render(<ArenaDivider label="   " />), /^<hr /);
});

test('with a label the word is text between two rules a reader never hears', () => {
  const html = render(<ArenaDivider label="or" />);
  assert.match(html, /^<div /, 'the labelled rule claims no role, so its wrapper is a plain element');
  assert.doesNotMatch(html, /<hr/, 'a word inside a separator can be dropped by a reader, so no hr holds it');
  const rules = [...html.matchAll(/<span aria-hidden="true"[^>]*data-arena-part="divider\.rule"/g)];
  assert.equal(rules.length, 2, 'both lines are decorative and hidden from assistive technology');
  assert.match(html, /<span class="[^"]*" data-arena-part="divider\.label"[^>]*>or<\/span>/,
    'the word is one text run of its own, never hidden');
});

test('a vocabulary class reaches the element, so arena-orientation-vertical stands the rule across the line', () => {
  assert.match(render(<ArenaDivider className="arena-orientation-vertical" />), /^<hr class="[^"]*\barena-orientation-vertical\b/);
  assert.match(render(<ArenaDivider label="or" className="arena-orientation-vertical" />), /^<div class="[^"]*\barena-orientation-vertical\b/);
});
