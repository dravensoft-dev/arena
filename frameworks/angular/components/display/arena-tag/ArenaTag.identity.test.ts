import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaTag } from './ArenaTag';

function renderTag(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(ArenaTag);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

test('a colorId renders its slot as an attribute and writes no custom property', () => {
  const host = renderTag({ colorId: 3 });
  assert.equal(host.getAttribute('data-arena-color-id'), '3');
  assert.equal(host.style.getPropertyValue('--arena-tag-cat'), '');
  assert.equal(host.getAttribute('style'), null);
});

test('a colorId replaces the tone rather than joining it, so one colour reaches the pill', () => {
  const host = renderTag({ tone: 'danger', colorId: 5 });
  assert.equal(host.getAttribute('data-arena-color-id'), '5');
  assert.equal(host.getAttribute('data-arena-tone'), 'neutral');
});

test('a colorId outside 1..8 or not an integer renders the slot the ramp clamps to', () => {
  assert.equal(renderTag({ colorId: 9 }).getAttribute('data-arena-color-id'), '8');
  assert.equal(renderTag({ colorId: 2.6 }).getAttribute('data-arena-color-id'), '3');
});

test('no colorId leaves the tone alone and renders no colour id', () => {
  const host = renderTag({ tone: 'warning' });
  assert.equal(host.getAttribute('data-arena-tone'), 'warning');
  assert.equal(host.getAttribute('data-arena-color-id'), null);
  assert.equal(host.style.getPropertyValue('--arena-tag-cat'), '');
});
