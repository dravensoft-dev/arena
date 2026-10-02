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
import { ArenaCard } from '../components/display/arena-card/ArenaCard';
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
      imports: [ArenaButton, ArenaTooltip, ArenaMenu, ArenaCard],
      template: `<div class="${kase.container}">${TEMPLATES[kase.name]}</div>`,
    })(class {});
    const fixture = TestBed.createComponent(Host);
    try {
      fixture.detectChanges();
      const container = (fixture.nativeElement as Element).firstElementChild!;
      const subject = [...container.querySelectorAll('[data-arena-part="button"]')].at(-1) ?? null;
      const tree = proximity.normalize(container, vocabulary, subject);
      assert.deepEqual(tree, kase.angular, `recorded tree for ${kase.name}:\n${JSON.stringify(tree)}`);
    } finally {
      fixture.destroy();
    }
  });
}
