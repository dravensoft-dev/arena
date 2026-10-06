/* The Angular half of the boundary sweep: the same derived cases, rendered through the template
 * the playground generator writes for a fixture node, compiled at runtime with every component
 * and projection marker it names. The rule each case is held to is read from the shared module
 * every layer's suite applies. */
import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import '@angular/compiler';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as ArenaNg from '../index';
import { LIB, REPO } from './Compliance';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog';
import { ArenaConfirmDialog } from '../components/feedback/arena-confirm-dialog/ArenaConfirmDialog';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';
import { ArenaToastHost } from '../components/feedback/arena-toast-host/ArenaToastHost';
import { ArenaMenu } from '../components/navigation/arena-menu/ArenaMenu';
import { ArenaTooltip } from '../components/feedback/arena-tooltip/ArenaTooltip';
import { ArenaButton } from '../components/forms/arena-button/ArenaButton';

const cases = await import(pathToFileURL(join(LIB, 'arena', 'boundary-cases.ts')).href);
const playgrounds = await import(pathToFileURL(join(REPO, 'scripts', 'generate', 'arena', 'generate-playgrounds.ts')).href);
const angular = await import(pathToFileURL(join(LIB, 'angular', 'playground-angular.ts')).href);

const places = playgrounds.loadPlaces(REPO);
const contracts = playgrounds.loadContracts(REPO);
const tags = angular.componentTags(playgrounds.loadAngularSources(REPO, places));
const markers = angular.markerNames(readFileSync(join(REPO, angular.MARKERS_SOURCE), 'utf8'));
const registry = ArenaNg as unknown as Record<string, Type<unknown>>;

function host(node: unknown): Type<unknown> {
  const fields = angular.collectFields(node, contracts, [], 'f');
  const imports = new Set<string>();
  const template = angular.renderNode(node, places, fields, markers, tags, 0, imports);
  const resolved = [...imports].map((name) => {
    const found = registry[name];
    if (!found) throw new Error(`${name} is not exported by the Angular barrel`);
    return found;
  });
  class Host {}
  for (const field of fields as { name: string; value: unknown }[])
    (Host.prototype as Record<string, unknown>)[field.name] = field.value;
  return Component({ standalone: true, imports: resolved, template })(Host) as Type<unknown>;
}

const all = cases.boundaryCases(REPO);
const spent = new Set<string>();

test('the sweep found slots to measure', () => {
  assert.ok(all.length > 0, 'derived no case; an empty sweep is a failure, not a clean pass');
});

for (const kase of all) {
  test(`${kase.label}: every slot it projects is a boundary or declared transparent`, () => {
    const fixture = TestBed.createComponent(host(kase.node));
    try {
      fixture.detectChanges();
      if (kase.press) {
        (fixture.nativeElement.querySelector(kase.press) as HTMLElement | null)?.click();
        fixture.detectChanges();
      }
      const { problems, spent: used } = cases.siteProblems(kase, cases.readSites(fixture.nativeElement, kase), 'angular');
      for (const key of used) spent.add(key);
      assert.deepEqual(problems, []);
    } finally {
      fixture.destroy();
    }
  });
}

test('every transparent slot is one a render projected into', () => {
  assert.deepEqual(cases.staleTransparentProblems(all, spent, 'angular'), []);
});

const FLOATING: Record<string, string> = {
  'arena-dialog': 'scrim', 'arena-confirm-dialog': 'root', 'arena-sheet': 'root', 'arena-onboarding': 'root',
  'arena-command-palette': 'root', 'arena-toast-host': 'root', 'arena-menu': 'panel', 'arena-tooltip': 'bubble',
};

test('every floating slot of a T9 component carries data-arena-surface="floating"', () => {
  @Component({
    standalone: true,
    imports: [ArenaDialog, ArenaConfirmDialog, ArenaSheet, ArenaOnboarding, ArenaCommandPalette, ArenaToastHost, ArenaMenu, ArenaTooltip, ArenaButton],
    template: `
      <arena-dialog [open]="true" title="T" label="L"><p>x</p></arena-dialog>
      <arena-confirm-dialog [open]="true" title="T" />
      <arena-sheet [open]="true" title="S"><p>x</p></arena-sheet>
      <arena-onboarding [open]="true" [steps]="[]" />
      <arena-command-palette [open]="true" [commands]="[]" />
      <arena-toast-host />
      <arena-menu [items]="[]"><arena-button trigger>Open</arena-button></arena-menu>
      <arena-tooltip label="Copy"><arena-button>Copy</arena-button></arena-tooltip>
    `,
  })
  class Surfaces {}
  const fixture = TestBed.createComponent(Surfaces);
  try {
    fixture.detectChanges();
    const root = fixture.nativeElement as Element;
    (root.querySelector('arena-menu button') as HTMLElement).click();
    root.querySelector('arena-tooltip button')?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    for (const [tag, slot] of Object.entries(FLOATING)) {
      const component = root.querySelector(tag) as HTMLElement | null;
      assert.ok(component, `${tag} did not render`);
      const surface = slot === 'root' || slot === 'scrim' ? component : document.querySelector(`[data-arena-part="${tag.slice(6)}.${slot}"]`);
      assert.ok(surface, `${tag} has no ${slot}`);
      assert.equal(surface.getAttribute('data-arena-surface'), 'floating', `${tag} ${slot}`);
    }
  } finally {
    fixture.destroy();
  }
});
