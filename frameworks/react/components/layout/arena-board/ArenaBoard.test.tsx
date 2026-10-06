/* The narrowest column is a family an adopter writes as a class, so the root carries the option
 * class it is given and the slot class that reads the channel, and no style attribute. The slot
 * string is read from the generated manifest, never spelt here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import type { ArenaBoardClass } from '../../../Vocabulary.generated.ts';
import { ArenaBoard } from './ArenaBoard.tsx';
import { ArenaBoardColumn } from '../arena-board-column/ArenaBoardColumn.tsx';
import classes from './ArenaBoard.classes.generated.ts';
import tailwind from './ArenaBoard.manifest.generated.ts';

const rootClass = (html: string) => /<div[^>]*\bclass="([^"]*)"/.exec(html)?.[1] ?? '';
const board = (className?: ArenaBoardClass) => renderToStaticMarkup(
  <ArenaBoard label="Tasks" className={className}><ArenaBoardColumn title="To do" /></ArenaBoard>);

test('a board given a column option carries it on its root beside its own class, and no style attribute', () => {
  const html = board('arena-board-column-lg' as ArenaBoardClass);
  const given = rootClass(html).split(/\s+/);
  for (const name of ['arena-board-column-lg', ...classes.slots.root.split(/\s+/)]) {
    assert.ok(given.includes(name), `the root lacks ${name}`);
  }
  assert.doesNotMatch(html, /\bstyle=/);
});

test('the root slot reads the column width through the channel of the family the board answers', () => {
  const [family] = tailwind.answers;
  const axis = `--arena-${family}`;
  const channel = new RegExp(`var\\((--[\\w-]+),var\\(${axis},`).exec(tailwind.slots.root)?.[1];
  assert.ok(channel, `the root slot reads no channel in front of ${axis}`);
  assert.ok(tailwind.slots.root.includes(`var(${channel},var(${axis},`));
});
