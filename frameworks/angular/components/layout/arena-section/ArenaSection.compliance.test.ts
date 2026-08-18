/* `none` requires nothing, so assertPattern alone would pass over a section that had grown a
 * role, a landmark or a tab stop. The claim the binding makes is that this renders a heading and
 * nothing to act on, and that a named region landmark is deliberately NOT claimed. Those are
 * what the hand assertions below check. The two guards are checked here as well, because a
 * required member is enforced at runtime rather than only declared, and only a render sees it. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaSectionRhythm } from '../../../Api.generated';
import { ArenaSection } from './ArenaSection';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-section/ArenaSection.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaSection],
  template: `
    <arena-section [title]="title" [eyebrow]="eyebrow" [description]="description" [rhythm]="rhythm">
      <span>One</span>
    </arena-section>
  `,
})
class SectionHost {
  title = 'Landed recently';
  eyebrow: string | undefined = undefined;
  description: string | undefined = undefined;
  rhythm: ArenaSectionRhythm = 'md';
}

@Component({
  standalone: true,
  imports: [ArenaSection],
  template: `<arena-section title="Landed recently" />`,
})
class ChildlessHost {}

function render(patch: Partial<SectionHost> = {}) {
  const fixture = TestBed.createComponent(SectionHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

const sectionOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('arena-section') as HTMLElement;

test('arena-section renders a heading and nothing a user can act on', () => {
  const fixture = render();
  try {
    const section = sectionOf(fixture);
    const heading = section.querySelector('h2');
    assert.ok(heading, 'a section with no heading is a stack, and the whole component is the heading');
    assert.equal(heading?.textContent?.trim(), 'Landed recently');

    assert.equal(section.querySelectorAll('[tabindex]').length, 0, 'a heading costs no tab stop');
    for (const el of [section, ...Array.from(section.querySelectorAll('*'))]) {
      assert.equal(isFocusable(el as Element), false,
        `<${el.tagName.toLowerCase()}> inside a section is reachable by keyboard, so a user tabs to something inert`);
    }

    assertPattern({ root: section, bindingPath: BINDING, subjects: { default: section } });
  } finally { fixture.destroy(); }
});

test('the section claims no region landmark, because a page of them buries the ones that matter', () => {
  const fixture = render();
  try {
    const section = sectionOf(fixture);
    assert.equal(section.getAttribute('role'), null);
    assert.equal(section.getAttribute('aria-label'), null);
    assert.equal(section.getAttribute('aria-labelledby'), null);
  } finally { fixture.destroy(); }
});

test('a title of nothing but spaces is refused, because a present and useless name is what the guard is for', () => {
  const fixture = TestBed.createComponent(SectionHost);
  fixture.componentInstance.title = '   ';
  try {
    assert.throws(() => fixture.detectChanges(), /`title` is required/);
  } finally { fixture.destroy(); }
});

test('a section with no children is refused, because its heading would name nothing', () => {
  const fixture = TestBed.createComponent(ChildlessHost);
  try {
    assert.throws(() => fixture.detectChanges(), /not a legal shape/);
  } finally { fixture.destroy(); }
});

test('the eyebrow and the description are drawn only when given', () => {
  const bare = render();
  try {
    assert.equal(sectionOf(bare).querySelectorAll('p').length, 0);
  } finally { bare.destroy(); }

  const full = render({ eyebrow: 'This week', description: 'Since Monday' });
  try {
    const text = sectionOf(full).textContent ?? '';
    assert.match(text, /This week/);
    assert.match(text, /Since Monday/);
  } finally { full.destroy(); }
});
