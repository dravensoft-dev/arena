/* A slot whose manifest carries a group renders that group's data-arena attribute wherever the
 * component draws the slot: every template element that takes the slot's class is held to bind
 * the slot's $data on the same tag, a slot drawn elsewhere to read its $data in the source, and
 * four real renders are read back. unboundDraws is the scan, and a source missing a binding
 * fails it. */
import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from './NodeAssert';
import { ANGULAR_COMPONENTS } from './Compliance';
import { ArenaBadge } from '../components/display/arena-badge/ArenaBadge';
import { ArenaAlert } from '../components/feedback/arena-alert/ArenaAlert';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog';
import { ArenaSwitch } from '../components/forms/arena-switch/ArenaSwitch';

interface Classes { attributes?: Record<string, string[]> }

function primitiveSources(): string[] {
  return readdirSync(ANGULAR_COMPONENTS, { withFileTypes: true })
    .filter((category) => category.isDirectory())
    .flatMap((category) => readdirSync(join(ANGULAR_COMPONENTS, category.name), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => readdirSync(join(ANGULAR_COMPONENTS, category.name, entry.name))
        .filter((file) => /^Arena[A-Za-z]+\.ts$/.test(file))
        .map((file) => join(ANGULAR_COMPONENTS, category.name, entry.name, file))));
}

export function unboundDraws(source: string, slot: string): string[] {
  const draws = [...source.matchAll(/\[class\]="([^"]*)"/g)].filter((m) => new RegExp(`(?<!\\$data)\\.${slot}\\(`).test(m[1] ?? ''));
  return draws.flatMap((draw) => {
    const start = source.lastIndexOf('<', draw.index);
    const tag = source.slice(start, source.indexOf('>', (draw.index ?? 0) + draw[0].length));
    return new RegExp(`\\$data\\.${slot}\\(`).test(tag) || /\[arenaSlotData\]="(?![^"]*\$data\.)/.test(tag) ? [] : [tag.replace(/\s+/g, ' ').slice(0, 120)];
  });
}

test('a template element that draws a slot with a group and does not bind it is reported', () => {
  const bound = '<span [class]="styles().dot()" [arenaSlotData]="styles().$data.dot()" [attr.data-arena-part]="parts.dot"></span>';
  const missing = '<span aria-hidden="true" [class]="styles().dot()" [attr.data-arena-part]="parts.dot"></span>';
  assert.deepEqual(unboundDraws(bound, 'dot'), []);
  assert.equal(unboundDraws(missing, 'dot').length, 1);
  assert.equal(unboundDraws(`${bound}\n${missing}`, 'dot').length, 1, 'one bound element hides an unbound one');
  assert.equal(unboundDraws('<i [class]="styles().$data.dot()"></i>', 'dot').length, 0, 'a $data read is not a draw');
});

test('every component binds the attributes of each slot it draws that its manifest gives a group', async () => {
  const sources = primitiveSources();
  assert.ok(sources.length > 0, 'no primitive sources found -- the guard would silently check nothing');
  let bound = 0;
  for (const path of sources) {
    const source = readFileSync(path, 'utf8');
    const imported = source.match(/from '(\.[^']*\.classes\.generated)'/);
    if (!imported) continue;
    const manifest = (await import(pathToFileURL(resolve(dirname(path), `${imported[1]}.ts`)).href)).default as Classes;
    const slots = new Set(Object.values(manifest.attributes ?? {}).flat());
    for (const slot of slots) {
      if (!new RegExp(`styles(\\(\\))?\\.${slot}\\(`).test(source) && !new RegExp(`Styles\\([^)]*\\)\\.${slot}\\(`).test(source)) continue;
      bound += 1;
      assert.deepEqual(unboundDraws(source, slot), [], `${path}: draws the "${slot}" slot, which carries groups, on an element that does not bind its $data`);
      assert.match(source, new RegExp(`\\$data\\.${slot}\\(`), `${path}: draws the "${slot}" slot, which carries groups, and never reads its $data`);
    }
  }
  assert.ok(bound > 0, 'no slot with a group was found -- the guard would silently check nothing');
});

test('a host-bound slot renders its attribute on the host', () => {
  const fixture = TestBed.createComponent(ArenaBadge);
  fixture.componentRef.setInput('tone', 'danger');
  fixture.detectChanges();
  assert.equal((fixture.nativeElement as HTMLElement).getAttribute('data-arena-tone'), 'danger');
  fixture.componentRef.setInput('tone', 'gold');
  fixture.detectChanges();
  assert.equal((fixture.nativeElement as HTMLElement).getAttribute('data-arena-tone'), 'gold');
});

test('a template slot renders its attribute through the directive', () => {
  const fixture = TestBed.createComponent(ArenaAlert);
  fixture.componentRef.setInput('tone', 'success');
  fixture.componentRef.setInput('title', 'Saved');
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  assert.equal(host.getAttribute('data-arena-tone'), 'success');
  assert.equal(host.querySelector('i')?.getAttribute('data-arena-tone'), 'success');
  assert.equal(host.querySelector('[data-arena-part="alert.message"]')?.hasAttribute('data-arena-titled'), true);
});

test('a host that binds the scrim renders the scrim\'s attributes', () => {
  const fixture = TestBed.createComponent(ArenaDialog);
  fixture.componentRef.setInput('title', 'Edit');
  fixture.componentRef.setInput('open', false);
  fixture.detectChanges();
  assert.equal((fixture.nativeElement as HTMLElement).hasAttribute('data-arena-open'), false);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  assert.equal((fixture.nativeElement as HTMLElement).getAttribute('data-arena-open'), '');
});

test('the switch renders its state as an attribute on the slots that carry it and no orientation or size', () => {
  const fixture = TestBed.createComponent(ArenaSwitch);
  fixture.componentRef.setInput('label', 'Notify');
  fixture.componentRef.setInput('state', true);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  assert.equal(host.querySelector('[role="switch"]')?.getAttribute('data-arena-state'), '', 'the track does not carry the on state');
  assertNoNode(host.querySelector('[data-arena-orientation]'), 'an element still carries the orientation');
  assertNoNode(host.querySelector('[data-arena-size]'), 'an element still carries the size');
});
