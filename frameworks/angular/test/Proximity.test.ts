/* Each proximity case rendered in Angular and normalised to the tree the gate measures, held equal
 * to the fixture. A null tree is a case not yet recorded: the suite fails printing the tree it
 * rendered, which is read against the case's intent before it is pasted into the fixture. The
 * subject is the last drawn button in each case. */
import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import '@angular/compiler';
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaButton } from '../components/forms/arena-button/ArenaButton';
import { ArenaTooltip } from '../components/feedback/arena-tooltip/ArenaTooltip';
import { ArenaMenu } from '../components/navigation/arena-menu/ArenaMenu';
import { ArenaIconButton } from '../components/forms/arena-icon-button/ArenaIconButton';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog';
import { ArenaAppLogo } from '../components/brand/arena-app-logo/ArenaAppLogo';
import { ArenaPeopleList } from '../components/display/arena-people-list/ArenaPeopleList';
import { ArenaPersonRow } from '../components/display/arena-person-row/ArenaPersonRow';
import { ArenaCard } from '../components/display/arena-card/ArenaCard';
import { ArenaBadge } from '../components/display/arena-badge/ArenaBadge';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet';
import { ArenaGrid } from '../components/layout/arena-grid/ArenaGrid';
import { ArenaScroller } from '../components/layout/arena-scroller/ArenaScroller';
import { ArenaScrollerItem } from '../components/layout/arena-scroller-item/ArenaScrollerItem';
import { ArenaSkeleton } from '../components/display/arena-skeleton/ArenaSkeleton';
import { ArenaTag } from '../components/display/arena-tag/ArenaTag';
import { ArenaFooter } from '../ProjectionMarkers';
import { LIB } from './Compliance';

const proximity = await import(pathToFileURL(join(LIB, 'arena', 'proximity.ts')).href);

const TEMPLATES: Record<string, string> = {
  'class-on-component-beats-ancestor': '<arena-button class="arena-fill">Save</arena-button>',
  'nearer-fit-beats-ancestor-fill': '<arena-button class="arena-fit">Save</arena-button>',
  'class-on-tooltip-reaches-its-trigger': '<arena-tooltip class="arena-fill" label="Copy"><arena-button>Save</arena-button></arena-tooltip>',
  'class-on-menu-reaches-its-trigger': '<arena-menu class="arena-fill" [items]="[]"><arena-button trigger>Save</arena-button></arena-menu>',
  'ancestor-reaches-through-the-transparent-trigger': '<arena-tooltip label="Copy"><arena-button>Save</arena-button></arena-tooltip>',
  'class-on-trigger-alone-fills-the-wrapper-box': '<arena-tooltip label="Copy"><arena-button class="arena-fill">Save</arena-button></arena-tooltip>',
  'box-class-stops-at-a-boundary': '<arena-card><arena-button>Save</arena-button></arena-card>',
  'context-class-crosses-a-boundary': '<arena-card><arena-button>Save</arena-button></arena-card>',
  'box-channel-stays-out-of-content': '<arena-card><arena-button>Save</arena-button></arena-card>',
  'option-not-answered-stays-out': '<div class="arena-optwitness-b"><arena-button>Save</arena-button></div>',
  'size-reaches-the-toolbar': '<arena-button>Save</arena-button><arena-button>Cancel</arena-button><arena-icon-button icon="ph-bold ph-plus" label="Add" />'
    + '<arena-dialog [open]="true" title="Discard"><arena-button footer>Confirm</arena-button></arena-dialog>',
  'nearer-size-wins': '<arena-button>Save</arena-button><arena-button class="arena-size-lg">Cancel</arena-button><arena-icon-button icon="ph-bold ph-plus" label="Add" />',
  'size-option-not-answered': '<div class="arena-size-xl"><arena-button>Save</arena-button><arena-app-logo name="Draven" /></div>',
  'size-re-densifies-in-compact': '<arena-button class="arena-size-sm">Save</arena-button>',
  'size-re-densifies-in-compact-under-the-size': '<div class="arena-compact"><arena-button>Save</arena-button></div>',
  'size-re-densifies-in-comfortable': '<arena-button class="arena-size-sm">Save</arena-button>',
  'size-re-densifies-in-comfortable-under-the-size': '<div class="arena-comfortable"><arena-button>Save</arena-button></div>',
  'people-list-face-follows-the-list': '<arena-people-list class="arena-size-lg" label="Standings"><arena-person-row name="Ines Marchetti" /></arena-people-list>',
  'meaning-follows-the-base': '<arena-button destructive>Delete</arena-button><arena-button>Save</arena-button>',
  'meaning-wins-over-accent': '<arena-badge class="arena-accent-gold" tone="success">Paid</arena-badge>',
  'accent-stops-at-the-card-body': '<arena-card class="arena-accent-primary"><arena-tag>Draft</arena-tag></arena-card>',
  'placement-stops-at-the-sheet-body': '<arena-sheet [open]="true" title="Outer"><arena-sheet [open]="true" title="Inner" /></arena-sheet>',
  'grid-min-reaches-the-grid': '<div style="display: contents; --arena-grid-min: 300px"><arena-grid><arena-card title="A" /></arena-grid></div>',
  'grid-min-stops-at-the-card-content': '<div style="display: contents; --arena-grid-min: 300px"><arena-grid><arena-card title="A"><arena-grid /></arena-card></arena-grid></div>',
  'grid-min-stops-at-a-lone-card-body': '<div style="display: contents; --arena-grid-min: 300px"><arena-card title="A"><arena-grid /></arena-card></div>',
  'grid-min-class-beats-the-property': '<div style="display: contents; --arena-grid-min: 300px"><arena-grid class="arena-grid-min-sm"><arena-card title="A" /></arena-grid></div>',
  'scroller-class-reaches-its-items': '<arena-scroller class="arena-scroller-item-sm" label="Lots"><arena-scroller-item /></arena-scroller>',
  'skeleton-circle-takes-its-width-as-diameter': '<div style="--arena-skeleton-width: 64px"><arena-skeleton class="arena-skeleton-circle" /></div>',
  'skeleton-circle-height-wins': '<div style="--arena-skeleton-width: 40px; --arena-skeleton-height: 64px"><arena-skeleton class="arena-skeleton-circle" /></div>',
  'skeleton-radius-is-read-by-block-only': '<div style="--arena-skeleton-radius: 12px"><arena-skeleton class="arena-skeleton-line" /></div>',
};

