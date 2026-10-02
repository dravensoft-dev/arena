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
