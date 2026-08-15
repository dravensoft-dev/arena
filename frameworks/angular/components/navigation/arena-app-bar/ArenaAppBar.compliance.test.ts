/* The `banner` pattern asks for one thing, the landmark, and assertPattern reads it off the
 * element. What it cannot say is that the bar adds nothing else: no anchor of its own, no
 * navigation landmark it would have to name for the consumer, and no tab stop. Those are the
 * hand assertions, and they are the claims the binding is worth having. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaAppBar } from './ArenaAppBar';
import { ArenaActions, ArenaBrand, ArenaNav } from '../../../ProjectionMarkers';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { assertNoNode } from '../../../test/NodeAssert';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-app-bar/ArenaAppBar.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaAppBar, ArenaBrand, ArenaNav, ArenaActions],
  template: `
    <arena-app-bar [sticky]="sticky">
      <span brand>Meridian</span>
      @if (withNav) { <span nav>Shop</span> }
      @if (withActions) { <span actions>Basket</span> }
    </arena-app-bar>
  `,
})
class BarHost {
  sticky = true;
  withNav = true;
  withActions = true;
}

function render(patch: Partial<BarHost> = {}) {
  const fixture = TestBed.createComponent(BarHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

const headerOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('header') as HTMLElement;

test('arena-app-bar is the banner landmark it binds', () => {
  const fixture = render();
  try {
    const header = headerOf(fixture);
    assert.ok(header, 'the component renders no header element at all');
    assert.equal(header.getAttribute('role'), null,
      'a redundant role on a header is a second statement of the same fact');

    assertPattern({ root: header, bindingPath: BINDING, subjects: { default: header } });
  } finally { fixture.destroy(); }
});

test('the bar draws no anchor and no navigation landmark of its own', () => {
  const fixture = render();
  try {
    const header = headerOf(fixture);
    assertNoNode(header.querySelector('a'),
      'a router link belongs in the brand slot, never in a component that would have to swallow it');
    assertNoNode(header.querySelector('nav'),
      'a page with a side nav has two navigation landmarks, and naming them apart is the consumer\'s');
  } finally { fixture.destroy(); }
});

test('the bar adds no tab stop, because everything reachable in it came from a slot', () => {
  const fixture = render();
  try {
    const header = headerOf(fixture);
    assert.equal(header.querySelectorAll('[tabindex]').length, 0);
    for (const el of [header, ...Array.from(header.querySelectorAll('*'))]) {
      assert.equal(isFocusable(el as Element), false,
        `<${el.tagName.toLowerCase()}> inside the bar is reachable by keyboard, so a user tabs to something inert`);
    }
  } finally { fixture.destroy(); }
});

test('the band stops at the page width while the bar spans', () => {
  const fixture = render();
  try {
    const band = headerOf(fixture).firstElementChild as HTMLElement;
    assert.equal(band.style.getPropertyValue('max-width'), 'var(--container-max)',
      'the width has to arrive as a role, or a style plugin cannot re-answer how wide a page is');
    assert.equal(headerOf(fixture).style.getPropertyValue('max-width'), '',
      'the bar itself must span, or the fill and the hairline stop short of the viewport');
  } finally { fixture.destroy(); }
});

test('a slot that is not filled draws no wrapper for it', () => {
  const fixture = render({ withNav: false, withActions: false });
  try {
    assert.equal((headerOf(fixture).firstElementChild as HTMLElement).children.length, 1);
  } finally { fixture.destroy(); }
});
