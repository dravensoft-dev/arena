/* What a reader traverses through an avatar and through a person row. happy-dom computes no
 * accessible name, so these cases hold the markup that produces the name Chromium measured:
 * text nodes, labels and image alts outside any aria-hidden subtree. A row is held by its whole
 * list of texts rather than by counting the name, because the initials "AR" do not contain
 * "Ana Ruiz" and a count passes on the very duplication it exists to catch. */
import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from './NodeAssert';
import { ArenaAvatar } from '../components/display/arena-avatar/ArenaAvatar';
import { ArenaPeopleList } from '../components/display/arena-people-list/ArenaPeopleList';
import { ArenaPersonRow } from '../components/display/arena-person-row/ArenaPersonRow';

function exposedTexts(root: Element): string[] {
  const texts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) texts.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (element.getAttribute('aria-hidden') === 'true') return;
    const label = element.getAttribute('aria-label');
    if (label) texts.push(label);
    if (element.tagName === 'IMG') {
      const alt = element.getAttribute('alt');
      if (alt) texts.push(alt);
      return;
    }
    element.childNodes.forEach(walk);
  };
  walk(root);
  return texts;
}

function avatar(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(ArenaAvatar);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture;
}

test('a standalone avatar still names itself, through the alt and through the initials', () => {
  for (const [inputs, expected] of [
    [{ name: 'Ana Ruiz', src: '/ana.png' }, ['Ana Ruiz']],
    [{ name: 'Ana Ruiz' }, ['AR']],
  ] as const) {
    const fixture = avatar(inputs);
    try {
      const texts = exposedTexts(fixture.nativeElement as Element);
      assert.deepEqual(texts, expected);
    } finally {
      fixture.destroy();
    }
  }
});

test('nameShown takes the painted name out of the tree, with and without an image', () => {
  for (const src of ['/ana.png', undefined]) {
    const fixture = avatar({ name: 'Ana Ruiz', src, nameShown: true });
    try {
      const root = fixture.nativeElement as Element;
      assert.deepEqual(exposedTexts(root), [], `src ${String(src)}: the name is said by what composes the avatar`);
      assert.ok(root.querySelector('[aria-hidden="true"]'), 'the box is hidden, not removed');
      if (src) assert.equal(root.querySelector('img')?.getAttribute('alt'), 'Ana Ruiz', 'the image keeps its alt for when the box is shown again');
    } finally {
      fixture.destroy();
    }
  }
});

test('nameShown leaves the presence dot its name', () => {
  const fixture = avatar({ name: 'Ana Ruiz', status: 'online', nameShown: true });
  try {
    const root = fixture.nativeElement as Element;
    const dot = root.querySelector('[aria-label]');
    assert.ok(dot, 'the dot is drawn');
    assertNoNode(dot.closest('[aria-hidden="true"]'), 'the dot sits outside the hidden box');
    assert.deepEqual(exposedTexts(root), [dot.getAttribute('aria-label')]);
  } finally {
    fixture.destroy();
  }
});

@Component({
  standalone: true,
  imports: [ArenaPeopleList, ArenaPersonRow],
  template: `
    <arena-people-list label="Ruby league standings" ordered>
      <arena-person-row [rank]="1" name="Ana Ruiz" [src]="src" secondary="Design" figure="2480 XP" />
    </arena-people-list>
  `,
})
class RowHost {
  src: string | undefined = undefined;
}

test('a person row says the name once, from its text, with and without an image', () => {
  for (const src of ['/ana.png', undefined]) {
    const fixture = TestBed.createComponent(RowHost);
    try {
      fixture.componentInstance.src = src;
      fixture.detectChanges();
      const row = (fixture.nativeElement as Element).querySelector('li');
      assert.ok(row, 'the row is the list item');
      const texts = exposedTexts(row);
      assert.deepEqual(texts, ['1', 'Ana Ruiz', 'Design', '2480 XP'], `src ${String(src)}`);
    } finally {
      fixture.destroy();
    }
  }
});

test('a person row hands its avatar the list face on the avatar root', () => {
  const fixture = TestBed.createComponent(RowHost);
  try {
    fixture.detectChanges();
    const avatar = (fixture.nativeElement as Element).querySelector('li arena-avatar') as HTMLElement | null;
    assert.ok(avatar, 'the row draws an avatar');
    assert.equal(avatar.style.getPropertyValue('--arena-size-avatar'), 'var(--arena-size-face, var(--size-md-face))');
  } finally {
    fixture.destroy();
  }
});
