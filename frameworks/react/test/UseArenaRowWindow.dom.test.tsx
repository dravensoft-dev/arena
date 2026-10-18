import test from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { mount, cleanup, act } from './Harness.tsx';
import { SilentObserver } from './LaidOut.ts';
import { useArenaRowWindow } from '../UseArenaRowWindow.ts';
import type { ArenaRowWindowOptions, ArenaRowWindowResult } from '../UseArenaRowWindow.ts';
import { limitWindowInitial, limitWindowOverscan } from '../Tokens.generated.js';

interface Scene {
  height: (record: number) => number;
  gap: number;
  head: number;
  viewport: number;
  sticky: boolean;
  scrollTop: number;
}

function scene(over: Partial<Scene> = {}): Scene {
  return { height: () => 40, gap: 0, head: 36, viewport: 400, sticky: false, scrollTop: 0, ...over };
}

function cardGap(): number {
  return 2 * 8;
}

function px(value: number): string {
  return `${value}px`;
}

function blockPad(top: number, bottom: number): string {
  return `${px(top)} ${px(bottom)}`;
}

function rectOf(top: number, height: number): DOMRect {
  const box = Object.fromEntries([['x', 0], ['y', top], ['top', top], ['left', 0], ['bottom', top + height],
    ['right', top], ['width', top], ['height', height]]);
  return { ...box, toJSON() { return this; } } as unknown as DOMRect;
}

function recordsIn(): Element[] {
  return Array.from(document.querySelectorAll('[data-record]'));
}

function staged<T>(view: Scene, body: () => T): T {
  const savedRect = Element.prototype.getBoundingClientRect;
  const savedObserver = globalThis.ResizeObserver;
  const proto = Element.prototype as unknown as Record<string, unknown>;
  const html = HTMLElement.prototype as unknown as Record<string, unknown>;
  const savedHeight = Object.getOwnPropertyDescriptor(html, 'clientHeight');
  const savedTop = Object.getOwnPropertyDescriptor(proto, 'scrollTop');
  SilentObserver.made = [];
  SilentObserver.connected = 0;
  SilentObserver.peak = 0;
  globalThis.ResizeObserver = SilentObserver as unknown as typeof ResizeObserver;
  Element.prototype.getBoundingClientRect = function rect(this: Element): DOMRect {
    const role = this.getAttribute('data-role');
    if (role === 'table') return rectOf(0, 0);
    if (role === 'head') return rectOf(0, view.head);
    const record = this.getAttribute('data-record');
    if (record === null) return rectOf(0, 0);
    let top = view.head;
    for (const row of recordsIn()) {
      if (row === this) break;
      top += view.height(Number(row.getAttribute('data-record'))) + view.gap;
    }
    return rectOf(top, view.height(Number(record)));
  };
  Object.defineProperty(html, 'clientHeight', { configurable: true, get: () => view.viewport });
  Object.defineProperty(proto, 'scrollTop', {
    configurable: true,
    get: () => view.scrollTop,
    set: (next: number) => { view.scrollTop = next; },
  });
  try {
    return body();
  } finally {
    Element.prototype.getBoundingClientRect = savedRect;
    globalThis.ResizeObserver = savedObserver;
    if (savedHeight) Object.defineProperty(html, 'clientHeight', savedHeight); else delete html.clientHeight;
    if (savedTop) Object.defineProperty(proto, 'scrollTop', savedTop); else delete proto.scrollTop;
  }
}

let latest: ArenaRowWindowResult | null = null;

