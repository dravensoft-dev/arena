/* `none` requires nothing, so assertPattern alone would pass over a hero that had grown a role
 * or a landmark. The claim the binding makes is that this is content rather than the furniture
 * around it, which means no `banner`, and that is what the hand assertions check along with the
 * guard: a required member is enforced at runtime rather than only declared, and only a render
 * sees that. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaHero } from './ArenaHero';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-hero/ArenaHero.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaHero],
  template: `
    <arena-hero [title]="title" [eyebrow]="eyebrow" [lede]="lede" />
  `,
})
class HeroHost {
  title = 'Coffee that tells you where it grew';
  eyebrow: string | undefined = undefined;
  lede: string | undefined = undefined;
}

@Component({
  standalone: true,
  imports: [ArenaHero],
  template: `<arena-hero class="arena-layout-bleed arena-align-center" title="Coffee" />`,
})
class ClassedHeroHost {}

function render(patch: Partial<HeroHost> = {}) {
  const fixture = TestBed.createComponent(HeroHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

const heroOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('arena-hero') as HTMLElement;

test('arena-hero opens the page and offers nothing a user can act on', () => {
  const fixture = render();
  try {
    const hero = heroOf(fixture);
    const heading = hero.querySelector('h1');
    assert.ok(heading, 'a hero is one line plus its setting, and the line is a level one heading');
    assert.equal(heading?.textContent?.trim(), 'Coffee that tells you where it grew');

    for (const el of [hero, ...Array.from(hero.querySelectorAll('*'))]) {
      assert.equal(isFocusable(el as Element), false,
        `<${el.tagName.toLowerCase()}> inside a hero is reachable by keyboard, so a user tabs to something inert`);
    }

    assertPattern({ root: hero, bindingPath: BINDING, subjects: { default: hero } });
  } finally { fixture.destroy(); }
});

test('the hero claims no banner landmark, because banner is the site header and this is content', () => {
  const fixture = render();
  try {
    const hero = heroOf(fixture);
    assert.equal(hero.getAttribute('role'), null);
    assert.equal(hero.getAttribute('aria-label'), null);
    assert.equal(hero.getAttribute('aria-labelledby'), null);
  } finally { fixture.destroy(); }
});

test('a title of nothing but spaces is refused, because a present and useless one is what the guard is for', () => {
  const fixture = TestBed.createComponent(HeroHost);
  fixture.componentInstance.title = '   ';
  try {
    assert.throws(() => fixture.detectChanges(), /`title` is required/);
  } finally { fixture.destroy(); }
});

test('the hero writes no inline track list, and a layout class on it reaches its root', () => {
  const fixture = render();
  try {
    const hero = heroOf(fixture);
    assert.equal(hero.style.getPropertyValue('grid-template-columns'), '', 'the hero wrote a track list of its own');
    assert.equal(hero.getAttribute('style'), null, 'the hero writes no style of its own');
    assert.equal(hero.hasAttribute('data-arena-layout'), false);
  } finally { fixture.destroy(); }

  const classed = TestBed.createComponent(ClassedHeroHost);
  try {
    classed.detectChanges();
    const hero = classed.nativeElement.querySelector('arena-hero') as HTMLElement;
    assert.ok(hero.classList.contains('arena-layout-bleed'), 'the layout class an adopter writes is lost');
    assert.ok(hero.classList.contains('arena-align-center'), 'the align class an adopter writes is lost');
  } finally { classed.destroy(); }
});

test('the eyebrow and the lede are drawn only when given', () => {
  const bare = render();
  try {
    assert.equal(heroOf(bare).querySelectorAll('p').length, 0);
  } finally { bare.destroy(); }

  const full = render({ eyebrow: 'Single origin', lede: 'Every lot is traceable.' });
  try {
    const text = heroOf(full).textContent ?? '';
    assert.match(text, /Single origin/);
    assert.match(text, /Every lot is traceable\./);
  } finally { full.destroy(); }
});
