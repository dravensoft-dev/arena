import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaOnboarding } from './ArenaOnboarding.tsx';

import { sp3, sp4 } from '../../../Tokens.generated.js';

test('a closed tour renders nothing', () => {
  assert.equal(renderToStaticMarkup(<ArenaOnboarding open={false} steps={[{ title: 'One' }]} />), '');
});

test('a step draws its eyebrow, title and body as text, and names the dialog', () => {
  const html = renderToStaticMarkup(
    <ArenaOnboarding open steps={[{ eyebrow: 'TOUR', title: 'Projects', body: 'Everything lives here.' }]} />,
  );
  assert.ok(html.includes('TOUR'), 'the eyebrow is rendered');
  assert.ok(html.includes('Everything lives here.'), 'the body renders as plain text');
  assert.ok(html.includes('aria-label="Projects"'), 'the dialog-modal binding\'s accessible name is intact');
});

test('an anchor switches the coachmark from the bottom-right corner to top/left placement', () => {
  const floating = renderToStaticMarkup(<ArenaOnboarding open steps={[{ title: 'One' }]} />);
  const anchored = renderToStaticMarkup(
    <ArenaOnboarding open steps={[{ title: 'One' }]} anchor={{ left: sp4, bottom: sp3 }} />,
  );

  assert.match(anchored, /style="top:\d/, 'the anchored branch pins a computed top');
  assert.match(anchored, /left:\d/, 'the anchored branch pins a computed left');
  assert.doesNotMatch(anchored, /data-arena-part="onboarding.panel"[^>]*\bdata-arena-placement="floating"/, 'and stops floating off the corner');

  assert.doesNotMatch(floating, /style="top:/, 'the default branch pins nothing computed');
  assert.match(floating, /data-arena-part="onboarding.panel"[^>]*\bdata-arena-placement="floating"/, 'the default branch floats off the corner through the recipe');
  assert.match(floating, /data-arena-part="onboarding.panel"[^>]*\bdata-arena-placement="floating"/);
});

test('an absent required member throws rather than rendering', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaOnboarding steps={[{ title: 'One' }]} />), /`open` is required/);
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaOnboarding open />), /`steps` is required/);
});

test('the current step is the dot with the current group selected and the others take its other value', () => {
  const html = renderToStaticMarkup(<ArenaOnboarding open steps={[{ title: 'One' }, { title: 'Two' }, { title: 'Three' }]} />);
  assert.equal((html.match(/data-arena-part="onboarding.dot"[^>]*\bdata-arena-current=""/g) || []).length, 1);
  assert.equal((html.match(/data-arena-part="onboarding.dot"(?:(?!data-arena-current=)[^>])*>/g) || []).length, 2);
});