function Probe({ options, card = false, sticky = false }: { options: ArenaRowWindowOptions; card?: boolean; sticky?: boolean }) {
  const win = useArenaRowWindow(options);
  latest = win;
  const part = card ? 'table.card' : 'table.row';
  const records = Array.from({ length: win.count }, (_, i) => win.offset + i);
  return (
    <div ref={win.ref} style={win.style} data-role="box">
      <div style={{ paddingBlock: blockPad(win.padTop, win.padBottom) }} data-role="wrapper">
        <div data-arena-part="table" data-role="table">
          {card ? null : (
            <div data-arena-part="table.head-row" data-role="head">
              <span data-arena-part="table.th" style={sticky ? { position: 'sticky' } : undefined} />
            </div>
          )}
          {records.map((record) => <div key={record} data-arena-part={part} data-record={record} />)}
        </div>
      </div>
    </div>
  );
}

let setOptions: (next: ArenaRowWindowOptions) => void = () => {};

function Host({ first, card = false, sticky = false }: { first: ArenaRowWindowOptions; card?: boolean; sticky?: boolean }) {
  const [options, set] = useState(first);
  setOptions = set;
  return <Probe options={options} card={card} sticky={sticky} />;
}

const box = () => document.querySelector('[data-role="box"]') as HTMLElement;
const mountedRecords = () => recordsIn().map((row) => Number(row.getAttribute('data-record')));
const wrapperPad = () => (document.querySelector('[data-role="wrapper"]') as HTMLElement).style.paddingBlock;

function notify(): void {
  act(() => {
    for (const one of SilentObserver.made) {
      if (!one.disconnected) one.callback([], one as unknown as ResizeObserver);
    }
  });
}

function scrollTo(view: Scene, top: number): void {
  view.scrollTop = top;
  act(() => { box().dispatchEvent(new Event('scroll')); });
}

function sum(view: Scene, from: number, to: number): number {
  let out = 0;
  for (let i = from; i < to; i++) out += view.height(i) + view.gap;
  return out;
}

function serverMarkup(element: React.ReactElement): string {
  const original = console.error;
  console.error = () => {};
  try {
    return renderToString(element);
  } finally {
    console.error = original;
  }
}

test('a server render projects the initial window with no padding', () => {
  function Server() {
    const win = useArenaRowWindow({ total: 20000, rowHeight: 40 });
    return <div ref={win.ref} data-state={`${win.offset}:${win.count}:${win.padTop}:${win.padBottom}:${win.slice.total}:${win.slice.offset}`} />;
  }
  assert.match(serverMarkup(<Server />), new RegExp(`data-state="0:${limitWindowInitial}:0:0:20000:0"`));
  function Few() {
    const win = useArenaRowWindow({ total: 7 });
    return <div data-state={`${win.offset}:${win.count}`} />;
  }
  assert.match(serverMarkup(<Few />), /data-state="0:7"/);
});

test('the first client render projects the initial window before anything is measured', () => {
  const view = scene();
  const seen: string[] = [];
  function Spy() {
    const win = useArenaRowWindow({ total: 20000 });
    seen.push(`${win.offset}:${win.count}:${win.padTop}`);
    return <div ref={win.ref} />;
  }
  staged(view, () => mount(<Spy />));
  assert.equal(seen[0], `0:${limitWindowInitial}:0`);
  cleanup();
});

test('a measured box of 400 px over rows of 40 px windows by the arithmetic', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 1000 }} />);
    assert.equal(latest!.offset, 0);
    assert.equal(latest!.count, 10 + limitWindowOverscan);
    assert.equal(latest!.padTop, 0);
    assert.equal(latest!.padBottom, (1000 - latest!.count) * 40);
    assert.deepEqual(latest!.slice, { total: 1000, offset: 0 });
    assert.deepEqual(mountedRecords().slice(0, 2), [0, 1]);
  });
  cleanup();
});

test('scrolling moves the window and the padding keeps the whole list at one height', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 1000 }} />);
    const whole = 1000 * 40;
    for (const top of [0, 2000, 9000, 39600]) {
      scrollTo(view, top);
      const first = Math.floor(top / 40);
      assert.ok(latest!.offset <= first && latest!.offset >= Math.max(0, first - limitWindowOverscan), `offset ${latest!.offset} at ${top}`);
      assert.ok(latest!.offset + latest!.count >= Math.min(1000, first + 10));
      assert.equal(latest!.padTop + latest!.count * 40 + latest!.padBottom, whole);
      assert.equal(wrapperPad(), blockPad(latest!.padTop, latest!.padBottom));
    }
  });
  cleanup();
});

