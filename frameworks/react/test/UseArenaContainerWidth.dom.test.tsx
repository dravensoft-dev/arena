import test from 'node:test';
import assert from 'node:assert/strict';
import React, { StrictMode, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mount, cleanup, act } from './Harness.tsx';
import { laidOut, SilentObserver } from './LaidOut.ts';
import { forgetArenaBreakpoints, arenaReadBreakpoint, useArenaContainerWidth } from '../UseArenaContainerWidth.ts';

function captureWarn<T>(fn: () => T): { result: T; messages: string[] } {
  const messages: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { messages.push(args.map(String).join(' ')); };
  try {
    return { result: fn(), messages };
  } finally {
    console.warn = original;
  }
}

const root = () => document.documentElement.style;

test('an unresolved breakpoint says so once, rather than returning a silent NaN', () => {
  forgetArenaBreakpoints();
  root().removeProperty('--bp-lg');

  const first = captureWarn(() => arenaReadBreakpoint('lg'));
  assert.ok(Number.isNaN(first.result), `expected NaN for an absent token, got ${first.result}`);
  assert.equal(1 < first.result, false, 'a NaN breakpoint must never select the narrow branch');
  assert.equal(first.messages.length, 1, 'an unresolved breakpoint must say so: every comparison against NaN is false, so a component stays wide on a phone');
  assert.match(first.messages.join('\n'), /--bp-lg/);

  const again = captureWarn(() => arenaReadBreakpoint('lg'));
  assert.deepEqual(again.messages, [], 'the warning is once per name, not once per read');
});

test('a failed read is not cached -- a later call for the same name recovers the real value', () => {
  root().setProperty('--bp-lg', '1024px');
  assert.equal(arenaReadBreakpoint('lg'), 1024, 'a failed read was latched, so the token could never take effect');
});

test('a resolved breakpoint is read once per name -- a later document value does not change what was cached', () => {
  root().setProperty('--bp-lg', '1px');
  assert.equal(arenaReadBreakpoint('lg'), 1024, 'the cached value must win; breakpoints are constants for the life of the document');
});

test('useArenaContainerWidth measures the element it is handed, not one of its own', () => {
  let handed: React.RefObject<HTMLDivElement> | null = null;
  function Probe() {
    const outer = useRef<HTMLDivElement>(null);
    const [ref] = useArenaContainerWidth<HTMLDivElement>(outer);
    handed = ref;
    return <div ref={outer} data-role="outer"><div data-role="inner" /></div>;
  }
  const container = mount(<Probe />);
  assert.equal(
    handed!.current,
    container.querySelector('[data-role="outer"]'),
    'a caller who already holds the box to measure must not be forced to move its own ref',
  );
  cleanup();
});

test('useArenaContainerWidth still owns a ref when it is handed none', () => {
  let own: React.RefObject<HTMLDivElement> | null = null;
  function Probe() {
    const [ref] = useArenaContainerWidth<HTMLDivElement>();
    own = ref;
    return <div ref={ref} data-role="own" />;
  }
  const container = mount(<Probe />);
  assert.equal(own!.current, container.querySelector('[data-role="own"]'));
  cleanup();
});

function widthsOf(render: (seen: (number | null)[]) => React.ReactNode): (number | null)[] {
  const seen: (number | null)[] = [];
  laidOut(390, () => mount(render(seen)));
  return seen;
}

test('the width is known from the commit that attaches the ref, before any observer reports', () => {
  function Probe({ seen }: { seen: (number | null)[] }) {
    const [ref, width] = useArenaContainerWidth<HTMLDivElement>();
    seen.push(width);
    return <div ref={ref} />;
  }
  const seen = widthsOf((s) => <Probe seen={s} />);
  assert.equal(seen[0], null, 'the first render has no box to measure yet');
  assert.equal(seen.at(-1), 390, 'the width waited for an observer, so a phone paints the wide branch first');
  cleanup();
});

test('a useRef target is measured at the same moment', () => {
  function Probe({ seen }: { seen: (number | null)[] }) {
    const outer = useRef<HTMLDivElement>(null);
    const [, width] = useArenaContainerWidth<HTMLDivElement>(outer);
    seen.push(width);
    return <div ref={outer} />;
  }
  assert.equal(widthsOf((s) => <Probe seen={s} />).at(-1), 390);
  cleanup();
});

test('a useRef target under StrictMode is measured, and every observer is released on unmount', () => {
  function Probe({ seen }: { seen: (number | null)[] }) {
    const outer = useRef<HTMLDivElement>(null);
    const [, width] = useArenaContainerWidth<HTMLDivElement>(outer);
    seen.push(width);
    return <div ref={outer} />;
  }
  const seen = widthsOf((s) => <StrictMode><Probe seen={s} /></StrictMode>);
  assert.equal(seen.at(-1), 390);
  cleanup();
  assert.ok(SilentObserver.made.length > 0);
  assert.ok(SilentObserver.made.every((one) => one.disconnected),
    'an observer outlived its component, which is a leak on every remount');
});

