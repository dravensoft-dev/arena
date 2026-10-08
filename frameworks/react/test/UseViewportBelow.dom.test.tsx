/* The other half of the breakpoint question: useArenaContainerWidth answers "how wide is this box",
 * which is what a component needs, and this answers "which side of the threshold is the
 * viewport on", which is what a consumer's own page layout needs and could not get from CSS,
 * since a media query condition holds no var(). The query is `not all and (min-width: N)`
 * rather than a max-width one short of N, so it is the exact complement of the `md:` variant
 * with no epsilon to get wrong. happy-dom evaluates matchMedia against its own viewport. */
import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mount, cleanup, act } from './Harness.tsx';
import { forgetArenaBreakpoints, useArenaViewportBelow } from '../UseArenaContainerWidth.ts';

afterEach(cleanup);
after(forgetArenaBreakpoints);

function Probe({ name }: { name: 'sm' | 'md' | 'lg' }) {
  return <span data-below={String(useArenaViewportBelow(name))} />;
}

function viewport(width: number) {
  act(() => {
    (window as unknown as { happyDOM: { setViewport(size: { width: number }): void } })
      .happyDOM.setViewport({ width });
  });
}

test('it reports which side of --bp-md the viewport is on, and follows a resize', () => {
  viewport(1280);
  const root = mount(<Probe name="md" />);
  assert.equal(root.firstElementChild!.getAttribute('data-below'), 'false',
    'a desktop viewport is not below md');

  viewport(390);
  assert.equal(root.firstElementChild!.getAttribute('data-below'), 'true',
    'the hook must follow the resize, or a shell renders its wide branch on a phone that rotated');

  viewport(1280);
  assert.equal(root.firstElementChild!.getAttribute('data-below'), 'false');
});

test('the threshold itself is not below it, which is what the md: variant means', () => {
  viewport(768);
  const root = mount(<Probe name="md" />);
  assert.equal(root.firstElementChild!.getAttribute('data-below'), 'false',
    '--bp-md is the width at which the wide branch starts, so exactly 768 is the wide side');
});

test('each name is its own threshold', () => {
  viewport(600);
  const root = mount(<><Probe name="sm" /><Probe name="md" /><Probe name="lg" /></>);
  assert.deepEqual(
    [...root.querySelectorAll('span')].map((el) => el.getAttribute('data-below')),
    ['false', 'true', 'true'],
    '600 is above --bp-sm (480) and below both --bp-md (768) and --bp-lg (1024)',
  );
});

test('the very first render already carries the answer, so a phone never draws the wide frame first', () => {
  viewport(390);
  const seen: boolean[] = [];
  function Recorder() {
    const below = useArenaViewportBelow('md');
    seen.push(below);
    return null;
  }
  mount(<Recorder />);
  assert.equal(seen[0], true,
    'the first render said false and a later one corrected it, which is a desktop frame painted on a phone');
});

test('a server render answers false and says nothing', () => {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
  try {
    const html = renderToStaticMarkup(<Probe name="md" />);
    assert.match(html, /data-below="false"/, 'a server has no viewport, so its answer is the wide frame');
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors, [], 'a server render of the hook must not warn');
});

test('an unresolved threshold answers false rather than throwing', () => {
  const style = document.documentElement.style;
  const saved = style.getPropertyValue('--bp-md');
  const warn = console.warn;
  console.warn = () => {};
  forgetArenaBreakpoints();
  style.removeProperty('--bp-md');
  try {
    viewport(390);
    const root = mount(<Probe name="md" />);
    assert.equal(root.firstElementChild!.getAttribute('data-below'), 'false',
      'with no threshold there is no query, and no query is the wide frame');
  } finally {
    style.setProperty('--bp-md', saved);
    forgetArenaBreakpoints();
    console.warn = warn;
  }
});

test('one threshold is one media query, however often the hook renders', () => {
  forgetArenaBreakpoints();
  const original = window.matchMedia;
  let asked = 0;
  window.matchMedia = ((query: string) => { asked += 1; return original.call(window, query); }) as typeof window.matchMedia;
  let bump = () => {};
  function Counted() {
    const [, set] = useState(0);
    bump = () => set((n) => n + 1);
    return <Probe name="md" />;
  }
  try {
    viewport(390);
    mount(<Counted />);
    for (let i = 0; i < 3; i += 1) act(() => bump());
  } finally {
    window.matchMedia = original;
  }
  assert.equal(asked, 1, 'every render asked matchMedia again, and development asks twice more for the consistency check');
});
