/* A card's body is a flex column, and it keeps stretching its block children so a chart or a
 * table can fill it. An inline component placed there keeps its own width because its root
 * declares one: this asserts the branch each button takes in the body, and that the sheet gives
 * the branch without full a width that is not auto. Layout itself is Chromium's to prove. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaCard } from './ArenaCard.tsx';
import { ArenaButton } from '../../forms/arena-button/ArenaButton.tsx';

afterEach(cleanup);

const SHEET = new URL('../../../../tailwind/consume/components/forms/arena-button/ArenaButton.styles.generated.css', import.meta.url);

test('a button without full in a card body takes its own width, and one with full takes the body', () => {
  const root = mount(<ArenaCard><ArenaButton>Save</ArenaButton><ArenaButton full>Continue</ArenaButton></ArenaCard>);
  const [own, full] = [...root.querySelectorAll('.arena-card__body > button')];
  assert.ok(own?.classList.contains('arena-button__root--full-false'));
  assert.ok(full?.classList.contains('arena-button__root--full-true'));
  assert.match(readFileSync(SHEET, 'utf8'), /\.arena-button__root--full-false \{\s*width: fit-content;/,
    'the branch without full is not fit-content, so the body stretches the button across itself');
});