test('a box with no width stays null, so a component in a hidden parent keeps its wide branch', () => {
  const seen: (number | null)[] = [];
  function Probe() {
    const [ref, width] = useArenaContainerWidth<HTMLDivElement>();
    seen.push(width);
    return <div ref={ref} />;
  }
  laidOut(0, () => mount(<Probe />));
  assert.equal(seen.at(-1), null, 'a 0 read picked the phone shape for a box that is only hidden');
  cleanup();
});

test('a box that attaches after mount is measured when it attaches', () => {
  const seen: (number | null)[] = [];
  function Later() {
    const [open, setOpen] = useState(false);
    const [ref, width] = useArenaContainerWidth<HTMLDivElement>();
    seen.push(width);
    return <><button onClick={() => setOpen(true)} />{open && <div ref={ref} />}</>;
  }
  laidOut(390, () => {
    const root = mount(<Later />);
    assert.equal(seen.at(-1), null, 'nothing is attached yet');
    act(() => { root.querySelector('button')!.click(); });
  });
  assert.equal(seen.at(-1), 390, 'a dialog that opens later must be measured when its box attaches');
  cleanup();
});

test('a server render answers null and says nothing', () => {
  function Probe() {
    const [ref, width] = useArenaContainerWidth<HTMLDivElement>();
    return <div ref={ref} data-width={String(width)} />;
  }
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
  try {
    assert.match(renderToStaticMarkup(<Probe />), /data-width="null"/);
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors, []);
});

function deliver(observer: SilentObserver, entry: Partial<ResizeObserverEntry>): void {
  act(() => {
    observer.callback([{ target: observer.observed[0], ...entry } as ResizeObserverEntry], observer as unknown as ResizeObserver);
  });
}

function report(observer: SilentObserver, width: number): void {
  deliver(observer, { borderBoxSize: [{ inlineSize: width, blockSize: 0 }], contentRect: { width } as DOMRectReadOnly });
}

test('a target already attached when the hook mounts is measured', () => {
  const seen: (number | null)[] = [];
  function Child({ box }: { box: React.RefObject<HTMLDivElement | null> }) {
    const [, width] = useArenaContainerWidth<HTMLDivElement>(box);
    seen.push(width);
    return null;
  }
  function Parent() {
    const box = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);
    return <><button onClick={() => setShown(true)} /><div ref={box} />{shown && <Child box={box} />}</>;
  }
  laidOut(390, () => {
    const root = mount(<Parent />);
    act(() => { root.querySelector('button')!.click(); });
  });
  assert.equal(seen.at(-1), 390, 'a child measuring its parent\'s box stayed wide for good');
  assert.equal(SilentObserver.made.filter((one) => !one.disconnected).length, 1);
  cleanup();
});

test('an observer reporting 0 after a measurement keeps the last width, so a tab hidden and shown again never flashes its phone shape', () => {
  const seen: (number | null)[] = [];
  function Probe() {
    const [ref, width] = useArenaContainerWidth<HTMLDivElement>();
    seen.push(width);
    return <div ref={ref} />;
  }
  laidOut(900, () => mount(<Probe />));
  assert.equal(seen.at(-1), 900);
  report(SilentObserver.made.at(-1)!, 0);
  assert.equal(seen.at(-1), 900, 'a box that was hidden reported 0 and the component took its narrow branch');
  report(SilentObserver.made.at(-1)!, 390);
  assert.equal(seen.at(-1), 390, 'a real width still reaches the component');
  cleanup();
});

test('a hook that unmounts leaves nothing watching a target that outlives it', () => {
  function Child({ box }: { box: React.RefObject<HTMLDivElement | null> }) {
    useArenaContainerWidth<HTMLDivElement>(box);
    return null;
  }
  let toggle: () => void = () => {};
  let remount: () => void = () => {};
  function Parent() {
    const box = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(true);
    const [key, setKey] = useState(0);
    toggle = () => setShown((was) => !was);
    remount = () => setKey((was) => was + 1);
    return <><div key={key} ref={box} />{shown && <Child box={box} />}</>;
  }
  laidOut(390, () => {
    mount(<Parent />);
    for (let i = 0; i < 3; i += 1) {
      act(() => toggle());
      act(() => toggle());
    }
    act(() => toggle());
    const before = SilentObserver.made.length;
    act(() => remount());
    assert.equal(SilentObserver.made.length, before,
      'an unmounted hook still observed the box when it re-attached, which grows with every mount');
    assert.ok(SilentObserver.made.every((one) => one.disconnected), 'an observer outlived its hook');
  });
  cleanup();
});

const HAIRLINE = '1px';
const WIDE_INSET = '16px';
const COMPACT_INSET = '12px';
const EDGE_INSET = '4px';
const HALF = '50%';

