import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exemptionFor, gateFor, levelReports, levelsIn, surfaceKeys,
} from './levels.ts';

const SHEET = [
  '@layer utilities {',
  '  .arena-table__caption {',
  '    color: var(--ink-muted);',
  '    @supports (color: color-mix(in lab, red, red)) {',
  '      color: color-mix(in oklab, var(--ink-muted) 62%, transparent);',
  '    }',
  '  }',
  '  .arena-tag__close--disabled-true {',
  '    color: color-mix(in oklab, var(--ink-muted) 40%, transparent);',
  '  }',
  '  .arena-avatar__status--status-offline {',
  '    background-color: color-mix(in oklab, var(--color-base-content) 52%, transparent);',
  '  }',
  '  .arena-badge__root--tone-success {',
  '    background-color: color-mix(in oklab, var(--color-success) 16%, transparent);',
  '  }',
  '}',
].join('\n');

const ROLES = new Map([
  ['ink-muted', 'var(--color-base-content)'],
  ['fill-surface', 'var(--color-base-100)'],
]);

const DUOLINGO = { 'base-100': '#ffffff', 'base-content': '#4b4b4b', success: '#58cc02' };

test('a level is read off the sheet a package ships, with the slot that paints it', () => {
  const levels = levelsIn(SHEET);
  assert.deepEqual(levels.map((l) => `${l.property}/${l.variable}/${l.percent}`), [
    'color/ink-muted/62',
    'color/ink-muted/40',
    'background-color/color-base-content/52',
    'background-color/color-success/16',
  ]);
  assert.equal(levels[0]?.selector, '.arena-table__caption');
});

test('the disabled register is exempt, and says why rather than being absent', () => {
  const [, disabled] = levelsIn(SHEET);
  assert.match(exemptionFor(disabled as never) ?? '', /inactive/);
});

test('text is held to AA, a mark to 3:1, and a tint of a status colour to nothing', () => {
  const [text, , mark, tint] = levelsIn(SHEET);
  assert.equal(gateFor(text as never), 4.5);
  assert.equal(gateFor(mark as never), 3);
  assert.equal(gateFor(tint as never), null,
    'a soft wash is meant to be faint; holding it to a ratio would report the design');
});

test('the surfaces are the page plus whatever the plugin answers with', () => {
  assert.deepEqual(surfaceKeys(ROLES), ['base-100']);
  assert.deepEqual(surfaceKeys(new Map([...ROLES, ['fill-surface', 'var(--color-base-200)']])),
    ['base-100', 'base-200']);
});

test('a level composited over a real palette is measured rather than assumed', () => {
  const reports = levelReports(levelsIn(SHEET), ROLES, DUOLINGO);
  assert.equal(reports.length, 2, 'the caption at 62% and the presence dot at 52% both fail here');
  assert.ok(reports.some((r) => r.message.includes('--ink-muted at 62%') && r.message.includes('3.23:1')));
  assert.ok(reports.some((r) => r.message.includes('--color-base-content at 52%') && r.message.includes('2.58:1')));
});
