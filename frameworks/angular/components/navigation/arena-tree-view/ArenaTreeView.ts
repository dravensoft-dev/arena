import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, booleanAttribute, computed, effect,
  inject, input, output, signal,
} from '@angular/core';
import type { ArenaTreeExpansion, ArenaTreeNode, ArenaTreeSelection } from '../../../Api.generated';
import { delayTypeahead } from '../../../Tokens.generated';
import { arenaWarnOnce } from '../../../WarnOnce';
import { arenaTypeAheadBuffer, arenaTypeAheadNext } from '../../../TypeAhead';
import { ArenaSlotAttributes } from '../../../SlotData';
import {
  arenaTreeIsBranch, arenaTreeLevel, arenaTreePosInSet, arenaTreeProblemMessage, arenaTreeSetSize,
  arenaTreeShape, arenaTreeStep, arenaTreeStop, arenaTreeToggled, arenaTreeVisible,
} from '../TreeModel';
import type { ArenaTreeKey } from '../TreeModel';
import { arenaTreeViewStyles } from './ArenaTreeView.variants';
import manifest from './ArenaTreeView.classes.generated';

const TREE_KEYS = new Set<string>(['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End']);

const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

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
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'tree',
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.aria-label]': 'treeLabel()',
    '[attr.aria-multiselectable]': "multiple() && selection() ? 'true' : null",
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    @for (id of visible(); track id) {
      @let row = rowOf(id);
      <div role="treeitem" [attr.tabindex]="id === stop() ? 0 : -1"
           [attr.aria-level]="row.level" [attr.aria-setsize]="row.setSize" [attr.aria-posinset]="row.posInSet"
           [attr.aria-expanded]="row.branch ? row.open : null"
           [attr.aria-selected]="selection() ? row.selected : null"
           [attr.aria-disabled]="row.disabled ? 'true' : null"
           [style.--arena-tree-depth]="row.level - 1"
           [class]="itemStyles(row).item()" [arenaSlotData]="itemStyles(row).$data.item()" [attr.data-arena-part]="parts.item"
           (focus)="focused.set(id)" (click)="press(id)">
        <span aria-hidden="true" [class]="styles().caret()" [attr.data-arena-part]="parts.caret"
              (click)="caretPress($event, row)">
          @if (row.branch) {
            <i [class]="row.open ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'"></i>
          }
        </span>
        @if (row.icon; as glyph) {
          <i aria-hidden="true" [class]="glyph + ' ' + styles().icon()" [attr.data-arena-part]="parts.icon"></i>
        }
        <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ row.label }}</span>
      </div>
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

  private readonly rows = computed(() => {
    const { shape } = this.model();
    const open = this.open();
    const chosen = this.chosen();
    return new Map(this.visible().map((id): [string, ArenaTreeRow] => {
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

  protected readonly styles = computed(() => arenaTreeViewStyles());

  constructor() {
    effect(() => {
      for (const problem of this.model().problems) arenaWarnOnce(arenaTreeProblemMessage(problem));
    });

    inject(DestroyRef).onDestroy(() => { if (this.clock !== null) clearTimeout(this.clock); });

    afterRenderEffect(() => {
      const stop = this.stop();
      const visible = this.visible();
      if (stop === undefined) return;
      const root = this.host.nativeElement;
      const doc = root.ownerDocument;
      const active = doc.activeElement;
      const inside = active !== null && root.contains(active);
      const lost = active === null || active === doc.body || !active.isConnected || active.contains(root);
      if (!inside && !(lost && this.held)) return;
      const target = root.querySelectorAll<HTMLElement>('[role="treeitem"]')[visible.indexOf(stop)];
      if (target && target !== active) target.focus();
    });
  }

  protected ngDoCheck(): void {
    const root = this.host.nativeElement;
    const active = root.ownerDocument?.activeElement ?? null;
    this.held = active !== null && root.contains(active);
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
      if ('focus' in move) this.focused.set(move.focus);
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
    if (target !== undefined) this.focused.set(target);
  }
}
