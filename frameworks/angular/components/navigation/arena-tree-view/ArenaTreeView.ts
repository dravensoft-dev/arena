import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, booleanAttribute, computed, effect,
  inject, input, output, signal, untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { ArenaTreeExpansion, ArenaTreeNode, ArenaTreeSelection } from '../../../Api.generated';
import { delayTypeahead, limitWindowInitial, limitWindowOverscan } from '../../../Tokens.generated';
import { arenaWarnOnce } from '../../../WarnOnce';
import { arenaTypeAheadBuffer, arenaTypeAheadNext } from '../../../TypeAhead';
import { ArenaSlotAttributes } from '../../../SlotData';
import {
  arenaTreeCarry, arenaTreeIsBranch, arenaTreeLevel, arenaTreePosInSet, arenaTreeProblemMessage, arenaTreeSetSize,
  arenaTreeShape, arenaTreeStep, arenaTreeStop, arenaTreeToggled, arenaTreeVisible,
} from '../TreeModel';
import type { ArenaTreeKey } from '../TreeModel';
import {
  arenaAnchoredScroll, arenaRowEstimate, arenaRowStarts, arenaWindowPad, arenaWindowRange, arenaWindowView,
} from '../../display/arena-table/TableWindow';
import {
  aimAt, newKept, watchRowBox,
  type RowWindowKept, type RowWindowLatest, type RowWindowMath, type RowWindowParts, type RowWindowReading,
} from '../../../RowWindowMeasure';
import { arenaTreeViewStyles } from './ArenaTreeView.variants';
import manifest from './ArenaTreeView.classes.generated';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

const TREE_KEYS = new Set<string>(['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End']);

const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const MATH: RowWindowMath = {
  estimate: arenaRowEstimate, starts: arenaRowStarts, range: arenaWindowRange, pad: arenaWindowPad,
  view: arenaWindowView, anchored: arenaAnchoredScroll, initial: limitWindowInitial,
};

const PARTS: RowWindowParts = {
  rows: `[data-arena-part="${manifest.parts.item}"]`,
  frame: `[data-arena-part="${manifest.parts.rows}"]`,
  head: null,
  headRow: null,
};

const sameReading = (a: RowWindowReading | null, b: RowWindowReading | null) => a === b || (a !== null && b !== null
  && a.offset === b.offset && a.count === b.count && a.padTop === b.padTop && a.padBottom === b.padBottom);

interface ArenaTreeRow {
  id: string;
  label: string;
  icon: string | undefined;
  level: number;
  setSize: number;
  posInSet: number;
  branch: boolean;
  open: boolean;
  selected: boolean;
  disabled: boolean;
}

