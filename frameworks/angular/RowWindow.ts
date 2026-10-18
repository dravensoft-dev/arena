import {
  afterRenderEffect, booleanAttribute, computed, DestroyRef, Directive, ElementRef, inject, input, signal,
} from '@angular/core';
import type { ArenaTableSlice } from './Api.generated';
import { limitWindowInitial, limitWindowOverscan } from './Tokens.generated';
import {
  arenaAnchoredScroll, arenaRowEstimate, arenaRowStarts, arenaWindowPad, arenaWindowRange, arenaWindowView,
} from './components/display/arena-table/TableWindow';
import {
  aimAt, finite, newKept, readBox,
  type RowWindowKept as Kept, type RowWindowLatest as Latest, type RowWindowMath, type RowWindowReading as Reading,
} from './RowWindowMeasure';

const MATH: RowWindowMath = {
  estimate: arenaRowEstimate, starts: arenaRowStarts, range: arenaWindowRange, pad: arenaWindowPad,
  view: arenaWindowView, anchored: arenaAnchoredScroll, initial: limitWindowInitial,
};

const same = (a: Reading | null, b: Reading | null) => a === b || (a !== null && b !== null && a.offset === b.offset
  && a.count === b.count && a.padTop === b.padTop && a.padBottom === b.padBottom && a.head === b.head
  && a.view === b.view);

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
  readonly slice = computed<ArenaTableSlice>(() => {
    const view = this.measured()?.view || undefined;
    const sits = { total: finite(this.total()), offset: this.offset() };
    return view === undefined ? sits : { ...sits, view };
  });

  private readonly latest: Latest = { rows: 0, rowHeight: undefined, overscan: limitWindowOverscan, first: 0 };
  private readonly kept: Kept = newKept();
  private run: (() => void) | null = null;
  private stop: (() => void) | null = null;
  private frame: number | null = null;

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
      if (!this.run) this.hold();
      else if (this.kept.aim) this.later();
      else this.run();
    });
  }

  private later(): void {
    const view = this.box.ownerDocument.defaultView;
    if (this.frame !== null || !view) return;
    this.frame = view.requestAnimationFrame(() => {
      this.frame = null;
      this.run?.();
    });
  }

  private release(): void {
    if (this.frame !== null) this.box.ownerDocument.defaultView?.cancelAnimationFrame(this.frame);
    this.frame = null;
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
      readBox(target, MATH, this.latest, this.kept, watched, observer, (next) => this.reading.set(next));
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
    aimAt(this.kept, this.box, { row: index, near: false });
  }

  onRowRequest(index: number): void {
    aimAt(this.kept, this.box, { row: index, near: true });
  }
}
