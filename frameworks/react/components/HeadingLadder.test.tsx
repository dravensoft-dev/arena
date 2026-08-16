/* The ladder, asserted as one outline rather than seven components. Every title here is drawn
 * from the same class at every rung, so the ONLY thing a level may move is the element, and the
 * class assertion is what holds that: a level that changed the appearance would make the member
 * a styling surface, which is the one thing it may not be. A chart card is absent from the
 * default outline on purpose, because its title defaults to no rung at all. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import type { ArenaHeadingLevel } from '../Api.generated';
import { ArenaCard } from './display/arena-card/ArenaCard.tsx';
import { ArenaUnauthCard } from './display/arena-unauth-card/ArenaUnauthCard.tsx';
import { ArenaChartCard } from './charts/arena-chart-card/ArenaChartCard.tsx';
import { ArenaSection } from './layout/arena-section/ArenaSection.tsx';
import { ArenaBoardColumn } from './layout/arena-board-column/ArenaBoardColumn.tsx';
import { ArenaEmptyState } from './feedback/arena-empty-state/ArenaEmptyState.tsx';
import { ArenaErrorState } from './feedback/arena-error-state/ArenaErrorState.tsx';

interface Rung {
  name: string;
  text: string;
  rung: string;
  refusesNone: boolean;
  draw: (level?: ArenaHeadingLevel) => React.ReactElement;
}

const LADDER: Rung[] = [
  { name: 'ArenaSection', text: 'Section', rung: 'h2', refusesNone: true,
    draw: (headingLevel) => <ArenaSection title="Section" headingLevel={headingLevel}><p>Body</p></ArenaSection> },
  { name: 'ArenaCard', text: 'Card', rung: 'h3', refusesNone: false,
    draw: (headingLevel) => <ArenaCard title="Card" headingLevel={headingLevel} /> },
  { name: 'ArenaChartCard', text: 'Chart', rung: 'none', refusesNone: false,
    draw: (headingLevel) => <ArenaChartCard title="Chart" headingLevel={headingLevel} /> },
  { name: 'ArenaBoardColumn', text: 'Column', rung: 'h3', refusesNone: true,
    draw: (headingLevel) => <ArenaBoardColumn title="Column" headingLevel={headingLevel} /> },
  { name: 'ArenaEmptyState', text: 'Empty', rung: 'h3', refusesNone: true,
    draw: (headingLevel) => <ArenaEmptyState title="Empty" headingLevel={headingLevel} /> },
  { name: 'ArenaErrorState', text: 'Error', rung: 'h3', refusesNone: false,
    draw: (headingLevel) => <ArenaErrorState title="Error" headingLevel={headingLevel} /> },
  { name: 'ArenaUnauthCard', text: 'Unauth', rung: 'h2', refusesNone: false,
    draw: (headingLevel) => <ArenaUnauthCard title="Unauth" headingLevel={headingLevel} /> },
];

const drawn = (html: string, text: string) => new RegExp(`<([a-z0-9]+) class="([^"]*)"[^>]*>${text}</\\1>`).exec(html);

const headings = (html: string) => [...html.matchAll(/<(h[1-4])[^>]*>([^<]*)<\/\1>/g)].map((m) => `${m[1]}:${m[2]}`);

test('every title takes its own rung of the ladder when nobody says otherwise', () => {
  for (const { name, text, rung, draw } of LADDER) {
    const html = renderToStaticMarkup(draw());
    const element = drawn(html, text);
    assert.ok(element, `${name}: the title must still be drawn`);
    assert.equal(element?.[1], rung === 'none' ? 'span' : rung,
      `${name}: the default rung IS its place on the title ladder, and a chart card takes none `
      + 'of them because a grid of tiles is not a hierarchy');
  }
});

test('a level moves the element and nothing else', () => {
  for (const { name, text, draw } of LADDER) {
    const before = drawn(renderToStaticMarkup(draw()), text);
    const after = drawn(renderToStaticMarkup(draw('h4')), text);
    assert.equal(after?.[1], 'h4', `${name}: every component on the ladder answers the member`);
    assert.equal(after?.[2], before?.[2],
      `${name}: a rung may not reach the class, or the member is a styling surface and a style `
      + 'plugin no longer owns the register a title is drawn in');
  }
});

test('none takes a title out of the outline, or is refused where the title is required', () => {
  for (const { name, text, refusesNone, draw } of LADDER) {
    if (refusesNone) {
      assert.throws(() => renderToStaticMarkup(draw('none')), /headingLevel/,
        `${name}: a title required because it names the thing it draws cannot also be told the name is not one`);
      continue;
    }
    const html = renderToStaticMarkup(draw('none'));
    assert.deepEqual(headings(html), [], `${name}: none opens no heading`);
    assert.ok(drawn(html, text), `${name}: and the title is still drawn`);
  }
});
