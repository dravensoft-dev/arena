/* The ladder, asserted as one outline rather than seven components. Every title here is drawn
 * from the same class at every rung, so the ONLY thing a level may move is the element, and the
 * class assertion is what holds that: a level that changed the appearance would make the member
 * a styling surface, which is the one thing it may not be. A chart card is absent from the
 * default outline on purpose, because its title defaults to no rung at all. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaHeadingLevel } from '../Api.generated';
import { assertNoNode } from '../test/NodeAssert';
import { ArenaPageHead } from './navigation/arena-page-head/ArenaPageHead';
import { ArenaHero } from './layout/arena-hero/ArenaHero';
import { ArenaCard } from './display/arena-card/ArenaCard';
import { ArenaUnauthCard } from './display/arena-unauth-card/ArenaUnauthCard';
import { ArenaChartCard } from './charts/arena-chart-card/ArenaChartCard';
import { ArenaSection } from './layout/arena-section/ArenaSection';
import { ArenaBoardColumn } from './layout/arena-board-column/ArenaBoardColumn';
import { ArenaEmptyState } from './feedback/arena-empty-state/ArenaEmptyState';
import { ArenaErrorState } from './feedback/arena-error-state/ArenaErrorState';

const LADDER = [ArenaPageHead, ArenaHero, ArenaCard, ArenaUnauthCard, ArenaChartCard,
                ArenaSection, ArenaBoardColumn, ArenaEmptyState, ArenaErrorState];

@Component({
  standalone: true,
  imports: LADDER,
  template: `
    <arena-hero title="Hero" [headingLevel]="level()" />
    <arena-page-head title="Page" [headingLevel]="level()" />
    <arena-section title="Section" [headingLevel]="level()"><p>Body</p></arena-section>
    <arena-card title="Card" [headingLevel]="level()" />
    <arena-chart-card title="Chart" [headingLevel]="level()" />
    <arena-board-column title="Column" [headingLevel]="level()" />
    <arena-empty-state title="Empty" [headingLevel]="level()" />
    <arena-error-state title="Error" [headingLevel]="level()" />
    <arena-unauth-card title="Unauth" [headingLevel]="level()" />
  `,
})
class LadderHost { readonly level = signal<ArenaHeadingLevel | undefined>(undefined); }

function outline(host: Element) {
  return [...host.querySelectorAll('h1, h2, h3, h4')]
    .map((node) => `${node.tagName.toLowerCase()}:${(node.textContent ?? '').trim()}`);
}

function titleClasses(host: Element) {
  return [...host.querySelectorAll('[data-arena-part]')]
    .filter((node) => node.children.length === 0 && (node.textContent ?? '').trim() !== '')
    .map((node) => `${(node.textContent ?? '').trim()}=${node.getAttribute('class')}`);
}

test('every title takes its own rung of the ladder when nobody says otherwise', () => {
  const fixture = TestBed.createComponent(LadderHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;
    assert.deepEqual(outline(host), [
      'h1:Hero', 'h1:Page', 'h2:Section', 'h3:Card', 'h3:Column', 'h3:Empty', 'h3:Error', 'h2:Unauth',
    ], 'the default outline IS the title ladder: two page titles each certain it is the only '
     + 'one, a section over the card register, and a chart card taking no rung at all because '
     + 'a grid of tiles is not a hierarchy');
  } finally { fixture.destroy(); }
});

test('a level moves the element and nothing else', () => {
  const fixture = TestBed.createComponent(LadderHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;
    const before = titleClasses(host);

    fixture.componentInstance.level.set('h4');
    fixture.detectChanges();

    assert.deepEqual(outline(host), [
      'h4:Hero', 'h4:Page', 'h4:Section', 'h4:Card', 'h4:Chart',
      'h4:Column', 'h4:Empty', 'h4:Error', 'h4:Unauth',
    ], 'every component on the ladder answers the member, the chart card included');
    assert.deepEqual(titleClasses(host), before,
      'a rung may not reach the class, or the member is a styling surface and a style plugin '
      + 'no longer owns the register a title is drawn in');
  } finally { fixture.destroy(); }
});

test('none takes a title out of the outline where the title is optional', () => {
  const fixture = TestBed.createComponent(OptionalHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;

    assertNoNode(host.querySelector('h1, h2, h3, h4'), 'none opens no heading anywhere');
    assert.match(host.textContent ?? '', /Card/, 'and the title is still drawn');
    assert.match(host.textContent ?? '', /Chart/);
    assert.match(host.textContent ?? '', /Error/);
    assert.match(host.textContent ?? '', /Unauth/);
  } finally { fixture.destroy(); }
});

@Component({
  standalone: true,
  imports: [ArenaCard, ArenaChartCard, ArenaErrorState, ArenaUnauthCard],
  template: `
    <arena-card title="Card" headingLevel="none" />
    <arena-chart-card title="Chart" headingLevel="none" />
    <arena-error-state title="Error" headingLevel="none" />
    <arena-unauth-card title="Unauth" headingLevel="none" />
  `,
})
class OptionalHost {}

@Component({
  standalone: true,
  imports: [ArenaHero, ArenaPageHead],
  template: `
    <arena-hero title="Hero" />
    <arena-page-head title="Page" headingLevel="h2" />
  `,
})
class TopRungHost {}

test('a page carrying both page titles has one h1, and the ladder says which yields', () => {
  const fixture = TestBed.createComponent(TopRungHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;
    assert.deepEqual(outline(host), ['h1:Hero', 'h2:Page'],
      'the hero is the rung above the page head, so the hero keeps the page\'s one h1 and the '
      + 'page head is what steps down. Neither reads the page to find that out');
  } finally { fixture.destroy(); }
});

@Component({
  standalone: true,
  imports: [ArenaSection],
  template: '<arena-section title="Section" headingLevel="none"><p>Body</p></arena-section>',
})
class SectionNoneHost {}

@Component({
  standalone: true,
  imports: [ArenaHero],
  template: '<arena-hero title="Hero" headingLevel="none" />',
})
class HeroNoneHost {}

@Component({
  standalone: true,
  imports: [ArenaPageHead],
  template: '<arena-page-head title="Page" headingLevel="none" />',
})
class PageHeadNoneHost {}

@Component({
  standalone: true,
  imports: [ArenaBoardColumn],
  template: '<arena-board-column title="Column" headingLevel="none" />',
})
class ColumnNoneHost {}

@Component({
  standalone: true,
  imports: [ArenaEmptyState],
  template: '<arena-empty-state title="Empty" headingLevel="none" />',
})
class EmptyNoneHost {}

for (const [name, host] of [['ArenaHero', HeroNoneHost], ['ArenaPageHead', PageHeadNoneHost],
                            ['ArenaSection', SectionNoneHost], ['ArenaBoardColumn', ColumnNoneHost],
                            ['ArenaEmptyState', EmptyNoneHost]] as [string, unknown][]) {
  test(`${name} refuses none, because its title is required`, () => {
    const fixture = TestBed.createComponent(host as never);
    try {
      assert.throws(() => fixture.detectChanges(), /headingLevel/,
        'a title required because it names the thing it draws cannot also be told the name is not one');
    } finally { fixture.destroy(); }
  });
}
