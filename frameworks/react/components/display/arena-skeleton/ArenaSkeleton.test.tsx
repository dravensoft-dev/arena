/* A skeleton is one box in the shape its class names, or a stack of the lines it is given, and it
 * writes no style: width, height and corner are properties an adopter sets. The slot classes are
 * read from the generated manifests, never spelt here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSkeleton } from './ArenaSkeleton.tsx';
import classes from './ArenaSkeleton.classes.generated.ts';
import tailwind from './ArenaSkeleton.manifest.generated.ts';

const classOf = (html: string) => (/<div[^>]*\bclass="([^"]*)"/.exec(html)?.[1] ?? '').split(/\s+/);

test('a shape class lands on the root beside the root slot class', () => {
  const given = classOf(renderToStaticMarkup(<ArenaSkeleton className="arena-skeleton-circle" />));
  for (const name of ['arena-skeleton-circle', ...classes.slots.root.split(/\s+/)]) {
    assert.ok(given.includes(name), `the root lacks ${name}`);
  }
});

test('each box channel the root slot reads falls back through an axis of the family the skeleton answers', () => {
  const [family] = tailwind.answers;
  const reads = [...tailwind.slots.root.matchAll(/var\((--[\w-]+),var\((--[\w-]+),/g)];
  assert.equal(reads.length, 3, 'the root reads width, height and corner, each through a channel');
  for (const [, channel, axis] of reads) {
    assert.ok(channel!.startsWith(`--arena-${family}-box-`), `${channel} is not a box channel of ${family}`);
    assert.ok(axis!.startsWith(`--arena-${family}-`) && !axis!.startsWith(`--arena-${family}-box-`), `${axis} is not an axis of ${family}`);
  }
});

test('the stack slot reads the width axis of the family the skeleton answers', () => {
  const [family] = tailwind.answers;
  assert.ok(new RegExp(`var\\(--arena-${family}-width,`).test(tailwind.slots.stack));
});

test('no render of the skeleton carries a style attribute', () => {
  for (const el of [<ArenaSkeleton />, <ArenaSkeleton className="arena-skeleton-line" />, <ArenaSkeleton lines={3} />, <ArenaSkeleton lines={0} />]) {
    assert.doesNotMatch(renderToStaticMarkup(el), /\bstyle=/);
  }
});

test('a skeleton drops a consumer style object and a consumer width, height and radius', () => {
  // @ts-expect-error the contract refuses these on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaSkeleton style={{ color: '#ff00ff' }} width="var(--sp-1)" height="var(--sp-2)" radius="4px" variant="circle" />);
  assert.doesNotMatch(html, /style=|var\(--sp-1\)|var\(--sp-2\)|4px|ff00ff|data-arena-variant/);
});
