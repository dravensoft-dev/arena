/* `none` requires nothing, so assertPattern alone would pass over a grid that had grown a
 * role or a tab stop. The claim the binding makes is that this is layout and not the `grid`
 * pattern, and that is what the hand assertions below check: no role="grid", no gridcell,
 * and nothing focusable that the content slot did not put there. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaGrid } from './ArenaGrid';
import manifest from './ArenaGrid.classes.generated';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-grid/ArenaGrid.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaGrid],
  template: `
    <arena-grid>
      <span>One</span>
      <span>Two</span>
      <span>Three</span>
    </arena-grid>
  `,
})
class GridHost {}

@Component({
  standalone: true,
  imports: [ArenaGrid],
  template: `<arena-grid class="arena-grid-min-lg arena-grid-gap-group arena-grid-max-md"><span>One</span></arena-grid>`,
})
class OptionGridHost {}

function render() {
  const fixture = TestBed.createComponent(GridHost);
  fixture.detectChanges();
  return fixture;
}

const gridOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('arena-grid') as HTMLElement;

test('arena-grid is layout and never the grid PATTERN -- no role, no cells, nothing to act on', () => {
  const fixture = render();
  try {
    const grid = gridOf(fixture);
    assert.equal(grid.getAttribute('role'), null,
      'a role="grid" here would announce a table where there are only boxes');
    assert.equal(grid.querySelectorAll('[role="gridcell"]').length, 0);
    assert.equal(grid.querySelectorAll('[tabindex]').length, 0, 'layout costs no tab stop');
    for (const el of [grid, ...Array.from(grid.querySelectorAll('*'))]) {
      assert.equal(isFocusable(el as Element), false,
        `<${el.tagName.toLowerCase()}> inside a grid is reachable by keyboard, so a user tabs to something inert`);
    }

    assertPattern({ root: grid, bindingPath: BINDING, subjects: { default: grid } });
  } finally {
    fixture.destroy();
  }
});

test('every child is one cell exactly as written -- nothing is wrapped and nothing is measured', () => {
  const fixture = render();
  try {
    const grid = gridOf(fixture);
    const cells = Array.from(grid.children);
    assert.equal(cells.length, 3, 'a wrapper per cell would break every selector a consumer writes');
    assert.deepEqual(cells.map((c) => c.tagName), ['SPAN', 'SPAN', 'SPAN']);
  } finally {
    fixture.destroy();
  }
});

test('the host carries the recipe class and no inline geometry', () => {
  const fixture = render();
  try {
    const host = gridOf(fixture);
    assert.ok(host.classList.contains(manifest.slots.root), 'the root slot class is on the host');
    assert.equal(host.getAttribute('style'), null, 'a grid takes no style: its tracks, ceiling and gap are the slot class');
    assert.equal(host.getAttribute('data-arena-part'), manifest.parts.root);
    for (const attr of ['data-arena-gap', 'data-arena-centred']) {
      assert.equal(host.hasAttribute(attr), false, `${attr} is produced by no member`);
    }
  } finally {
    fixture.destroy();
  }
});

test('an option class written on the host stays beside the recipe class and the host still has no style', () => {
  const fixture = TestBed.createComponent(OptionGridHost);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement.querySelector('arena-grid') as HTMLElement;
    for (const cls of [manifest.slots.root, 'arena-grid-min-lg', 'arena-grid-gap-group', 'arena-grid-max-md']) {
      assert.ok(host.classList.contains(cls), `${cls} is lost from the host`);
    }
    assert.equal(host.getAttribute('style'), null);
  } finally {
    fixture.destroy();
  }
});