test('rows of mixed heights are measured by absolute index and add up in the pads', () => {
  const view = scene({ height: (record) => 30 + (record % 5) * 12 });
  staged(view, () => {
    mount(<Probe options={{ total: 100, rowHeight: 40 }} />);
    for (let top = 0; top <= sum(view, 0, 100); top += 150) scrollTo(view, top);
    scrollTo(view, 0);
    const { offset, count, padTop, padBottom } = latest!;
    assert.equal(offset, 0);
    assert.equal(padTop, 0);
    assert.equal(padBottom, sum(view, count, 100));
    scrollTo(view, sum(view, 0, 100));
    assert.equal(latest!.padTop, sum(view, 0, latest!.offset));
    assert.equal(latest!.padBottom, sum(view, latest!.offset + latest!.count, 100));
  });
  cleanup();
});

test('a re-measure of rows above the viewport corrects scrollTop so the top row stays put', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 1000, rowHeight: 40 }} />);
    scrollTo(view, 4000);
    const row = Math.floor(view.scrollTop / 40);
    const into = view.scrollTop - row * 40;
    view.height = (record) => (record < row ? 60 : 40);
    notify();
    assert.ok(view.scrollTop > 4000, 'the rows above grew, so the scroll position had to follow');
    const start = latest!.padTop + sum(view, latest!.offset, row);
    assert.ok(Math.abs(view.scrollTop - (start + into)) < 1e-6, `scrollTop ${view.scrollTop} against ${start + into}`);
  });
  cleanup();
});

test('a change below the viewport leaves scrollTop alone', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 1000, rowHeight: 40 }} />);
    scrollTo(view, 4000);
    const before = view.scrollTop;
    view.height = (record) => (record > 200 ? 55 : 40);
    notify();
    assert.equal(view.scrollTop, before);
  });
  cleanup();
});

test('every mounted row changing height drops the extents of the rows not mounted', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 1000, rowHeight: 40 }} />);
    scrollTo(view, 4000);
    scrollTo(view, 0);
    view.height = () => 64;
    notify();
    assert.equal(latest!.padBottom, (1000 - latest!.count) * 64 - 0, 'unmounted rows are counted at the new mean, not at 40');
    assert.equal(latest!.padTop, 0);
  });
  cleanup();
});

test('only some rows changing height keeps the readings of the rows not mounted', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 1000, rowHeight: 40 }} />);
    scrollTo(view, 4000);
    scrollTo(view, 0);
    view.height = (record) => (record === 0 ? 40 : 64);
    notify();
    const rest = 1000 - latest!.count;
    assert.ok(latest!.padBottom > rest * 40 && latest!.padBottom < rest * 64, `${latest!.padBottom} for ${rest} rows`);
  });
  cleanup();
});

test('a card extent includes the gap to the next card', () => {
  const view = scene({ height: () => 100, gap: cardGap(), head: 0 });
  staged(view, () => {
    mount(<Probe options={{ total: 500 }} card />);
    assert.equal(latest!.padBottom, (500 - latest!.count) * 116);
    scrollTo(view, 5800);
    assert.equal(latest!.padTop + latest!.count * 116 + latest!.padBottom, 500 * 116);
  });
  cleanup();
});

test('the viewport is the box less what sits above the first row', () => {
  const tall = scene({ head: 200 });
  const flat = scene({ head: 0 });
  const counts: number[] = [];
  for (const view of [tall, flat]) {
    staged(view, () => {
      mount(<Probe options={{ total: 1000 }} />);
      counts.push(latest!.count);
    });
    cleanup();
  }
  assert.ok(counts[0]! < counts[1]!, `${counts.join(' vs ')}`);
});

