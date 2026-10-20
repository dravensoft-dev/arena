/* The rules every anchored panel follows, held with rect literals because the suite has no layout:
 * which side a panel opens on, where it lines up, how it stays inside the viewport, which panel of
 * the stack is the one Escape reaches, what counts as a press inside, and where Tab leaves. The
 * other layer's copy carries the same file, and check:shared-arithmetic keeps the bodies equal. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaEscapeInsideModal, arenaOpeningFocus, arenaPanelSide, arenaPanelsAbove, arenaPlacePanel, arenaPressInside,
  arenaTabLeavesPanel, arenaTopmostPanel,
} from './AnchoredPanel.ts';

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });
const size = (width: number, height: number) => ({ width, height });
const VIEWPORT = size(800, 600);
const PANEL = size(200, 120);
const TRIGGER = rect(100, 100, 80, 32);

test('a panel opens below its anchor, starting at the anchor\'s left edge, an offset under it', () => {
  assert.deepEqual(arenaPlacePanel(TRIGGER, PANEL, VIEWPORT, 'start', 6), { x: 100, y: 138, side: 'below' });
});

test('an end-aligned panel lines its right edge up with the anchor\'s', () => {
  assert.equal(arenaPlacePanel(rect(400, 100, 80, 32), PANEL, VIEWPORT, 'end', 6).x, 280);
});

test('a centred panel sits over the middle of its anchor', () => {
  assert.deepEqual(arenaPlacePanel(rect(400, 300, 80, 32), size(40, 20), VIEWPORT, 'center', 6, 'above'),
    { x: 420, y: 274, side: 'above' });
});

test('near the bottom it flips above, because the room above is larger and the room below too small', () => {
  const low = rect(100, 540, 80, 32);
  assert.equal(arenaPanelSide(low, PANEL, VIEWPORT, 6, 'below'), 'above');
  assert.deepEqual(arenaPlacePanel(low, PANEL, VIEWPORT, 'start', 6), { x: 100, y: 414, side: 'above' });
});

test('it stays below when neither side holds it and below is still the larger room', () => {
  assert.equal(arenaPanelSide(rect(0, 200, 80, 32), size(200, 590), VIEWPORT, 6, 'below'), 'below');
});

test('a panel that prefers above flips below near the top', () => {
  assert.equal(arenaPanelSide(rect(100, 4, 80, 32), size(60, 24), VIEWPORT, 6, 'above'), 'below');
});

test('an aligned panel that would leave the viewport takes the opposite alignment when that fits', () => {
  assert.equal(arenaPlacePanel(rect(700, 100, 80, 32), PANEL, VIEWPORT, 'start', 6).x, 580,
    'a start-aligned panel past the right edge ends where its anchor ends');
  assert.equal(arenaPlacePanel(rect(10, 100, 80, 32), PANEL, VIEWPORT, 'end', 6).x, 10,
    'an end-aligned panel past the left edge starts where its anchor starts');
  assert.equal(arenaPlacePanel(rect(400, 100, 80, 32), PANEL, VIEWPORT, 'end', 6).x, 280, 'a panel that fits keeps its alignment');
});

test('a panel that fits neither alignment is clamped inside the viewport, from the alignment that overflows less', () => {
  assert.equal(arenaPlacePanel(rect(100, 100, 20, 32), size(250, 10), size(300, 600), 'start', 6).x, 50,
    'the asked alignment overflows less, so it is the one clamped');
  assert.equal(arenaPlacePanel(rect(165, 100, 20, 32), size(200, 10), size(360, 600), 'end', 6).x, 160,
    'the flipped alignment overflows by 5 and the asked one by 15, so the flipped one is clamped');
  assert.equal(arenaPlacePanel(rect(165, 100, 20, 32), size(200, 10), size(360, 600), 'start', 6).x, 160,
    'the asked alignment overflows by 5 and the flipped one by 15, so the asked one is clamped');
  assert.equal(arenaPlacePanel(rect(0, 100, 80, 32), size(900, 10), VIEWPORT, 'start', 6).x, 0,
    'a panel wider than the viewport starts at its left edge');
});

test('a centred panel never flips, and is clamped at the edge', () => {
  assert.equal(arenaPlacePanel(rect(10, 100, 20, 32), PANEL, VIEWPORT, 'center', 6).x, 0);
  assert.equal(arenaPlacePanel(rect(770, 100, 20, 32), PANEL, VIEWPORT, 'center', 6).x, 600);
});

test('the topmost panel is the last one opened, and an empty stack has none', () => {
  assert.equal(arenaTopmostPanel(['popover', 'menu']), 'menu');
  assert.equal(arenaTopmostPanel([]), null);
});

test('the panels above an entry are the ones opened after it, and an entry not on the stack has none', () => {
  assert.deepEqual(arenaPanelsAbove(['popover', 'menu', 'tooltip'], 'popover'), ['menu', 'tooltip']);
  assert.deepEqual(arenaPanelsAbove(['popover', 'menu'], 'menu'), []);
  assert.deepEqual(arenaPanelsAbove(['popover'], 'gone'), []);
});

test('a press is inside when any region holds it, and a missing region holds nothing', () => {
  const region = (owned: string[]) => ({ contains: (other: string) => owned.includes(other) });
  assert.equal(arenaPressInside('row', [region(['trigger']), null, region(['row'])]), true);
  assert.equal(arenaPressInside('page', [region(['trigger']), undefined, region(['row'])]), false);
  assert.equal(arenaPressInside('page', []), false);
});

test('opening focuses the first focusable, or the panel itself when it holds none', () => {
  assert.equal(arenaOpeningFocus(['field', 'apply'], 'panel'), 'field');
  assert.equal(arenaOpeningFocus([], 'panel'), 'panel');
});

test('Tab leaves from the last focusable and Shift+Tab from the first, and nowhere in between', () => {
  const stops = ['field', 'reset', 'apply'];
  assert.equal(arenaTabLeavesPanel(stops, 'apply', false), true);
  assert.equal(arenaTabLeavesPanel(stops, 'field', true), true);
  assert.equal(arenaTabLeavesPanel(stops, 'reset', false), false);
  assert.equal(arenaTabLeavesPanel(stops, 'field', false), false);
  assert.equal(arenaTabLeavesPanel(stops, 'apply', true), false);
});

test('from the panel itself Tab enters it and Shift+Tab leaves, and a panel with no stop is always left', () => {
  assert.equal(arenaTabLeavesPanel(['field'], 'panel', false), false);
  assert.equal(arenaTabLeavesPanel(['field'], 'panel', true), true);
  assert.equal(arenaTabLeavesPanel([], 'panel', false), true);
  assert.equal(arenaTabLeavesPanel([], null, true), true);
});

test('a panel that fits neither side is pushed inside the viewport, and one taller than it starts at the top', () => {
  const middle = rect(100, 200, 80, 32);
  assert.deepEqual(arenaPlacePanel(middle, size(200, 590), VIEWPORT, 'start', 6), { x: 100, y: 10, side: 'below' });
  assert.deepEqual(arenaPlacePanel(rect(100, 250, 80, 32), size(200, 330), VIEWPORT, 'start', 6), { x: 100, y: 270, side: 'below' });
  assert.equal(arenaPlacePanel(middle, size(200, 700), VIEWPORT, 'start', 6).y, 0,
    'a panel taller than the viewport starts at its top edge');
});

test('on an exact tie of the two rooms the preferred side is kept', () => {
  const centred = rect(100, 284, 80, 32);
  assert.equal(arenaPanelSide(centred, size(60, 400), VIEWPORT, 0, 'below'), 'below');
  assert.equal(arenaPanelSide(centred, size(60, 400), VIEWPORT, 0, 'above'), 'above');
});

test('an Escape from inside a modal that sits inside the panel belongs to that modal', () => {
  class Node {
    parent: Node | null;
    modal: boolean;
    constructor(parent: Node | null, modal = false) { this.parent = parent; this.modal = modal; }
    closest(selector: string): Node | null {
      assert.equal(selector, '[aria-modal="true"]');
      for (let at: Node | null = this; at; at = at.parent) if (at.modal) return at;
      return null;
    }
    contains(other: Node): boolean {
      for (let at: Node | null = other; at; at = at.parent) if (at === this) return true;
      return false;
    }
  }
  const node = (_name: string, parent: Node | null, modal = false) => new Node(parent, modal);
  const panel = node('panel', null);
  const dialog = node('dialog', panel, true);
  assert.equal(arenaEscapeInsideModal(node('field', dialog), panel), true);
  assert.equal(arenaEscapeInsideModal(node('field', panel), panel), false, 'a control of the panel itself is not in a modal');
  assert.equal(arenaEscapeInsideModal(node('field', node('page', null, true)), panel), false, 'a modal around the panel is not inside it');
  const modalPanel = node('modal panel', null, true);
  assert.equal(arenaEscapeInsideModal(node('field', modalPanel), modalPanel), false, 'the panel being modal itself is not a modal inside it');
});