const bordered = (borderWidth: string): React.CSSProperties => ({ borderStyle: 'solid', borderWidth });
const padded = (paddingLeft: string, paddingRight: string): React.CSSProperties => ({ paddingLeft, paddingRight });

function measuredAt(look: React.CSSProperties, box: number, drawn = box): number | null {
  const seen: (number | null)[] = [];
  function Probe() {
    const [ref, width] = useArenaContainerWidth<HTMLDivElement>();
    seen.push(width);
    return <div ref={ref} style={look} />;
  }
  laidOut(box, () => mount(<Probe />), drawn);
  cleanup();
  return seen.at(-1) ?? null;
}

test('a box with a border reports its outer width, so a table whose wide root carries one reads the same number in both branches', () => {
  assert.equal(measuredAt({ boxSizing: 'border-box', ...bordered(HAIRLINE) }, 768), 768,
    'the border was subtracted, so the wide branch read 766 and chose the narrow one at its own threshold');
});

test('two boxes whose inline padding differs report the same width, so a bar whose compact root pads less does not flip back', () => {
  const wide = measuredAt({ boxSizing: 'border-box', ...padded(WIDE_INSET, COMPACT_INSET) }, 480);
  const compact = measuredAt({ boxSizing: 'border-box', ...padded(COMPACT_INSET, COMPACT_INSET) }, 480);
  assert.deepEqual([wide, compact], [480, 480], 'padding reached the number, so each branch read a different width');
});

test('a box drawn at a scale reports its layout width, so a table in an entering dialog keeps its branch when the scale ends', () => {
  assert.equal(measuredAt({ boxSizing: 'border-box' }, 768, 752.64), 768, 'the transform reached the number');
});

test('a content-box box reports its padding and border too, so the number is the outer width whatever the box model', () => {
  assert.equal(measuredAt({ ...padded(EDGE_INSET, EDGE_INSET), ...bordered(HAIRLINE) }, 758), 768);
});

test('a fractional width reaches the component unrounded', () => {
  assert.equal(measuredAt({ boxSizing: 'border-box' }, 767.5), 767.5,
    'a rounded read puts 767.5 on the wide side of 768 in the first paint and the observer moves it back');
});

test('a box with display none at its first attach stays null', () => {
  assert.equal(measuredAt({ display: 'none' }, 768), null, 'a hidden box picked a branch before it had a width');
});

test('a hidden box whose width is a percentage stays null, since its computed width is not a length', () => {
  assert.equal(measuredAt({ display: 'none', width: HALF }, 768), null, 'the percentage was read as pixels');
});

test('an observer entry reports its border box, not its content rect', () => {
  const seen: (number | null)[] = [];
  function Probe() {
    const [ref, width] = useArenaContainerWidth<HTMLDivElement>();
    seen.push(width);
    return <div ref={ref} />;
  }
  const box = 480;
  const width = box - 4;
  laidOut(900, () => mount(<Probe />));
  deliver(SilentObserver.made.at(-1)!, {
    borderBoxSize: [{ inlineSize: box, blockSize: 0 }], contentRect: { width } as DOMRectReadOnly,
  });
  assert.equal(seen.at(-1), box, 'the observer reported the content rect, which disagrees with the synchronous read');
  cleanup();
});

test('an entry with no borderBoxSize is read from its target, as an engine that predates it delivers', () => {
  const seen: (number | null)[] = [];
  function Probe() {
    const [ref, width] = useArenaContainerWidth<HTMLDivElement>();
    seen.push(width);
    return <div ref={ref} />;
  }
  laidOut(900, () => {
    mount(<Probe />);
    const observer = SilentObserver.made.at(-1)!;
    const width = 476;
    laidOut(480, () => deliver(observer, { contentRect: { width } as DOMRectReadOnly }));
  });
  assert.equal(seen.at(-1), 480, 'an entry without borderBoxSize reported nothing, or its content rect');
  cleanup();
});

test('a parent-held target under StrictMode is watched by one observer at a time, and none outlives the unmount', () => {
  const seen: (number | null)[] = [];
  function Child({ box }: { box: React.RefObject<HTMLDivElement | null> }) {
    const [, width] = useArenaContainerWidth<HTMLDivElement>(box);
    seen.push(width);
    return null;
  }
  function Parent() {
    const box = useRef<HTMLDivElement>(null);
    return <div ref={box}><Child box={box} /></div>;
  }
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
  try {
    laidOut(390, () => mount(<StrictMode><Parent /></StrictMode>));
    assert.equal(seen.at(-1), 390, 'a child measuring its parent\'s box never got a width');
    assert.equal(SilentObserver.peak, 1,
      'the watch React discarded on the strict double render observed the box too, so two observers report every resize');
    cleanup();
  } finally {
    console.error = original;
  }
  assert.ok(SilentObserver.made.every((one) => one.disconnected), 'an observer outlived its hook');
  assert.deepEqual(errors, []);
});
