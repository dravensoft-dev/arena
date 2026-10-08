/* The render matrix of the skeleton. Each case name is stable so a second layer can repeat the
 * case one for one. The geometry of a shape is CSS and is measured by the proximity case, not here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { useTestEnvironment } from '../../../test/TestbedEnv';
import { ArenaSkeleton } from './ArenaSkeleton';

useTestEnvironment();

function mount(template: string) {
  const Host = Component({ standalone: true, imports: [ArenaSkeleton], template })(class { readonly nan = NaN; readonly infinity = Infinity; });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture;
}

const parts = (c: HTMLElement, part: string) => [...c.querySelectorAll<HTMLElement>(`[data-arena-part="${part}"]`)];
const lastFlags = (lines: HTMLElement[]) => lines.map((l) => l.hasAttribute('data-arena-last'));

test('matrix: no lines is one skeleton part with no style', () => {
  const fixture = mount('<arena-skeleton />');
  const c = fixture.nativeElement as HTMLElement;
  const root = parts(c, 'skeleton');
  assert.equal(root.length, 1);
  assert.equal(root[0]!.getAttribute('role'), 'status');
  assert.equal(root[0]!.hasAttribute('style'), false);
  assert.equal(parts(c, 'skeleton.stack').length, 0);
  assert.equal(parts(c, 'skeleton.line').length, 0);
  fixture.destroy();
});

test('matrix: lines of 3 is a stack of three lines, exactly the last carrying data-arena-last', () => {
  const fixture = mount('<arena-skeleton [lines]="3" />');
  const c = fixture.nativeElement as HTMLElement;
  assert.equal(parts(c, 'skeleton').length, 0);
  const stack = parts(c, 'skeleton.stack');
  assert.equal(stack.length, 1);
  assert.equal(stack[0]!.getAttribute('role'), 'status');
  assert.equal(stack[0]!.hasAttribute('style'), false);
  assert.deepEqual(lastFlags(parts(c, 'skeleton.line')), [false, false, true]);
  fixture.destroy();
});

test('matrix: lines of 1 is a stack of one line without data-arena-last', () => {
  const fixture = mount('<arena-skeleton [lines]="1" />');
  const c = fixture.nativeElement as HTMLElement;
  assert.equal(parts(c, 'skeleton').length, 0);
  assert.equal(parts(c, 'skeleton.stack').length, 1);
  assert.deepEqual(lastFlags(parts(c, 'skeleton.line')), [false]);
  fixture.destroy();
});

test('matrix: lines of 0 is an empty stack that still has role=status', () => {
  const fixture = mount('<arena-skeleton [lines]="0" />');
  const c = fixture.nativeElement as HTMLElement;
  const stack = parts(c, 'skeleton.stack');
  assert.equal(stack.length, 1);
  assert.equal(stack[0]!.getAttribute('role'), 'status');
  assert.equal(parts(c, 'skeleton.line').length, 0);
  fixture.destroy();
});

test('matrix: lines of NaN is an empty stack that still has role=status', () => {
  const fixture = mount('<arena-skeleton [lines]="nan" />');
  const c = fixture.nativeElement as HTMLElement;
  const stack = parts(c, 'skeleton.stack');
  assert.equal(stack.length, 1);
  assert.equal(stack[0]!.getAttribute('role'), 'status');
  assert.equal(parts(c, 'skeleton.line').length, 0);
  fixture.destroy();
});

test('matrix: lines of Infinity is an empty stack that still has role=status', () => {
  const fixture = mount('<arena-skeleton [lines]="infinity" />');
  const c = fixture.nativeElement as HTMLElement;
  const stack = parts(c, 'skeleton.stack');
  assert.equal(stack.length, 1);
  assert.equal(stack[0]!.getAttribute('role'), 'status');
  assert.equal(parts(c, 'skeleton.line').length, 0);
  fixture.destroy();
});

test('matrix: the circle class is on the root', () => {
  const fixture = mount('<arena-skeleton class="arena-skeleton-circle" />');
  const c = fixture.nativeElement as HTMLElement;
  const root = parts(c, 'skeleton');
  assert.equal(root.length, 1);
  assert.ok(root[0]!.classList.contains('arena-skeleton-circle'));
  assert.equal(root[0]!.hasAttribute('style'), false);
  fixture.destroy();
});

test('matrix: the circle class with lines of 2 is on the stack', () => {
  const fixture = mount('<arena-skeleton class="arena-skeleton-circle" [lines]="2" />');
  const c = fixture.nativeElement as HTMLElement;
  const stack = parts(c, 'skeleton.stack');
  assert.equal(stack.length, 1);
  assert.ok(stack[0]!.classList.contains('arena-skeleton-circle'));
  assert.deepEqual(lastFlags(parts(c, 'skeleton.line')), [false, true]);
  for (const line of parts(c, 'skeleton.line')) assert.equal(line.classList.contains('arena-skeleton-circle'), false);
  fixture.destroy();
});
