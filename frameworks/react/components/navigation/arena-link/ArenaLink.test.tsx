/* The markup half of the link: the element, the attributes each member writes, and the guards.
 * The activations, what a primary click reports and what every other click leaves alone, are
 * events and live in the DOM suite beside this one. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaLink } from './ArenaLink.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('it is a real anchor carrying the address, the text and no role of its own', () => {
  const html = render(<ArenaLink href="/notes">the release notes</ArenaLink>);
  assert.match(html, /^<a href="\/notes"/, 'a link that is not an anchor answers no key the platform gives it');
  assert.doesNotMatch(html, /role=|target=|rel=|download/, 'a plain link writes no attribute it was not asked for');
  assert.match(html, /data-arena-part="link"/);
  assert.match(html, />the release notes<\/a>$/);
});

test('external opens a new tab safely and says so without drawing it', () => {
  const html = render(<ArenaLink href="https://status.example.com" external>status page</ArenaLink>);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/, 'a new tab without noopener hands the page it opens this one');
  assert.match(html, /<span class="[^"]*" data-arena-part="link\.external"[^>]*> \(opens in a new tab\)<\/span><\/a>$/,
    'the hint follows the text, one run, in the locale word');
});

test('download writes the attribute and opens nothing', () => {
  const html = render(<ArenaLink href="/report.pdf" download>the report</ArenaLink>);
  assert.match(html, /download=""/);
  assert.doesNotMatch(html, /target=/);
});

test('rel merges the consumer\'s tokens with Arena\'s and drops an opener token, warning once', () => {
  forgetArenaWarnings();
  const warn = console.warn;
  const said: string[] = [];
  console.warn = (...args: unknown[]) => { said.push(args.join(' ')); };
  try {
    assert.match(render(<ArenaLink href="/x" rel={['nofollow', 'UGC nofollow']}>x</ArenaLink>), /rel="nofollow ugc"/);
    assert.match(render(<ArenaLink href="/x" external rel={['nofollow', 'opener']}>x</ArenaLink>), /rel="nofollow noopener noreferrer"/);
    assert.match(render(<ArenaLink href="/x" target="help">x</ArenaLink>), /target="help" rel="noopener"/,
      'a named context is another context, so it takes noopener too');
    assert.doesNotMatch(render(<ArenaLink href="/x" target="_top">x</ArenaLink>), /rel=/, '_top opens nothing new');
  } finally { console.warn = warn; }
  assert.equal(said.filter((one) => one.includes('"opener"')).length, 1, 'the opener token is dropped with one warning');
});

test('a _blank target is ignored and warned once, because a new tab is external', () => {
  forgetArenaWarnings();
  const warn = console.warn;
  const said: string[] = [];
  console.warn = (...args: unknown[]) => { said.push(args.join(' ')); };
  try {
    const html = render(<ArenaLink href="/x" target="_blank">x</ArenaLink>);
    assert.doesNotMatch(html, /target=|rel=/, 'a _blank target slipped past external and its noopener');
    render(<ArenaLink href="/x" target="_BLANK">x</ArenaLink>);
  } finally { console.warn = warn; }
  assert.equal(said.length, 1);
  assert.match(said[0] ?? '', /^\[arena\] ArenaLink: target "_blank" is ignored/);
});

test('a blank address and an empty text are refused, because neither is a link', () => {
  assert.throws(() => render(<ArenaLink href="   ">notes</ArenaLink>), /^Error: ArenaLink: `href` is required/);
  assert.throws(() => render(<ArenaLink href="/notes">{'  '}</ArenaLink>), /^Error: ArenaLink: `content` is required/);
  // @ts-expect-error the contract requires it, and the guard is what this asserts
  assert.throws(() => render(<ArenaLink>notes</ArenaLink>), /^Error: ArenaLink: `href` is required/);
});
