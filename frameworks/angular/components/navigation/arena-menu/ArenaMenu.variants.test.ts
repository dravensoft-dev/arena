import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO } from '../../../test/Compliance';
import assert from 'node:assert/strict';
import { arenaMenuStyles } from './ArenaMenu.variants';
import { ARENA_MENU_POSITIONS, isArenaActivatable } from './ArenaMenu';
import { sp1 } from '../../../Tokens.generated';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('the surface, the ink and the row metrics do not vary with anchoring -- only the position does', () => {
  const anchored = arenaMenuStyles({ anchored: true });
  const inFlow = arenaMenuStyles({ anchored: false });
  for (const slot of ['item', 'icon', 'label', 'shortcut', 'divider', 'header'] as const) {
    assert.equal(JSON.stringify(anchored.$data[slot]()), JSON.stringify(inFlow.$data[slot]()), `${slot} must not vary with anchored`);
  }
});

test('the item carries disabled and destructive as two attributes, and an item that is both carries both', () => {
  const plain = JSON.stringify(arenaMenuStyles({ disabled: false, destructive: false }).$data.item());
  const destructive = JSON.stringify(arenaMenuStyles({ disabled: false, destructive: true }).$data.item());
  const disabled = JSON.stringify(arenaMenuStyles({ disabled: true, destructive: false }).$data.item());
  assert.equal(new Set([plain, destructive, disabled]).size, 3);
  assert.deepEqual(arenaMenuStyles({ disabled: true, destructive: true }).$data.item(),
    { 'data-arena-disabled': '', 'data-arena-destructive': '' });
});

test('align end moves the panel and nothing else', () => {
  assert.notEqual(JSON.stringify(arenaMenuStyles({ align: 'end' }).$data.panel()), JSON.stringify(arenaMenuStyles({ align: 'start' }).$data.panel()));
  assert.equal(JSON.stringify(arenaMenuStyles({ align: 'end' }).$data.item()), JSON.stringify(arenaMenuStyles({ align: 'start' }).$data.item()));
});

test('a divider and a header are not activatable; everything else is', () => {
  assert.equal(isArenaActivatable({ divider: true }), false);
  assert.equal(isArenaActivatable({ header: 'Build 482' }), false);
  assert.equal(isArenaActivatable({ header: '' }), false, 'an empty header is still a header');
  assert.equal(isArenaActivatable({ label: 'Promote' }), true);
  assert.equal(isArenaActivatable({ label: 'Download logs', disabled: true }), true,
    'a disabled row is still a row -- it renders as a menuitem and reports nothing');
});

test('both alignments offer a flip below the trigger, and the gap is derived from the token rather than written', () => {
  for (const align of ['start', 'end'] as const) {
    const positions = ARENA_MENU_POSITIONS[align];
    assert.equal(positions.length, 2, `${align} must offer a fallback above the trigger`);
    assert.equal(positions[0].offsetY, sp1 * 1.5);
    assert.equal(positions[1].offsetY, -sp1 * 1.5);
    assert.equal(positions[0].originY, 'bottom');
    assert.equal(positions[1].originY, 'top');
  }
  assert.equal(ARENA_MENU_POSITIONS.start[0].originX, 'start');
  assert.equal(ARENA_MENU_POSITIONS.end[0].originX, 'end');
});

test('an end-aligned panel carries its alignment, and the sheet gives it left: auto after the in-flow left: 0', () => {
  assert.equal(arenaMenuStyles({ anchored: true, align: 'end' }).$data.panel()['data-arena-align'], 'end');
  assert.equal(arenaMenuStyles({ anchored: true, align: 'start' }).$data.panel()['data-arena-align'], 'start');
  const css = readFileSync(join(REPO, 'frameworks/tailwind/consume/components/navigation/arena-menu/ArenaMenu.styles.generated.css'), 'utf8');
  const inFlow = css.indexOf('.arena-menu__panel:where(:not([data-arena-anchored]))');
  const end = css.indexOf('.arena-menu__panel:where([data-arena-align="end"])');
  assert.ok(inFlow !== -1 && end > inFlow);
  assert.match(css.slice(end, css.indexOf('}', end)), /left: auto/);
});
