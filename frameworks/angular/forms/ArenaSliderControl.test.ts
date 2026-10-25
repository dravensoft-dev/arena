/* The slider bound to a form: a single slider holds a number and a range a [start, end] array, a
 * move hands the form the same shape back, and null puts each thumb at its own bound. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaSlider } from '../components/forms/arena-slider/ArenaSlider';
import { ArenaSliderControl } from './ArenaSliderControl';

@Component({
  selector: 'forms-arena-slider-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaSlider, ArenaSliderControl],
  template: `<arena-slider label="Volume" [formControl]="single" /><arena-slider label="Price" range [formControl]="span" />`,
})
class Host {
  single = new FormControl<number | null>(40);
  span = new FormControl<number[] | null>([20, 60]);
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const [one, start, end] = [...root.querySelectorAll('[role="slider"]')] as HTMLElement[];
  const press = (key: string, thumb: HTMLElement) => {
    thumb.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const now = (thumb: HTMLElement) => thumb.getAttribute('aria-valuenow');
  return { fixture, host: fixture.componentInstance, root, one: one!, start: start!, end: end!, press, now };
}

test('a single slider draws the form\'s number, and a move hands the form a number', () => {
  const { fixture, host, one, press, now } = render();
  try {
    assert.equal(now(one), '40');
    press('ArrowUp', one);
    assert.equal(host.single.value, 41);
    host.single.setValue(75);
    fixture.detectChanges();
    assert.equal(now(one), '75');
  } finally { fixture.destroy(); }
});

test('a range draws the form\'s pair, and a move of either thumb hands the form the whole pair', () => {
  const { fixture, host, start, end, press, now } = render();
  try {
    assert.deepEqual([now(start), now(end)], ['20', '60']);
    press('ArrowUp', start);
    assert.deepEqual(host.span.value, [21, 60]);
    press('End', end);
    assert.deepEqual(host.span.value, [21, 100]);
  } finally { fixture.destroy(); }
});

test('null puts each thumb back at its own bound', () => {
  const { fixture, host, one, start, end, now } = render();
  try {
    host.single.setValue(null);
    host.span.setValue(null);
    fixture.detectChanges();
    assert.deepEqual([now(one), now(start), now(end)], ['0', '0', '100']);
  } finally { fixture.destroy(); }
});

test('disable() takes every thumb out of the Tab sequence, and leaving a thumb marks the control touched', () => {
  const { fixture, host, one, start } = render();
  try {
    one.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    assert.equal(host.single.touched, true);
    host.span.disable();
    fixture.detectChanges();
    assert.equal(start.getAttribute('tabindex'), '-1');
  } finally { fixture.destroy(); }
});
