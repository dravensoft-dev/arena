/* What a reader traverses through an avatar and through a person row. happy-dom computes no
 * accessible name, so these cases hold the markup that produces the name Chromium measured:
 * text nodes, labels and image alts outside any aria-hidden subtree. A row is held by its whole
 * list of texts rather than by counting the name, because the initials "AR" do not contain
 * "Ana Ruiz" and a count passes on the very duplication it exists to catch. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../test/Harness.tsx';
import { ArenaAvatar } from './arena-avatar/ArenaAvatar.tsx';

afterEach(cleanup);

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

test('a standalone avatar still names itself, through the alt and through the initials', () => {
  assert.deepEqual(exposedTexts(mount(<ArenaAvatar name="Ana Ruiz" src="/ana.png" />)), ['Ana Ruiz']);
  assert.deepEqual(exposedTexts(mount(<ArenaAvatar name="Ana Ruiz" />)), ['AR']);
});

test('nameShown takes the painted name out of the tree, with and without an image', () => {
  for (const src of ['/ana.png', undefined]) {
    const root = mount(<ArenaAvatar name="Ana Ruiz" src={src} nameShown />);
    assert.deepEqual(exposedTexts(root), [], `src ${String(src)}: the name is said by what composes the avatar`);
    assert.ok(root.querySelector('[aria-hidden="true"]'), 'the box is hidden, not removed');
    if (src) assert.equal(root.querySelector('img')?.getAttribute('alt'), 'Ana Ruiz', 'the image keeps its alt for when the box is shown again');
  }
});

test('nameShown leaves the presence dot its name', () => {
  const root = mount(<ArenaAvatar name="Ana Ruiz" status="online" nameShown />);
  const dot = root.querySelector('[aria-label]');
  assert.ok(dot, 'the dot is drawn');
  assert.equal(dot.closest('[aria-hidden="true"]'), null, 'the dot sits outside the hidden box');
  assert.deepEqual(exposedTexts(root), [dot.getAttribute('aria-label')]);
});
