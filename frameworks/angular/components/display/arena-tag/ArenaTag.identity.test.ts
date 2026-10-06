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

test('a colorId draws the identity arm and carries the ramp colour as a custom property', () => {
  const host = renderTag({ colorId: 3 });
  assert.equal(host.getAttribute('data-arena-tone'), 'identity');
  assert.equal(host.style.getPropertyValue('--arena-tag-cat'), 'var(--color-cat-3)');
});

test('a colorId replaces the tone rather than joining it, so one colour reaches the pill', () => {
  const host = renderTag({ tone: 'danger', colorId: 5 });
  assert.equal(host.getAttribute('data-arena-tone'), 'identity');
  assert.notEqual(host.getAttribute('data-arena-tone'), 'danger');
});

test('no colorId leaves the tone alone and writes no custom property', () => {
  const host = renderTag({ tone: 'warning' });
  assert.equal(host.getAttribute('data-arena-tone'), 'warning');
  assert.equal(host.style.getPropertyValue('--arena-tag-cat'), '');
});
