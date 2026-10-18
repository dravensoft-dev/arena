import {
  afterRenderEffect, booleanAttribute, computed, DestroyRef, Directive, ElementRef, inject, input, signal,
} from '@angular/core';
import type { ArenaTableSlice } from './Api.generated';
import { limitWindowInitial, limitWindowOverscan } from './Tokens.generated';
import {
  arenaAnchoredScroll, arenaRowEstimate, arenaRowStarts, arenaWindowPad, arenaWindowRange,
} from './components/display/arena-table/TableWindow';

interface Reading {
  offset: number;
  count: number;
  padTop: number;
  padBottom: number;
  head: number;
}

const ROWS = '[data-arena-part="table.row"], [data-arena-part="table.card"]';

const finite = (value: number | undefined): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const same = (a: Reading | null, b: Reading | null) => a === b || (a !== null && b !== null && a.offset === b.offset
  && a.count === b.count && a.padTop === b.padTop && a.padBottom === b.padBottom && a.head === b.head);

function stickyHead(box: HTMLElement): number {
  const th = box.querySelector('[data-arena-part="table.th"]');
  const view = box.ownerDocument.defaultView;
  if (!th || !view || view.getComputedStyle(th).position !== 'sticky') return 0;
  const row = th.closest('[data-arena-part="table.head-row"]') ?? th;
  return row.getBoundingClientRect().height;
}

function extentsOf(rows: readonly Element[]): number[] {
  const rects = rows.map((row) => row.getBoundingClientRect());
  return rects.map((rect, i) => {
    const next = rects[i + 1];
    const before = rects[i - 1];
    const gap = next ? next.top - rect.bottom : before ? rect.top - before.bottom : 0;
    return rect.height + Math.max(0, gap);
  });
}

interface Latest {
  rows: number;
  rowHeight: number | undefined;
  overscan: number;
  first: number;
}

interface Kept {
  extents: Map<number, number>;
  starts: number[];
  lead: number;
  head: number;
  dirty: boolean;
  rows: number;
  rowHeight: number | undefined;
}

function readBox(box: HTMLElement, latest: Latest, kept: Kept, watched: Set<Element>, observer: ResizeObserver,
  report: (next: Reading) => void): void {
  const mounted = Array.from(box.querySelectorAll(ROWS));
  for (const row of watched) {
    if (!mounted.includes(row)) { observer.unobserve(row); watched.delete(row); }
  }
  for (const row of mounted) {
    if (!watched.has(row)) { observer.observe(row); watched.add(row); }
  }
  const first = latest.first;
  let every = mounted.length > 0;
  extentsOf(mounted).forEach((size, i) => {
    const old = kept.extents.get(first + i);
    if (old === undefined || Math.abs(old - size) < 0.5) every = false;
    if (old === undefined || Math.abs(old - size) >= 0.5) { kept.extents.set(first + i, size); kept.dirty = true; }
  });
  if (every) {
    for (const index of Array.from(kept.extents.keys())) {
      if (index < first || index >= first + mounted.length) { kept.extents.delete(index); kept.dirty = true; }
    }
  }
  const table = mounted[0]?.closest('[data-arena-part="table"]');
  if (mounted[0] && table) kept.lead = mounted[0].getBoundingClientRect().top - table.getBoundingClientRect().top;
  kept.head = stickyHead(box);
  if (kept.rows !== latest.rows || kept.rowHeight !== latest.rowHeight) {
    kept.rows = latest.rows;
    kept.rowHeight = latest.rowHeight;
    kept.dirty = true;
  }
  const before = kept.starts;
  if (kept.dirty) {
    kept.starts = arenaRowStarts(latest.rows, kept.extents, arenaRowEstimate(kept.extents.values(), latest.rowHeight));
    kept.dirty = false;
  }
  let top = box.scrollTop;
  if (before !== kept.starts && before.length === kept.starts.length) {
    const anchored = arenaAnchoredScroll(top, before, kept.starts);
    if (Math.abs(anchored - top) >= 0.5) { box.scrollTop = anchored; top = anchored; }
  }
  const win = arenaWindowRange(top, box.clientHeight - kept.lead, kept.starts, latest.overscan, limitWindowInitial);
  const pad = arenaWindowPad(kept.starts, win);
  report({ offset: win.offset, count: win.count, padTop: pad.top, padBottom: pad.bottom, head: kept.head });
}