@Component({
  selector: 'arena-tree-view',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'tree',
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.aria-label]': 'treeLabel()',
    '[attr.aria-multiselectable]': "multiple() && selection() ? 'true' : null",
    '[attr.data-arena-windowed]': "styles().$data.root()['data-arena-windowed'] ?? null",
    '[style.overflow-anchor]': "windowed() ? 'none' : null",
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <ng-template #item let-id let-at="at">
      @let row = rowOf(id);
      <div role="treeitem" [attr.tabindex]="at === standIn() ? 0 : -1"
           [attr.aria-level]="row.level" [attr.aria-setsize]="row.setSize" [attr.aria-posinset]="row.posInSet"
           [attr.aria-expanded]="row.branch ? row.open : null"
           [attr.aria-selected]="selection() ? row.selected : null"
           [attr.aria-disabled]="row.disabled ? 'true' : null"
           [style.--arena-tree-depth]="row.level - 1"
           [class]="itemStyles(row).item()" [arenaSlotData]="itemStyles(row).$data.item()" [attr.data-arena-part]="parts.item"
           (focus)="onItemFocus(id)" (click)="press(id)">
        <span aria-hidden="true" [class]="styles().caret()" [attr.data-arena-part]="parts.caret"
              (click)="caretPress($event, row)">
          @if (row.branch) {
            <arena-icon [icon]="row.open ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" />
          }
        </span>
        @if (row.icon; as glyph) {
          <span aria-hidden="true" [class]="styles().icon()" [attr.data-arena-part]="parts.icon"><arena-icon [icon]="glyph" /></span>
        }
        <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ row.label }}</span>
      </div>
    </ng-template>
    @if (windowed()) {
      <div [style.padding-block-start.px]="padTop()" [style.padding-block-end.px]="padBottom()">
        <div [class]="styles().rows()" [attr.data-arena-part]="parts.rows">
          @for (entry of drawn(); track entry.id) {
            <ng-container *ngTemplateOutlet="item; context: { $implicit: entry.id, at: entry.at }" />
          }
        </div>
      </div>
    } @else {
      @for (id of visible(); track id; let index = $index) {
        <ng-container *ngTemplateOutlet="item; context: { $implicit: id, at: index }" />
      }
    }
  `,
})
export class ArenaTreeView {
  protected readonly parts = manifest.parts;

  /** Names the tree for assistive technology. Required and guarded at runtime: nothing can derive what the tree is of, and two trees on one page must not announce alike. Say what the nodes are, never "ArenaTreeView". */
  readonly label = input.required<string>();

  /** The whole tree, flat. Each node names its parent, and sibling order is array order. */
  readonly nodes = input.required<readonly ArenaTreeNode[]>();

  /** Which branches are open. Controlled: ArenaTreeView draws the caret and `aria-expanded`, and the consumer holds the open set and writes it back from `expandedChange`. A tree with no handler does not open. Absent, every branch is closed. */
  readonly expanded = input<ArenaTreeExpansion>();

  /** Which nodes are selected. Controlled: the consumer holds the set and writes it back from `selectionChange`. Absent, no item carries `aria-selected`, and the tree reports `activate` only, as a navigation tree does. */
  readonly selection = input<ArenaTreeSelection>();

  /** Whether more than one node can be selected. With it a press on a selected node unselects it, and the root carries `aria-multiselectable`. Without it a press replaces the selection. */
  readonly multiple = input(false, { transform: booleanAttribute });

  /** Whether the root scrolls inside the height its container gives it and draws only the rows near its viewport. The keyboard still reaches every visible node. Without it every visible node is drawn and the root does not scroll. */
  readonly windowed = input(false, { transform: booleanAttribute });

  /** A branch was opened or closed by the keyboard or the pointer, carrying the whole new open set. Write it back to `expanded` in the handler. The tree draws only the set it is given, and a tree with no handler never opens. */
  readonly expandedChange = output<ArenaTreeExpansion>();

  /** The selection changed, carrying the whole new set. The event fires only when the set changes, and never when `selection` is absent. Write it back to `selection` in the handler. */
  readonly selectionChange = output<ArenaTreeSelection>();

  /** A node was activated by Enter or by a press on its row, carrying its `id`. A disabled node is never activated. The caret's press opens or closes a branch and does not activate. */
  readonly activate = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly focused = signal<string | undefined>(undefined);
  private buffer = '';
  private clock: ReturnType<typeof setTimeout> | null = null;
  private held = false;
  private left: Node | null = null;

  protected readonly treeLabel = computed(() => {
    const name = this.label();
    if (!name?.trim()) throw new Error('ArenaTreeView: `label` is required');
    return name;
  });

  private readonly model = computed(() => {
    const nodes = this.nodes();
    if (nodes == null) throw new Error('ArenaTreeView: `nodes` is required');
    return arenaTreeShape(nodes);
  });

  private readonly open = computed(() => this.expanded()?.ids ?? []);
  private readonly chosen = computed(() => this.selection()?.ids ?? []);

  protected readonly visible = computed(() => arenaTreeVisible(this.model().shape, this.open()));

  protected readonly stop = computed(() => arenaTreeStop(this.model().shape, this.visible(), this.focused(), this.chosen()));

  private readonly reading = signal<RowWindowReading | null>(null, { equal: sameReading });
  private readonly measured = computed(() => (this.windowed() ? this.reading() : null));

  protected readonly offset = computed(() => {
    const reading = this.measured();
    return reading ? Math.min(reading.offset, this.visible().length) : 0;
  });

  private readonly count = computed(() => {
    const total = this.visible().length;
    const reading = this.measured();
    if (!this.windowed()) return total;
    return reading ? Math.max(0, Math.min(reading.count, total - this.offset())) : Math.min(total, limitWindowInitial);
  });

  protected readonly drawn = computed(() => {
    const offset = this.offset();
    return this.visible().slice(offset, offset + this.count()).map((id, index) => ({ id, at: offset + index }));
  });
  protected readonly padTop = computed(() => this.measured()?.padTop ?? 0);
  protected readonly padBottom = computed(() => this.measured()?.padBottom ?? 0);

  protected readonly standIn = computed(() => {
    const stop = this.stop();
    const at = stop === undefined ? -1 : this.visible().indexOf(stop);
    const count = this.count();
    return count === 0 ? -1 : Math.min(Math.max(at, this.offset()), this.offset() + count - 1);
  });

  private readonly latest: RowWindowLatest = { rows: 0, rowHeight: undefined, overscan: limitWindowOverscan, first: 0 };
  private kept: RowWindowKept = newKept();
  private seen: readonly string[] = [];
  private pending: string | null = null;
  private run: (() => void) | null = null;
  private release: (() => void) | null = null;
  private frame: number | null = null;

  private readonly rows = computed(() => {
    const { shape } = this.model();
    const open = this.open();
    const chosen = this.chosen();
    const ids = this.windowed() ? this.drawn().map((entry) => entry.id) : this.visible();
    return new Map(ids.map((id): [string, ArenaTreeRow] => {
      const node = shape.byId.get(id);
      return [id, {
        id,
        label: node?.label ?? '',
        icon: node?.icon,
        level: arenaTreeLevel(shape, id),
        setSize: arenaTreeSetSize(shape, id),
        posInSet: arenaTreePosInSet(shape, id),
        branch: arenaTreeIsBranch(shape, id),
        open: open.includes(id),
        selected: chosen.includes(id),
        disabled: node?.disabled === true,
      }];
    }));
  });

  protected readonly styles = computed(() => arenaTreeViewStyles({ windowed: this.windowed() }));

  constructor() {
    effect(() => {
      for (const problem of this.model().problems) arenaWarnOnce(arenaTreeProblemMessage(problem));
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.clock !== null) clearTimeout(this.clock);
      this.unwatch();
    });

    afterRenderEffect(() => {
      const on = this.windowed();
      const visible = this.visible();
      Object.assign(this.latest, { rows: visible.length, first: this.offset() });
      this.reading();
      const box = this.host.nativeElement;
      if (!on || typeof ResizeObserver === 'undefined') {
        if (this.run) { this.unwatch(); this.kept = newKept(); }
        this.seen = visible;
        this.reading.set(null);
        return;
      }
      if (this.run && !sameIds(this.seen, visible)) {
        const top = arenaTreeCarry(this.kept, box.scrollTop, this.seen, visible, MATH);
        if (top !== null) box.scrollTop = top;
      }
      this.seen = visible;
      if (!this.run) {
        const watch = watchRowBox(box, PARTS, MATH, this.latest, this.kept, (next) => this.reading.set(next));
        this.run = watch.run;
        this.release = watch.stop;
      } else if (this.kept.aim) this.later();
      else this.run();
    });

    afterRenderEffect(() => {
      const stop = this.stop();
      const at = this.visible().indexOf(stop ?? '') - this.offset();
      const root = this.host.nativeElement;
      const doc = root.ownerDocument;
      const active = doc.activeElement;
      if (this.left?.isConnected && !(active !== null && root.contains(active))) this.held = false;
      this.left = null;
      if (stop === undefined) return;
      const inside = active !== null && root.contains(active);
      const lost = active === null || active === doc.body || !active.isConnected || active.contains(root);
      const awaited = this.pending !== null && this.pending === stop;
      if (!inside && !(lost && (this.held || awaited))) {
        if (awaited && !lost) this.pending = null;
        return;
      }
      const target = at >= 0 && at < this.count() ? root.querySelectorAll<HTMLElement>('[role="treeitem"]')[at] : undefined;
      if (!target) {
        untracked(() => { if (stop !== this.focused()) this.moveTo(stop); });
        return;
      }
      this.pending = null;
      if (target !== active) target.focus();
    });
  }

  private later(): void {
    const view = this.host.nativeElement.ownerDocument.defaultView;
    if (this.frame !== null || !view) return;
    this.frame = view.requestAnimationFrame(() => {
      this.frame = null;
      this.run?.();
    });
  }

  private unwatch(): void {
    if (this.frame !== null) this.host.nativeElement.ownerDocument.defaultView?.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.release?.();
    this.release = null;
    this.run = null;
  }

  protected onFocusIn(): void {
    this.held = true;
    this.left = null;
  }

  protected onFocusOut(event: FocusEvent): void {
    const root = this.host.nativeElement;
    const next = event.relatedTarget as Node | null;
    if (next !== null) {
      if (!root.contains(next)) this.held = false;
      return;
    }
    this.left = event.target as Node | null;
    queueMicrotask(() => { this.held = root.contains(root.ownerDocument.activeElement); });
  }

  protected rowOf(id: string): ArenaTreeRow {
    return this.rows().get(id)!;
  }

  protected itemStyles(row: ArenaTreeRow) {
    return arenaTreeViewStyles({ selected: row.selected, disabled: row.disabled });
  }

  protected caretPress(event: MouseEvent, row: ArenaTreeRow): void {
    if (!row.branch) return;
    event.stopPropagation();
    this.toggle(row.id, !row.open);
  }

  protected press(id: string): void {
    if (this.model().shape.byId.get(id)?.disabled) return;
    this.select(id);
    this.activate.emit(id);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const stop = this.stop();
    if (event.ctrlKey || event.metaKey || event.altKey || stop === undefined) return;
    if (TREE_KEYS.has(event.key)) {
      event.preventDefault();
      const move = arenaTreeStep(this.model().shape, this.visible(), this.open(), stop, event.key as ArenaTreeKey);
      if (move === null) return;
      if ('focus' in move) this.moveTo(move.focus);
      else if ('open' in move) this.toggle(move.open, true);
      else this.toggle(move.close, false);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.press(stop);
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      if (!this.model().shape.byId.get(stop)?.disabled) this.select(stop);
      return;
    }
    if (Array.from(event.key).length === 1) {
      event.preventDefault();
      this.typeAhead(stop, event.key);
    }
  }

  protected onItemFocus(id: string): void {
    this.pending = null;
    this.focused.set(id);
  }

  private moveTo(id: string): void {
    this.focused.set(id);
    const index = this.visible().indexOf(id);
    const offset = this.offset();
    if (!this.windowed() || (index >= offset && index < offset + this.count())) { this.pending = null; return; }
    this.pending = id;
    aimAt(this.kept, this.host.nativeElement, { row: index, near: true });
    this.later();
  }

  private toggle(id: string, next: boolean): void {
    this.expandedChange.emit({ ids: arenaTreeToggled(this.open(), id, next) });
  }

  private select(id: string): void {
    if (!this.selection()) return;
    const chosen = this.chosen();
    const next = this.multiple()
      ? (chosen.includes(id) ? chosen.filter((kept) => kept !== id) : [...chosen, id])
      : [id];
    if (!sameIds(next, chosen)) this.selectionChange.emit({ ids: next });
  }

  private typeAhead(at: string, key: string): void {
    this.buffer = arenaTypeAheadBuffer(this.buffer, key);
    if (this.clock !== null) clearTimeout(this.clock);
    this.clock = setTimeout(() => { this.buffer = ''; this.clock = null; }, delayTypeahead);
    const visible = this.visible();
    const { shape } = this.model();
    const labels = visible.map((id) => shape.byId.get(id)?.label ?? '');
    const target = visible[arenaTypeAheadNext(labels, visible.indexOf(at), this.buffer)];
    if (target !== undefined) this.moveTo(target);
  }
}
