/* The active row is drawn filled, and Arena applies its own convention rather than asking for
 * it: a consumer otherwise concatenates ph-fill against ph-bold per row, which is the icon
 * convention reimplemented once per project. The swap is idempotent, so a caller who already
 * passes ph-fill gets exactly what they passed. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ArenaSideNav } from '../arena-side-nav/ArenaSideNav';
import { ArenaSideNavItem } from './ArenaSideNavItem';
import { arenaActiveWeight } from '../../../NavRow';

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavItem],
  template: `
    <arena-side-nav ariaLabel="Primary" [active]="active">
      <arena-side-nav-item id="home" label="Home" icon="ph-bold ph-house" />
      <arena-side-nav-item id="sales" label="Sales" icon="ph-bold ph-receipt" />
    </arena-side-nav>
  `,
})
class NavHost { active = 'home'; }

function render(active: string): ComponentFixture<NavHost> {
  const fixture = TestBed.createComponent(NavHost);
  fixture.componentInstance.active = active;
  fixture.detectChanges();
  return fixture;
}

test('arenaActiveWeight swaps the weight it finds, adds one where there is none, and repeats safely', () => {
  assert.equal(arenaActiveWeight('ph-bold ph-house'), 'ph-fill ph-house');
  assert.equal(arenaActiveWeight('ph-thin ph-house'), 'ph-fill ph-house');
  assert.equal(arenaActiveWeight('ph-house'), 'ph-fill ph-house');
  assert.equal(arenaActiveWeight('ph-fill ph-house'), 'ph-fill ph-house',
    'a caller who already asked for fill gets exactly what they passed');
  assert.equal(arenaActiveWeight(arenaActiveWeight('ph-bold ph-house')), 'ph-fill ph-house');
});

test('the active row is filled and every other row keeps the weight it was given', () => {
  const fixture = render('home');
  try {
    const glyphs = [...(fixture.nativeElement as Element).querySelectorAll('i')];
    assert.equal(glyphs.length, 2);
    assert.match(glyphs[0]!.className, /\bph-fill\b/, 'the active row draws its glyph filled');
    assert.doesNotMatch(glyphs[0]!.className, /\bph-bold\b/, 'and carried the bold weight');
    assert.match(glyphs[1]!.className, /\bph-bold\b/, 'an inactive row is untouched');
    assert.doesNotMatch(glyphs[1]!.className, /\bph-fill\b/);
  } finally { fixture.destroy(); }
});

test('moving `active` moves the fill, so nothing is latched at first render', () => {
  const fixture = render('sales');
  try {
    const glyphs = [...(fixture.nativeElement as Element).querySelectorAll('i')];
    assert.doesNotMatch(glyphs[0]!.className, /\bph-fill\b/);
    assert.match(glyphs[1]!.className, /\bph-fill\b/);
  } finally { fixture.destroy(); }
});
