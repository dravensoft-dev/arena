/* A card's body is a flex column, and it keeps stretching its block children so a chart or a
 * table can fill it. An inline component placed there keeps its own width because its root
 * declares one: this asserts which button carries arena-fill and that the sheet reads the fill
 * channel with fit-content as its fallback. Layout itself is Chromium's to prove. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaCard } from './ArenaCard.tsx';
import { ArenaButton } from '../../forms/arena-button/ArenaButton.tsx';

afterEach(cleanup);

const SHEET = new URL('../../../../tailwind/consume/components/forms/arena-button/ArenaButton.styles.generated.css', import.meta.url);

test('a button in a card body takes its own width, and one with arena-fill takes the body', () => {
  const root = mount(<ArenaCard><ArenaButton>Save</ArenaButton><ArenaButton className="arena-fill">Continue</ArenaButton></ArenaCard>);
  const [own, fill] = [...root.querySelectorAll('.arena-card__body > button')];
  assert.ok(own && !own.classList.contains('arena-fill'));
  assert.ok(fill?.classList.contains('arena-fill'));
  assert.match(readFileSync(SHEET, 'utf8'), /width: var\(--arena-fill-width, ?fit-content\)/,
    'the root does not read the fill channel with fit-content behind it, so the body stretches the button across itself');
});