@Directive({
  selector: '[arenaRowWindow]',
  exportAs: 'arenaRowWindow',
  standalone: true,
  host: {
    '[style.overflow-anchor]': '"none"',
    '[style.scroll-padding-top.px]': 'stuck()',
  },
})
export class ArenaRowWindow {
  readonly total = input.required<number>();
  readonly rowHeight = input<number | undefined>(undefined);
  readonly overscan = input<number, number | undefined>(limitWindowOverscan,
    { transform: (value: number | undefined) => value ?? limitWindowOverscan });
  readonly enabled = input<boolean, unknown>(true, { transform: booleanAttribute });

  private readonly box = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reading = signal<Reading | null>(null, { equal: same });
  private readonly rows = computed(() => Math.max(0, Math.floor(finite(this.total()))));
  private readonly measured = computed(() => (this.enabled() ? this.reading() : null));

  readonly offset = computed(() => {
    const reading = this.measured();
    return reading ? Math.min(reading.offset, this.rows()) : 0;
  });
  readonly count = computed(() => {
    const reading = this.measured();
    const rows = this.rows();
    return reading ? Math.max(0, Math.min(reading.count, rows - this.offset())) : Math.min(rows, limitWindowInitial);
  });
  readonly padTop = computed(() => this.measured()?.padTop ?? 0);
  readonly padBottom = computed(() => this.measured()?.padBottom ?? 0);
  protected readonly stuck = computed(() => this.measured()?.head ?? 0);
  readonly slice = computed<ArenaTableSlice>(() => ({ total: finite(this.total()), offset: this.offset() }));

  private readonly latest: Latest = { rows: 0, rowHeight: undefined, overscan: limitWindowOverscan, first: 0 };
  private readonly kept: Kept = {
    extents: new Map<number, number>(),
    starts: [0],
    lead: 0,
    head: 0,
    dirty: true,
    rows: -1,
    rowHeight: undefined,
  };
  private run: (() => void) | null = null;
  private stop: (() => void) | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.release());
    afterRenderEffect(() => {
      const on = this.enabled();
      Object.assign(this.latest, {
        rows: this.rows(), rowHeight: this.rowHeight(), overscan: this.overscan(), first: this.offset(),
      });
      this.reading();
      if (!on) { this.release(); return; }
      if (this.run) this.run(); else this.hold();
    });
  }

  private release(): void {
    this.stop?.();
    this.stop = null;
    this.run = null;
  }

  private hold(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const target = this.box;
    const watched = new Set<Element>();
    let wrapper: Element | null = null;
    const observer = new ResizeObserver(() => this.run?.());
    const sync = () => {
      if (target.firstElementChild !== wrapper) {
        if (wrapper) observer.unobserve(wrapper);
        wrapper = target.firstElementChild;
        if (wrapper) observer.observe(wrapper);
      }
      readBox(target, this.latest, this.kept, watched, observer, (next) => this.reading.set(next));
    };
    observer.observe(target);
    target.addEventListener('scroll', sync, { passive: true });
    this.run = sync;
    this.stop = () => {
      target.removeEventListener('scroll', sync);
      observer.disconnect();
      watched.clear();
    };
    sync();
  }

  scrollToRow(index: number): void {
    const state = this.kept;
    const row = Math.min(Math.max(Math.floor(finite(index)), 0), Math.max(0, state.starts.length - 2));
    this.box.scrollTop = (state.starts[row] ?? 0) + state.lead - state.head;
  }

  onRowRequest(index: number): void {
    const state = this.kept;
    const box = this.box;
    const row = Math.min(Math.max(Math.floor(finite(index)), 0), Math.max(0, state.starts.length - 2));
    const top = (state.starts[row] ?? 0) + state.lead;
    const bottom = (state.starts[row + 1] ?? top) + state.lead;
    if (top - state.head < box.scrollTop) box.scrollTop = top - state.head;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }
}