const BARE = new Set(['meaning-wins-over-accent', 'accent-stops-at-the-card-body']);
const SUBJECT: Record<string, { part: string; index: number }> = {
  'people-list-face-follows-the-list': { part: 'avatar.box', index: -1 },
  'meaning-follows-the-base': { part: 'button', index: 0 },
  'meaning-wins-over-accent': { part: 'badge', index: -1 },
  'accent-stops-at-the-card-body': { part: 'card', index: -1 },
  'placement-stops-at-the-sheet-body': { part: 'sheet', index: 0 },
  'grid-min-reaches-the-grid': { part: 'grid', index: 0 },
  'grid-min-stops-at-the-card-content': { part: 'grid', index: -1 },
  'grid-min-stops-at-a-lone-card-body': { part: 'grid', index: 0 },
  'grid-min-class-beats-the-property': { part: 'grid', index: 0 },
  'scroller-class-reaches-its-items': { part: 'scroller-item', index: 0 },
  'skeleton-circle-takes-its-width-as-diameter': { part: 'skeleton', index: 0 },
  'skeleton-circle-height-wins': { part: 'skeleton', index: 0 },
  'skeleton-radius-is-read-by-block-only': { part: 'skeleton', index: 0 },
};

const { families, cases } = proximity.readProximity();
const vocabulary = proximity.vocabularyClasses(families);

test('every case has an Angular template, and every template a case', () => {
  assert.deepEqual(Object.keys(TEMPLATES).sort(), cases.map((one: { name: string }) => one.name).sort());
});

for (const kase of cases) {
  test(`${kase.name}: Angular renders the tree the gate measures`, () => {
    const Host = Component({
      standalone: true,
      imports: [ArenaButton, ArenaTooltip, ArenaMenu, ArenaCard, ArenaIconButton, ArenaDialog, ArenaAppLogo, ArenaPeopleList, ArenaPersonRow, ArenaFooter, ArenaBadge, ArenaTag, ArenaSheet, ArenaGrid, ArenaScroller, ArenaScrollerItem, ArenaSkeleton],
      template: BARE.has(kase.name) ? TEMPLATES[kase.name] : `<div class="${kase.container}">${TEMPLATES[kase.name]}</div>`,
    })(class {});
    const fixture = TestBed.createComponent(Host);
    try {
      fixture.detectChanges();
      fixture.detectChanges();
      const container = (fixture.nativeElement as Element).firstElementChild!;
      const { part, index } = SUBJECT[kase.name] ?? { part: 'button', index: -1 };
      const drawn = [...(container.matches(`[data-arena-part="${part}"]`) ? [container] : []), ...container.querySelectorAll(`[data-arena-part="${part}"]`)];
      const subject = drawn.at(index) ?? null;
      const tree = proximity.normalize(container, vocabulary, subject);
      assert.deepEqual(tree, kase.angular, `recorded tree for ${kase.name}:\n${JSON.stringify(tree)}`);
    } finally {
      fixture.destroy();
    }
  });
}
