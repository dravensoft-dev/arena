/* The primitive every anchored panel stands on, driven through a probe that renders a trigger
 * and a panel the way a component does. happy-dom has no layout and no top layer, so the panel's
 * placement is asserted as the style the hook writes from a stubbed rect, and the escape from a
 * clipping ancestor is check:anchoring's. What is held here is the stack: Escape reaches the
 * topmost panel alone and stops there, a press inside a panel above is inside, and focus moves
 * only where an option asks it to. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { mount, cleanup, act } from './Harness.tsx';
import {
  ARENA_PANEL_POPOVER, arenaFirstFocusable, useArenaAnchoredPanel, type ArenaPanelDismissal,
} from '../UseAnchoredPanel.ts';

afterEach(cleanup);

type ProbeProps = {
  name: string;
  open: boolean;
  seen: string[];
  focus?: boolean;
  tabOut?: boolean;
  matchAnchorWidth?: boolean;
  align?: 'start' | 'end';
  children?: React.ReactNode;
};

function Probe({ name, open, seen, align, focus = false, tabOut = false, matchAnchorWidth = false, children }: ProbeProps) {
  const anchor = useRef<HTMLSpanElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const present = useArenaAnchoredPanel({
    open, anchor, panel, offset: 6, matchAnchorWidth, ...(align ? { align } : {}), tabOut, restoreFocus: focus,
    trigger: () => anchor.current?.querySelector('button') ?? null,
    onDismiss: (reason: ArenaPanelDismissal) => seen.push(`${name}:${reason}`),
    ...(focus ? { focusOnOpen: arenaFirstFocusable } : {}),
  });
  return (
    <span ref={anchor} data-probe={name}>
      <button type="button">{name}</button>
      {present && (
        <div ref={panel} role="dialog" tabIndex={-1} data-panel={name} {...ARENA_PANEL_POPOVER}>
          {children ?? <><button type="button">first</button><button type="button">last</button></>}
        </div>
      )}
    </span>
  );
}

const panelOf = (name: string) => document.querySelector<HTMLElement>(`[data-panel="${name}"]`);
const triggerOf = (name: string) => document.querySelector<HTMLElement>(`[data-probe="${name}"] > button`);

function key(target: Element, name: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
  act(() => { target.dispatchEvent(event); });
  return event;
}

function press(target: Element) {
  act(() => { target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); });
}

test('a server render draws no panel, and the panel mounts once the client has hydrated', () => {
  const seen: string[] = [];
  assert.doesNotMatch(renderToStaticMarkup(<Probe name="p" open seen={seen} />), /data-panel/,
    'the server drew a panel no script can place');
  mount(<Probe name="p" open seen={seen} />);
  assert.ok(panelOf('p'), 'the panel never mounted on the client');
});

test('an open panel carries the manual popover, is shown, and is placed by script under its anchor', () => {
  const seen: string[] = [];
  const shown: Element[] = [];
  const show = HTMLElement.prototype.showPopover;
  HTMLElement.prototype.showPopover = function spy(this: HTMLElement) { shown.push(this); show.call(this); };
  try {
    mount(<Probe name="p" open seen={seen} />);
  } finally {
    HTMLElement.prototype.showPopover = show;
  }
  const panel = panelOf('p')!;
  assert.equal(panel.getAttribute('popover'), 'manual', 'an auto popover would add a light dismiss the stack does not own');
  assert.deepEqual(shown, [panel], 'the panel was never shown');
  assert.equal(panel.style.position, 'fixed');
  assert.equal(panel.style.left, '0px');
  assert.equal(panel.style.top, '6px', 'the panel did not open a gap under a zero-height anchor at the top');
});

test('a panel that matches its anchor takes the anchor\'s width as its minimum', () => {
  const seen: string[] = [];
  const rect = Element.prototype.getBoundingClientRect;
  const drawn = (element: Element) => (element.hasAttribute('data-probe') ? 240 : 0);
  Element.prototype.getBoundingClientRect = function wide(this: Element) {
    const width = drawn(this);
    return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: 0, width, height: 0, toJSON() { return this; } } as DOMRect;
  };
  try {
    mount(<Probe name="p" open seen={seen} matchAnchorWidth />);
  } finally {
    Element.prototype.getBoundingClientRect = rect;
  }
  assert.equal(panelOf('p')!.style.minWidth, '240px');
});

test('a panel writes its minimum width only when the anchor\'s width changes', () => {
  const seen: string[] = [];
  let drawnWidth = 240;
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function wide(this: Element) {
    const w = this.hasAttribute('data-probe') ? drawnWidth : 0;
    return { x: 0, y: 0, left: 0, top: 0, right: w, bottom: 0, width: w, height: 0, toJSON() { return this; } } as DOMRect;
  };
  try {
    mount(<Probe name="p" open seen={seen} matchAnchorWidth />);
    const panel = panelOf('p')!;
    panel.style.minWidth = '1px';
    act(() => { document.dispatchEvent(new Event('scroll')); });
    assert.equal(panel.style.minWidth, '1px', 'an unchanged width was written again');
    drawnWidth = 300;
    act(() => { document.dispatchEvent(new Event('scroll')); });
    assert.equal(panel.style.minWidth, '300px', 'a changed width was not written');
  } finally {
    Element.prototype.getBoundingClientRect = rect;
  }
});

test('Escape reaches the topmost panel alone, and stops before anything under it hears the key', () => {
  const seen: string[] = [];
  let heard = 0;
  const below = () => { heard += 1; };
  document.addEventListener('keydown', below);
  try {
    mount(<><Probe name="lower" open seen={seen} /><Probe name="upper" open seen={seen} /></>);
    key(panelOf('upper')!.querySelector('button')!, 'Escape');
  } finally {
    document.removeEventListener('keydown', below);
  }
  assert.deepEqual(seen, ['upper:escape'], 'Escape closed a panel under the topmost one');
  assert.equal(heard, 0, 'the key went on to a listener under the panel, so a dialog around it would close too');
});

test('once the topmost panel closes, Escape reaches the one under it', () => {
  const seen: string[] = [];
  function Pair() {
    const [upper, setUpper] = React.useState(true);
    return (
      <>
        <button type="button" data-close onClick={() => setUpper(false)}>close</button>
        <Probe name="lower" open seen={seen} />
        <Probe name="upper" open={upper} seen={seen} />
      </>
    );
  }
  mount(<Pair />);
  act(() => { document.querySelector<HTMLElement>('[data-close]')!.click(); });
  key(document.body, 'Escape');
  assert.deepEqual(seen, ['lower:escape']);
});

test('Escape returns focus to the trigger when the panel restores it, and leaves it alone otherwise', () => {
  const seen: string[] = [];
  mount(<Probe name="p" open seen={seen} focus />);
  key(panelOf('p')!.querySelector('button')!, 'Escape');
  assert.equal(document.activeElement, triggerOf('p'));
  cleanup();
  mount(<Probe name="q" open seen={seen} />);
  const inside = panelOf('q')!.querySelector('button')!;
  inside.focus();
  key(inside, 'Escape');
  assert.equal(document.activeElement, inside, 'a panel that does not restore focus moved it');
});

test('a press outside dismisses without moving focus, and one on the trigger or inside does not', () => {
  const seen: string[] = [];
  mount(<Probe name="p" open seen={seen} focus />);
  press(triggerOf('p')!);
  press(panelOf('p')!.querySelector('button')!);
  assert.deepEqual(seen, [], 'a press on the trigger or inside the panel dismissed it');
  const focused = document.activeElement;
  press(document.body);
  assert.deepEqual(seen, ['p:outside']);
  assert.equal(document.activeElement, focused, 'an outside press stole focus');
});

test('a press inside a panel opened above this one is inside, whatever the DOM holds', () => {
  const seen: string[] = [];
  mount(<><Probe name="lower" open seen={seen} /><Probe name="upper" open seen={seen} /></>);
  press(panelOf('upper')!.querySelector('button')!);
  assert.deepEqual(seen, [], 'a press in the panel above closed the one under it');
  press(panelOf('lower')!.querySelector('button')!);
  assert.deepEqual(seen, ['upper:outside'], 'a press in the lower panel is outside the one above it');
});

test('opening moves focus to the first control when asked, or to the panel when it holds none', () => {
  const seen: string[] = [];
  mount(<Probe name="p" open seen={seen} focus />);
  assert.equal(document.activeElement?.textContent, 'first');
  cleanup();
  mount(<Probe name="q" open seen={seen} focus><p>Nothing to press.</p></Probe>);
  assert.equal(document.activeElement, panelOf('q'));
  cleanup();
  const before = document.activeElement;
  mount(<Probe name="r" open seen={seen} />);
  assert.equal(document.activeElement, before, 'a panel that does not ask for focus took it');
});

test('Tab from the last control and Shift+Tab from the first leave the panel for its trigger', () => {
  const seen: string[] = [];
  mount(<Probe name="p" open seen={seen} focus tabOut />);
  const [first, last] = [...panelOf('p')!.querySelectorAll<HTMLElement>('button')];
  last!.focus();
  const forward = key(last!, 'Tab');
  assert.equal(forward.defaultPrevented, true);
  assert.deepEqual(seen, ['p:tab']);
  assert.equal(document.activeElement, triggerOf('p'));
  first!.focus();
  key(first!, 'Tab', true);
  assert.deepEqual(seen, ['p:tab', 'p:tab']);
  assert.equal(document.activeElement, triggerOf('p'), 'Shift+Tab out did not return to the trigger');
});

test('Tab out of a panel with another panel above it is ignored, since only the topmost panel answers', () => {
  const seen: string[] = [];
  mount(<><Probe name="lower" open seen={seen} focus tabOut /><Probe name="upper" open seen={seen} focus tabOut /></>);
  const last = [...panelOf('lower')!.querySelectorAll<HTMLElement>('button')].pop()!;
  last.focus();
  assert.equal(key(last, 'Tab').defaultPrevented, false, 'a panel under another took the Tab');
  assert.deepEqual(seen, [], 'a panel under another dismissed on Tab');
});

test('Escape from inside a modal that sits inside the topmost panel is the modal\'s, not the panel\'s', () => {
  const seen: string[] = [];
  let heard = 0;
  const after = () => { heard += 1; };
  document.addEventListener('keydown', after);
  try {
    mount(
      <Probe name="p" open seen={seen}>
        <button type="button">open</button>
        <div role="alertdialog" aria-modal="true"><button type="button" data-inner>inner</button></div>
      </Probe>,
    );
    const event = key(panelOf('p')!.querySelector('[data-inner]')!, 'Escape');
    assert.deepEqual(seen, [], 'the panel closed under a modal that holds the key');
    assert.equal(event.defaultPrevented, false, 'the panel consumed the modal\'s Escape');
    assert.equal(heard, 1, 'the panel stopped a key that belongs to the modal');
    key(panelOf('p')!.querySelector('button')!, 'Escape');
    assert.deepEqual(seen, ['p:escape'], 'a control outside the modal lost its Escape');
  } finally {
    document.removeEventListener('keydown', after);
  }
});

test('Tab between two controls is the browser\'s, and a panel without Tab-out never takes it', () => {
  const seen: string[] = [];
  mount(<Probe name="p" open seen={seen} focus tabOut />);
  const [first] = [...panelOf('p')!.querySelectorAll<HTMLElement>('button')];
  assert.equal(key(first!, 'Tab').defaultPrevented, false);
  cleanup();
  mount(<Probe name="q" open seen={seen} focus />);
  const last = [...panelOf('q')!.querySelectorAll<HTMLElement>('button')].pop()!;
  last.focus();
  assert.equal(key(last, 'Tab').defaultPrevented, false);
  assert.deepEqual(seen, [], 'a panel without Tab-out dismissed on Tab');
});

test('closing unmounts the panel and takes it off the stack, and nothing listens afterwards', () => {
  const seen: string[] = [];
  function Toggle() {
    const [open, setOpen] = React.useState(true);
    return <><button type="button" data-close onClick={() => setOpen(false)}>close</button><Probe name="p" open={open} seen={seen} /></>;
  }
  mount(<Toggle />);
  act(() => { document.querySelector<HTMLElement>('[data-close]')!.click(); });
  assert.equal(panelOf('p'), null);
  key(document.body, 'Escape');
  press(document.body);
  assert.deepEqual(seen, [], 'a closed panel still answered Escape or a press');
});

test('a panel taken out of the document without closing never holds Escape from the one under it', () => {
  const seen: string[] = [];
  mount(<><Probe name="lower" open seen={seen} /><Probe name="upper" open seen={seen} /></>);
  panelOf('upper')!.remove();
  key(document.body, 'Escape');
  assert.deepEqual(seen, ['lower:escape']);
});

test('a closed panel leaves the stack for good, even if its node is put back in the document', () => {
  const seen: string[] = [];
  function Toggle() {
    const [open, setOpen] = React.useState(true);
    return <><button type="button" data-close onClick={() => setOpen(false)}>close</button><Probe name="upper" open={open} seen={seen} /></>;
  }
  mount(<><Probe name="lower" open seen={seen} /><Toggle /></>);
  const node = panelOf('upper')!;
  act(() => { document.querySelector<HTMLElement>('[data-close]')!.click(); });
  document.body.append(node);
  try {
    key(document.body, 'Escape');
    assert.deepEqual(seen, ['lower:escape']);
  } finally {
    node.remove();
  }
});

type StubVisual = EventTarget & { offsetTop: number; offsetLeft: number; height: number; width: number };

function visualBox(width: number, height: number, offsetTop: number) {
  return { offsetTop, offsetLeft: 0, height, width };
}

function domRect(left: number, top: number, width: number, height: number) {
  return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() { return this; } } as DOMRect;
}

function stubVisualViewport(height: number, offsetTop = 0) {
  const visual = Object.assign(new EventTarget(), visualBox(1024, height, offsetTop)) as StubVisual;
  const had = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: visual });
  const restore = () => {
    if (had) Object.defineProperty(window, 'visualViewport', had); else delete (window as { visualViewport?: unknown }).visualViewport;
  };
  return { visual, restore };
}

function drawn(anchorTop: number, anchorHeight: number, panelHeight: number) {
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function sized(this: Element) {
    const top = this.hasAttribute('data-probe') ? anchorTop : 0;
    const height = this.hasAttribute('data-probe') ? anchorHeight : this.hasAttribute('data-panel') ? panelHeight : 0;
    return domRect(0, top, 100, height);
  };
  return () => { Element.prototype.getBoundingClientRect = rect; };
}

test('a panel below a field that the keyboard covers flips above it', () => {
  const seen: string[] = [];
  const stub = stubVisualViewport(300);
  const undraw = drawn(250, 40, 120);
  try {
    mount(<Probe name="p" open seen={seen} />);
    assert.equal(panelOf('p')!.style.top, `${250 - 6 - 120}px`, 'the panel stayed under the keyboard');
  } finally {
    undraw();
    stub.restore();
  }
});

test('a panel is placed inside a visual viewport that is scrolled down', () => {
  const seen: string[] = [];
  const stub = stubVisualViewport(300, 200);
  const undraw = drawn(210, 40, 120);
  try {
    mount(<Probe name="p" open seen={seen} />);
    assert.equal(panelOf('p')!.style.top, '256px', 'the panel left the visible part of the screen');
  } finally {
    undraw();
    stub.restore();
  }
});

test('no visual viewport keeps the inner height', () => {
  const seen: string[] = [];
  const stub = stubVisualViewport(300);
  stub.restore();
  const undraw = drawn(250, 40, 120);
  try {
    mount(<Probe name="p" open seen={seen} />);
    assert.equal(panelOf('p')!.style.top, '296px', 'the placement moved without a visual viewport');
  } finally {
    undraw();
  }
});

test('a visual viewport resize re-places the panel, and closing removes the listeners', () => {
  const seen: string[] = [];
  const stub = stubVisualViewport(800);
  const undraw = drawn(250, 40, 120);
  try {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => { root.render(<Probe name="p" open seen={seen} />); });
    const panel = panelOf('p')!;
    assert.equal(panel.style.top, '296px');
    stub.visual.height = 300;
    act(() => { stub.visual.dispatchEvent(new Event('resize')); });
    assert.equal(panel.style.top, '124px', 'a keyboard that opened later did not move the panel');
    stub.visual.height = 800;
    act(() => { stub.visual.dispatchEvent(new Event('scroll')); });
    assert.equal(panel.style.top, '296px', 'a visual viewport scroll did not re-place the panel');
    act(() => { root.render(<Probe name="p" open={false} seen={seen} />); });
    stub.visual.height = 300;
    stub.visual.dispatchEvent(new Event('resize'));
    assert.equal(panelOf('p'), null);
    assert.equal(panel.style.top, '296px', 'a closed panel still heard the visual viewport');
    act(() => { root.unmount(); });
    host.remove();
  } finally {
    undraw();
    stub.restore();
  }
});

function drawnWide(anchor: [left: number, top: number, width: number, height: number], panel: [width: number, height: number]) {
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function sized(this: Element) {
    if (this.hasAttribute('data-probe')) return domRect(...anchor);
    if (this.hasAttribute('data-panel')) {
      const cap = Number.parseFloat((this as HTMLElement).style.maxHeight);
      return domRect(0, 0, panel[0], Number.isNaN(cap) ? panel[1] : Math.min(panel[1], cap));
    }
    return domRect(0, 0, 0, 0);
  };
  return () => { Element.prototype.getBoundingClientRect = rect; };
}

function leftOf(dir: 'ltr' | 'rtl', align: 'start' | 'end') {
  const seen: string[] = [];
  const stub = stubVisualViewport(800);
  const undraw = drawnWide([300, 100, 100, 40], [60, 120]);
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.style.direction = dir;
  try {
    mount(<Probe name="p" open seen={seen} align={align} />);
    return panelOf('p')!.style.left;
  } finally {
    cleanup();
    document.documentElement.removeAttribute('dir');
    document.documentElement.style.direction = '';
    undraw();
    stub.restore();
  }
}

test('start and end are logical: a right-to-left page lines start up with the anchor\'s right edge', () => {
  assert.equal(leftOf('ltr', 'start'), '300px');
  assert.equal(leftOf('ltr', 'end'), '340px');
  assert.equal(leftOf('rtl', 'start'), '340px', 'start stayed on the anchor\'s left edge in rtl');
  assert.equal(leftOf('rtl', 'end'), '300px', 'end stayed on the anchor\'s right edge in rtl');
});

test('a panel taller than the room under its field is capped to that room and scrolls, instead of covering the field', () => {
  const seen: string[] = [];
  const stub = stubVisualViewport(360);
  const undraw = drawnWide([20, 100, 200, 40], [200, 320]);
  try {
    mount(<Probe name="p" open seen={seen} />);
    const panel = panelOf('p')!;
    assert.equal(panel.style.top, '146px', 'the panel did not stay under the field');
    assert.equal(panel.style.maxHeight, '214px');
    assert.equal(panel.style.overflowY, 'auto');
  } finally {
    undraw();
    stub.restore();
  }
});

test('a panel that fits writes no max-height', () => {
  const seen: string[] = [];
  const undraw = drawn(10, 40, 120);
  try {
    mount(<Probe name="p" open seen={seen} />);
    assert.equal(panelOf('p')!.style.maxHeight, '');
    assert.equal(panelOf('p')!.style.overflowY, '');
  } finally {
    undraw();
  }
});
