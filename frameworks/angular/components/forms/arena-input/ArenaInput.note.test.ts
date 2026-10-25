import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaInput } from './ArenaInput';

function render(inputs: Record<string, string>) {
  const fixture = TestBed.createComponent(ArenaInput);
  fixture.componentRef.setInput('label', 'Slug');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root, control: root.querySelector('input') as HTMLElement };
}

test('a hint is named by the field and carries the id followed by -note', () => {
  const { fixture, root, control } = render({ hint: 'Help line.' });
  try {
    assert.equal(control.getAttribute('aria-describedby'), 'in-slug-note');
    assert.equal(root.querySelector('#in-slug-note')?.textContent, 'Help line.');
  } finally { fixture.destroy(); }
});

test('an error replaces the hint under the same note id', () => {
  const { fixture, root, control } = render({ hint: 'Help line.', error: 'Wrong.' });
  try {
    assert.equal(control.getAttribute('aria-describedby'), 'in-slug-note');
    assert.equal(root.querySelector('#in-slug-note')?.textContent, 'Wrong.');
    assert.equal(root.textContent?.includes('Help line.'), false);
  } finally { fixture.destroy(); }
});

test('a note takes the id the consumer gives, and a field with neither carries no aria-describedby', () => {
  const { fixture, root, control } = render({ id: 'slug', hint: 'Help line.' });
  try {
    assert.equal(control.getAttribute('aria-describedby'), 'slug-note');
    assert.equal(root.querySelector('#slug-note')?.textContent, 'Help line.');
  } finally { fixture.destroy(); }
  const bare = render({});
  try {
    assert.equal(bare.control.hasAttribute('aria-describedby'), false);
  } finally { bare.fixture.destroy(); }
});

test('a field with neither a hint nor an error carries no aria-describedby', () => {
  const { fixture, control } = render({});
  try {
    assert.equal(control.hasAttribute('aria-describedby'), false);
  } finally { fixture.destroy(); }
});
