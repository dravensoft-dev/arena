/* The `main` pattern asks for two things and both are read off the element: the landmark, and
 * that the landmark is focusable programmatically. The second is the one worth a suite, because
 * it is invisible in every way a person tests by hand: an anchor pointing at a container the
 * platform will not focus scrolls the page and looks exactly like one that worked. The rest of
 * what this component claims is what it does NOT draw, and that is the other half here. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaMain, ARENA_MAIN_ID } from './ArenaMain';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-main/ArenaMain.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaMain],
  template: '<arena-main><p>Everything the page is for.</p></arena-main>',
})
class MainHost {}

function render() {
  const fixture = TestBed.createComponent(MainHost);
  fixture.detectChanges();
  return fixture;
}

const mainOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('main') as HTMLElement;

test('arena-main is the main landmark it binds, named by the element and not by a role', () => {
  const fixture = render();
  try {
    const main = mainOf(fixture);
    assert.ok(main, 'the component renders no main element at all');
    assert.equal(main.getAttribute('role'), null,
      'a redundant role on a main is a second statement of the same fact');

    assertPattern({ root: main, bindingPath: BINDING, subjects: { default: main } });
  } finally { fixture.destroy(); }
});

test('the landmark is focusable programmatically and is not a tab stop', () => {
  const fixture = render();
  try {
    const main = mainOf(fixture);
    assert.equal(main.getAttribute('tabindex'), '-1',
      'without it an anchor pointing here scrolls the page and leaves focus in the nav the reader '
      + 'was trying to escape, which is the failure that makes a skip link look like it worked');
    assert.equal(isFocusable(main), false,
      'a landmark in the tab order is a dead stop on every page, which is worse than the gap it closes');
  } finally { fixture.destroy(); }
});

test('the id is the constant both halves of the pair are written against', () => {
  const fixture = render();
  try {
    assert.equal(mainOf(fixture).getAttribute('id'), ARENA_MAIN_ID,
      'the link that points here reads the same constant, so a page coordinates no id at all');
  } finally { fixture.destroy(); }
});

test('it draws no box: one display declaration and nothing that places anything', () => {
  const fixture = render();
  try {
    const main = mainOf(fixture);
    assert.equal(main.children.length, 1, 'the projected content is the only child, with no wrapper around it');
    assert.equal(main.getAttribute('style'), null,
      'a landmark that writes an inline style has started doing layout, which is the container\'s');
  } finally { fixture.destroy(); }
});
