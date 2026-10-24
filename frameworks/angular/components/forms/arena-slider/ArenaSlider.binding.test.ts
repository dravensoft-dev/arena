/* A form directive binds the slider through ArenaControlBinding: the drawn number is the form's, a
 * move reaches the form as a number, or as a two-number array in range mode, and binding value as
 * well is warned once. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaSlider } from './ArenaSlider';

function warnings(run: () => void): string[] {
  const saved = console.warn;
  const heard: string[] = [];
  console.warn = (message: string) => { heard.push(message); };
  try { run(); } finally { console.warn = saved; }
  return heard;
}

function render(range = false) {
  const fixture = TestBed.createComponent(ArenaSlider);
  fixture.componentRef.setInput('label', 'Volume');
  fixture.componentRef.setInput('range', range);
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const thumbs = () => [...(fixture.nativeElement as HTMLElement).querySelectorAll('[role="slider"]')] as HTMLElement[];
  const press = (key: string, thumb: HTMLElement) => {
    thumb.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  return { fixture, binding, thumbs, press };
}

test('while bound, the slider draws the binding\'s number, ignores its own and warns once', () => {
  forgetArenaWarnings();
  const { fixture, binding, thumbs } = render();
  try {
    const heard = warnings(() => {
      fixture.componentRef.setInput('value', 7);
      binding.bound.set(true);
      binding.value.set(12);
      fixture.detectChanges();
    });
    assert.equal(heard.length, 1);
    assert.match(heard[0] ?? '', /ArenaSlider: `value` is bound while a form directive binds the same control/);
    assert.equal(thumbs()[0]!.getAttribute('aria-valuenow'), '12');
  } finally { fixture.destroy(); }
});

test('while bound, a move hands the form a number, and the outputs still fire', () => {
  const { fixture, binding, thumbs, press } = render();
  try {
    const reported: unknown[] = [];
    const emitted: unknown[] = [];
    binding.bound.set(true);
    binding.value.set(3);
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.change.subscribe((value: unknown) => emitted.push(value));
    fixture.detectChanges();
    press('ArrowUp', thumbs()[0]!);
    assert.deepEqual(reported, [4]);
    assert.deepEqual(emitted, [4]);
  } finally { fixture.destroy(); }
});

test('in range mode the form holds both ends as an array, and a move of either reports the pair', () => {
  const { fixture, binding, thumbs, press } = render(true);
  try {
    const reported: unknown[] = [];
    binding.bound.set(true);
    binding.value.set([20, 60]);
    binding.onChange = (value) => reported.push(value);
    fixture.detectChanges();
    assert.deepEqual(thumbs().map((one) => one.getAttribute('aria-valuenow')), ['20', '60']);
    press('ArrowUp', thumbs()[0]!);
    press('ArrowDown', thumbs()[1]!);
    assert.deepEqual(reported, [[21, 60], [21, 59]]);
  } finally { fixture.destroy(); }
});

test('the binding\'s disabled state takes every thumb out of the Tab sequence', () => {
  const { fixture, binding, thumbs } = render(true);
  try {
    binding.disabled.set(true);
    fixture.detectChanges();
    for (const thumb of thumbs()) assert.equal(thumb.getAttribute('tabindex'), '-1');
  } finally { fixture.destroy(); }
});

@Component({
  selector: 'slider-controlled-host',
  standalone: true,
  imports: [ArenaSlider],
  template: `<arena-slider label="Volume" [min]="0" [max]="100" [step]="1" [value]="value()" (change)="value.set($event)" />`,
})
class ControlledHost { readonly value = signal(20); }

test('a controlled slider keeps both of two key steps made before the host re-renders', () => {
  const fixture = TestBed.createComponent(ControlledHost);
  fixture.detectChanges();
  try {
    const thumb = (fixture.nativeElement as HTMLElement).querySelector('[role="slider"]') as HTMLElement;
    for (let i = 0; i < 2; i += 1) thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    assert.equal(fixture.componentInstance.value(), 22);
  } finally { fixture.destroy(); }
});