test('scrollToRow puts the row at the top edge, and under a sticky head it sits just below it', () => {
  const plain = scene();
  staged(plain, () => {
    mount(<Probe options={{ total: 1000 }} />);
    latest!.scrollToRow(100);
    assert.equal(plain.scrollTop, 100 * 40 + plain.head);
    latest!.scrollToRow(-5);
    assert.equal(plain.scrollTop, plain.head);
    latest!.scrollToRow(99999);
    assert.equal(plain.scrollTop, 999 * 40 + plain.head);
  });
  cleanup();
  const stuck = scene();
  staged(stuck, () => {
    mount(<Probe options={{ total: 1000 }} sticky />);
    assert.equal(latest!.style.scrollPaddingTop, stuck.head);
    latest!.scrollToRow(100);
    assert.equal(stuck.scrollTop, 100 * 40);
  });
  cleanup();
});

test('onRowRequest scrolls only as far as the nearest edge needs', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 1000 }} />);
    scrollTo(view, 4000);
    const lead = view.head;
    latest!.onRowRequest(105);
    assert.equal(view.scrollTop, 4000, 'a row already whole in the viewport does not move it');
    latest!.onRowRequest(300);
    assert.equal(view.scrollTop, 301 * 40 + lead - view.viewport, 'a row below ends flush with the bottom edge');
    latest!.onRowRequest(10);
    assert.equal(view.scrollTop, 10 * 40 + lead, 'a row above starts flush with the top edge');
  });
  cleanup();
});

test('onRowRequest keeps a requested row clear of a sticky head', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 1000 }} sticky />);
    scrollTo(view, 4000);
    latest!.onRowRequest(10);
    assert.equal(view.scrollTop, 10 * 40);
  });
  cleanup();
});

test('the style turns native scroll anchoring off and pads the scroll by a sticky head only', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 100 }} />);
    assert.deepEqual(latest!.style, { overflowAnchor: 'none', scrollPaddingTop: 0 });
  });
  cleanup();
});

test('a list that shrinks never projects past its end', () => {
  const view = scene();
  staged(view, () => {
    mount(<Host first={{ total: 1000 }} />);
    scrollTo(view, 30000);
    assert.ok(latest!.offset > 100);
    act(() => { setOptions({ total: 5 }); });
    assert.ok(latest!.offset + latest!.count <= 5);
    assert.deepEqual(latest!.slice, { total: 5, offset: latest!.offset });
  });
  cleanup();
});

test('enabled false projects the initial window and holds no observer or listener', () => {
  const view = scene();
  staged(view, () => {
    mount(<Probe options={{ total: 1000, enabled: false }} />);
    assert.equal(latest!.offset, 0);
    assert.equal(latest!.count, limitWindowInitial);
    assert.equal(latest!.padBottom, 0);
    assert.equal(SilentObserver.made.length, 0);
    scrollTo(view, 4000);
    assert.equal(latest!.offset, 0);
  });
  cleanup();
});

test('turning enabled off releases the observer and the scroll listener', () => {
  const view = scene();
  staged(view, () => {
    mount(<Host first={{ total: 1000 }} />);
    scrollTo(view, 2000);
    assert.ok(latest!.offset > 0);
    assert.ok(SilentObserver.made.some((one) => !one.disconnected));
    act(() => { setOptions({ total: 1000, enabled: false }); });
    assert.equal(SilentObserver.made.filter((one) => !one.disconnected).length, 0);
    assert.equal(latest!.offset, 0);
    assert.equal(latest!.count, limitWindowInitial);
    assert.equal(latest!.padTop, 0);
    assert.equal(latest!.padBottom, 0);
  });
  cleanup();
  assert.ok(SilentObserver.made.every((one) => one.disconnected), 'an observer outlived its component');
});
