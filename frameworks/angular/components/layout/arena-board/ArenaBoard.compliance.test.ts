/* The narrowest column is a family an adopter writes as a class on the board, so the host carries
 * the slot class and any option class it is given, and no style attribute. The slot string is
 * read from the generated manifest, never spelt here. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaBoard } from './ArenaBoard';
import manifest from './ArenaBoard.classes.generated';

@Component({
  standalone: true,
  imports: [ArenaBoard],
  template: `<arena-board label="Tasks"><span>One</span></arena-board>`,
})
class BoardHost {}

@Component({
  standalone: true,
  imports: [ArenaBoard],
  template: `<arena-board class="arena-board-column-lg" label="Tasks"><span>One</span></arena-board>`,
})
class OptionBoardHost {}

const boardOf = (host: new () => unknown) => {
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return { fixture, board: fixture.nativeElement.querySelector('arena-board') as HTMLElement };
};

test('the host carries the slot class, no style, and stays a boundary', () => {
  const { fixture, board } = boardOf(BoardHost);
  try {
    assert.ok(board.classList.contains(manifest.slots.root), 'the root slot class is on the host');
    assert.equal(board.getAttribute('style'), null, 'a board takes no style: its column width is the slot class');
    assert.equal(board.getAttribute('data-arena-part'), manifest.parts.root);
    assert.equal(board.hasAttribute('data-arena-boundary'), true);
  } finally { fixture.destroy(); }
});

test('a column option written on the host stays beside the slot class and the host still has no style', () => {
  const { fixture, board } = boardOf(OptionBoardHost);
  try {
    for (const cls of [manifest.slots.root, 'arena-board-column-lg']) {
      assert.ok(board.classList.contains(cls), `${cls} is lost from the host`);
    }
    assert.equal(board.getAttribute('style'), null);
  } finally { fixture.destroy(); }
});
