import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ArenaRowWindow } from '../RowWindow';
import { SilentObserver } from './LaidOut';
import { limitWindowInitial, limitWindowOverscan } from '../Tokens.generated';

interface Scene {
  height: (record: number) => number;
  gap: number;
  head: number;
  viewport: number;
  scrollTop: number;
}

function scene(over: Partial<Scene> = {}): Scene {
  return { height: () => 40, gap: 0, head: 36, viewport: 400, scrollTop: 0, ...over };
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
    if (savedHeight) Object.defineProperty(html, 'clientHeight', savedHeight); else delete html['clientHeight'];
    if (savedTop) Object.defineProperty(proto, 'scrollTop', savedTop); else delete proto['scrollTop'];
  }
}

interface Options {
  total: number;
  rowHeight?: number;
  overscan?: number;
  enabled?: boolean;
}

@Component({
  selector: 'probe-window',
  standalone: true,
  imports: [ArenaRowWindow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div arenaRowWindow #w="arenaRowWindow" data-role="box" [total]="options().total" [rowHeight]="options().rowHeight"
      [overscan]="options().overscan" [enabled]="options().enabled ?? true">
      <div data-role="wrapper" [style.padding-top.px]="w.padTop()" [style.padding-bottom.px]="w.padBottom()">
        <div data-arena-part="table" data-role="table">
          @if (!card()) {
            <div data-arena-part="table.head-row" data-role="head">
              <span data-arena-part="table.th" [style.position]="sticky() ? 'sticky' : null"></span>
            </div>
          }
          @for (record of records(w.offset(), w.count()); track $index) {
            <div [attr.data-arena-part]="card() ? 'table.card' : 'table.row'" [attr.data-record]="record"></div>
          }
        </div>
      </div>
      <span data-role="spy" [attr.data-seen]="spy(w.offset(), w.count(), w.padTop(), w.padBottom())"></span>
    </div>`,
})
class Probe {
  readonly options = signal<Options>({ total: 1000 });
  readonly card = signal(false);
  readonly sticky = signal(false);
  readonly win = viewChild.required(ArenaRowWindow);
  readonly seen: string[] = [];
  records(offset: number, count: number): number[] { return Array.from({ length: count }, (_, i) => offset + i); }
  spy(offset: number, count: number, top: number, bottom: number): string {
    const line = `${offset}:${count}:${top}:${bottom}`;
    this.seen.push(line);
    return line;
  }
}

function settle(): void {
  for (let i = 0; i < 6; i++) TestBed.tick();
}

function mountProbe(options: Options, flags: { card?: boolean; sticky?: boolean } = {}): ComponentFixture<Probe> {
  const fixture = TestBed.createComponent(Probe);
  fixture.componentInstance.options.set(options);
  fixture.componentInstance.card.set(flags.card ?? false);
  fixture.componentInstance.sticky.set(flags.sticky ?? false);
  fixture.autoDetectChanges();
  settle();
  return fixture;
}

const box = () => document.querySelector('[data-role="box"]') as HTMLElement;
const mountedRecords = () => recordsIn().map((row) => Number(row.getAttribute('data-record')));
const wrapperPad = () => {
  const style = (document.querySelector('[data-role="wrapper"]') as HTMLElement).style;
  return blockPad(Number.parseFloat(style.paddingTop), Number.parseFloat(style.paddingBottom));
};

function notify(): void {
  for (const one of SilentObserver.made) {
    if (!one.disconnected) one.callback([], one as unknown as ResizeObserver);
  }
  settle();
}

function scrollTo(view: Scene, top: number): void {
  view.scrollTop = top;
  box().dispatchEvent(new Event('scroll'));
  settle();
}

function sum(view: Scene, from: number, to: number): number {
  let out = 0;
  for (let i = from; i < to; i++) out += view.height(i) + view.gap;
  return out;
}

function inside(body: (view: Scene) => void, over: Partial<Scene> = {}): void {
  const view = scene(over);
  staged(view, () => body(view));
}

function use<T>(options: Options, flags: { card?: boolean; sticky?: boolean }, body: (win: ArenaRowWindow, fixture: ComponentFixture<Probe>) => T): T {
  const fixture = mountProbe(options, flags);
  try {
    return body(fixture.componentInstance.win(), fixture);
  } finally {
    fixture.destroy();
  }
}

test('the first render before afterNextRender projects the initial window with no padding', () => {
  inside(() => {
    for (const [total, count] of [[20000, limitWindowInitial], [7, 7]] as const) {
      const fixture = TestBed.createComponent(Probe);
      fixture.componentInstance.options.set({ total, rowHeight: 40 });
      fixture.autoDetectChanges();
      assert.equal(fixture.componentInstance.seen[0], `0:${count}:0:0`);
      assert.deepEqual(fixture.componentInstance.win().slice(), { total, offset: 0 });
      fixture.destroy();
    }
  });
});

test('the first client render projects the initial window before anything is measured', () => {
  inside(() => {
    const fixture = TestBed.createComponent(Probe);
    fixture.componentInstance.options.set({ total: 20000 });
    fixture.autoDetectChanges();
    settle();
    assert.equal(fixture.componentInstance.seen[0], `0:${limitWindowInitial}:0:0`);
    fixture.destroy();
  });
});

test('a measured box of 400 px over rows of 40 px windows by the arithmetic', () => {
  inside(() => {
    use({ total: 1000 }, {}, (win) => {
      assert.equal(win.offset(), 0);
      assert.equal(win.count(), 10 + limitWindowOverscan);
      assert.equal(win.padTop(), 0);
      assert.equal(win.padBottom(), (1000 - win.count()) * 40);
      assert.deepEqual(win.slice(), { total: 1000, offset: 0 });
      assert.deepEqual(mountedRecords().slice(0, 2), [0, 1]);
    });
  });
});

test('scrolling moves the window and the padding keeps the whole list at one height', () => {
  inside((view) => {
    use({ total: 1000 }, {}, (win) => {
      const whole = 1000 * 40;
      for (const top of [0, 2000, 9000, 39600]) {
        scrollTo(view, top);
        const first = Math.floor(top / 40);
        assert.ok(win.offset() <= first && win.offset() >= Math.max(0, first - limitWindowOverscan), `offset ${win.offset()} at ${top}`);
        assert.ok(win.offset() + win.count() >= Math.min(1000, first + 10));
        assert.equal(win.padTop() + win.count() * 40 + win.padBottom(), whole);
        assert.equal(wrapperPad(), blockPad(win.padTop(), win.padBottom()));
      }
    });
  });
});

test('rows of mixed heights are measured by absolute index and add up in the pads', () => {
  inside((view) => {
    use({ total: 100, rowHeight: 40 }, {}, (win) => {
      for (let top = 0; top <= sum(view, 0, 100); top += 150) scrollTo(view, top);
      scrollTo(view, 0);
      assert.equal(win.offset(), 0);
      assert.equal(win.padTop(), 0);
      assert.equal(win.padBottom(), sum(view, win.count(), 100));
      scrollTo(view, sum(view, 0, 100));
      assert.equal(win.padTop(), sum(view, 0, win.offset()));
      assert.equal(win.padBottom(), sum(view, win.offset() + win.count(), 100));
    });
  }, { height: (record) => 30 + (record % 5) * 12 });
});

test('a re-measure of rows above the viewport corrects scrollTop so the top row stays put', () => {
  inside((view) => {
    use({ total: 1000, rowHeight: 40 }, {}, (win) => {
      scrollTo(view, 4000);
      const row = Math.floor(view.scrollTop / 40);
      const into = view.scrollTop - row * 40;
      view.height = (record) => (record < row ? 60 : 40);
      notify();
      assert.ok(view.scrollTop > 4000, 'the rows above grew, so the scroll position had to follow');
      const start = win.padTop() + sum(view, win.offset(), row);
      assert.ok(Math.abs(view.scrollTop - (start + into)) < 1e-6, `scrollTop ${view.scrollTop} against ${start + into}`);
    });
  });
});

test('a change below the viewport leaves scrollTop alone', () => {
  inside((view) => {
    use({ total: 1000, rowHeight: 40 }, {}, () => {
      scrollTo(view, 4000);
      const before = view.scrollTop;
      view.height = (record) => (record > 200 ? 55 : 40);
      notify();
      assert.equal(view.scrollTop, before);
    });
  });
});

test('every mounted row changing height drops the extents of the rows not mounted', () => {
  inside((view) => {
    use({ total: 1000, rowHeight: 40 }, {}, (win) => {
      scrollTo(view, 4000);
      scrollTo(view, 0);
      view.height = () => 64;
      notify();
      assert.equal(win.padBottom(), (1000 - win.count()) * 64 - 0, 'unmounted rows are counted at the new mean, not at 40');
      assert.equal(win.padTop(), 0);
    });
  });
});

test('only some rows changing height keeps the readings of the rows not mounted', () => {
  inside((view) => {
    use({ total: 1000, rowHeight: 40 }, {}, (win) => {
      scrollTo(view, 4000);
      scrollTo(view, 0);
      view.height = (record) => (record === 0 ? 40 : 64);
      notify();
      const rest = 1000 - win.count();
      assert.ok(win.padBottom() > rest * 40 && win.padBottom() < rest * 64, `${win.padBottom()} for ${rest} rows`);
    });
  });
});

test('a card extent includes the gap to the next card', () => {
  inside((view) => {
    use({ total: 500 }, { card: true }, (win) => {
      assert.equal(win.padBottom(), (500 - win.count()) * 116);
      scrollTo(view, 5800);
      assert.equal(win.padTop() + win.count() * 116 + win.padBottom(), 500 * 116);
    });
  }, { height: () => 100, gap: cardGap(), head: 0 });
});

test('the viewport is the box less what sits above the first row', () => {
  const counts: number[] = [];
  for (const head of [200, 0]) {
    inside(() => {
      use({ total: 1000 }, {}, (win) => { counts.push(win.count()); });
    }, { head });
  }
  assert.ok(counts[0]! < counts[1]!, `${counts.join(' vs ')}`);
});

test('scrollToRow puts the row at the top edge, and under a sticky head it sits just below it', () => {
  inside((plain) => {
    use({ total: 1000 }, {}, (win) => {
      win.scrollToRow(100);
      assert.equal(plain.scrollTop, 100 * 40 + plain.head);
      win.scrollToRow(-5);
      assert.equal(plain.scrollTop, plain.head);
      win.scrollToRow(99999);
      assert.equal(plain.scrollTop, 999 * 40 + plain.head);
    });
  });
  inside((stuck) => {
    use({ total: 1000 }, { sticky: true }, (win) => {
      assert.equal(box().style.getPropertyValue('scroll-padding-top'), px(stuck.head));
      win.scrollToRow(100);
      assert.equal(stuck.scrollTop, 100 * 40);
    });
  });
});

test('onRowRequest scrolls only as far as the nearest edge needs', () => {
  inside((view) => {
    use({ total: 1000 }, {}, (win) => {
      scrollTo(view, 4000);
      const lead = view.head;
      win.onRowRequest(105);
      assert.equal(view.scrollTop, 4000, 'a row already whole in the viewport does not move it');
      win.onRowRequest(300);
      assert.equal(view.scrollTop, 301 * 40 + lead - view.viewport, 'a row below ends flush with the bottom edge');
      win.onRowRequest(10);
      assert.equal(view.scrollTop, 10 * 40 + lead, 'a row above starts flush with the top edge');
    });
  });
});

test('onRowRequest keeps a requested row clear of a sticky head', () => {
  inside((view) => {
    use({ total: 1000 }, { sticky: true }, (win) => {
      scrollTo(view, 4000);
      win.onRowRequest(10);
      assert.equal(view.scrollTop, 10 * 40);
    });
  });
});

test('the style turns native scroll anchoring off and pads the scroll by a sticky head only', () => {
  inside(() => {
    use({ total: 100 }, {}, () => {
      assert.equal(box().style.getPropertyValue('overflow-anchor'), 'none');
      assert.equal(box().style.getPropertyValue('scroll-padding-top'), px(0));
    });
  });
});

test('a list that shrinks never projects past its end', () => {
  inside((view) => {
    use({ total: 1000 }, {}, (win, fixture) => {
      scrollTo(view, 30000);
      assert.ok(win.offset() > 100);
      fixture.componentInstance.options.set({ total: 5 });
      settle();
      assert.ok(win.offset() + win.count() <= 5);
      assert.deepEqual(win.slice(), { total: 5, offset: win.offset() });
    });
  });
});

test('enabled false projects the initial window and holds no observer or listener', () => {
  inside((view) => {
    use({ total: 1000, enabled: false }, {}, (win) => {
      assert.equal(win.offset(), 0);
      assert.equal(win.count(), limitWindowInitial);
      assert.equal(win.padBottom(), 0);
      assert.equal(SilentObserver.made.length, 0);
      scrollTo(view, 4000);
      assert.equal(win.offset(), 0);
    });
  });
});

test('turning enabled off releases the observer and the scroll listener', () => {
  inside((view) => {
    use({ total: 1000 }, {}, (win, fixture) => {
      scrollTo(view, 2000);
      assert.ok(win.offset() > 0);
      assert.ok(SilentObserver.made.some((one) => !one.disconnected));
      fixture.componentInstance.options.set({ total: 1000, enabled: false });
      settle();
      assert.equal(SilentObserver.made.filter((one) => !one.disconnected).length, 0);
      assert.equal(win.offset(), 0);
      assert.equal(win.count(), limitWindowInitial);
      assert.equal(win.padTop(), 0);
      assert.equal(win.padBottom(), 0);
    });
    assert.ok(SilentObserver.made.every((one) => one.disconnected), 'an observer outlived its component');
  });
});
