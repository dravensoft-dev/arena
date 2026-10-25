import {
  ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, booleanAttribute, computed, inject, input, output,
  untracked, viewChild,
} from '@angular/core';
import type { ArenaAppliedFilter } from '../../../Api.generated';
import { arenaContainerWidth, arenaReadBreakpoint } from '../../../ContainerSize';
import { arenaFilterBarStyles } from './ArenaFilterBar.variants';
import manifest from './ArenaFilterBar.classes.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaSlotAttributes } from '../../../SlotData';
import { ArenaTag } from '../../display/arena-tag/ArenaTag';
import {
  arenaFilterBarMayFocus, arenaFilterBarTarget, arenaFirstTabbable, type ArenaFilterBarPending,
} from './FilterBarFocus';

@Component({
  selector: 'arena-filter-bar',
  standalone: true,
  imports: [ArenaSlotAttributes, ArenaTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-narrow]': "styles().$data.root()['data-arena-narrow'] ?? null",
    '[attr.data-arena-part]': 'parts.root',
    role: 'group',
    '[attr.aria-label]': 'name()',
  },
  template: `
    <div #controls [class]="styles().controls()" [arenaSlotData]="styles().$data.controls()" [attr.data-arena-part]="parts.controls"
         data-arena-boundary (focusin)="pending = null"><ng-content /></div>
    @if (applied().length > 0) {
      <ul role="list" [attr.aria-label]="locale.filterBarApplied" [class]="styles().applied()" [attr.data-arena-part]="parts.applied">
        @for (filter of applied(); track filter.id; let index = $index) {
          <li [class]="styles().chip()" [attr.data-arena-part]="parts.chip">
            <arena-tag removable (remove)="onRemove(index, filter)">{{ filter.label }}</arena-tag>
          </li>
        }
      </ul>
      @if (clearable()) {
        <button type="button" [class]="styles().clear()" [arenaSlotData]="styles().$data.clear()" [attr.data-arena-part]="parts.clear"
                [attr.aria-label]="locale.filterBarClearLabel" (click)="onClear()">{{ locale.filterBarClear }}</button>
      }
    }
  `,
})
export class ArenaFilterBar {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Names the group of filters, such as "Deployment filters", never "Filters". Required, and guarded at runtime after trimming: a group with no name announces only that a group began. */
  readonly label = input.required<string>();
  /** The filters in effect, drawn as chips in a list after the controls. An empty list draws no chip row. */
  readonly applied = input<readonly ArenaAppliedFilter[], readonly ArenaAppliedFilter[] | undefined>(
    [],
    { transform: (value) => value ?? [] },
  );
  /** Whether Clear all is drawn while `applied` holds a filter. Every layer gates on this member and never on whether anything listens for `clear`. */
  readonly clearable = input(true, { transform: booleanAttribute });
  /** A chip's remove button was activated; carries the whole filter. Once the host drops it from `applied`, focus moves to the chip now in its place, else the last chip, else the first control. A control the person has moved to since keeps focus. */
  readonly remove = output<ArenaAppliedFilter>();
  /** Clear all was activated. Once the host empties `applied`, focus moves to the first control. */
  readonly clear = output<void>();

  protected pending: ArenaFilterBarPending = null;
  private shown: readonly string[] = [];
  private readonly controls = viewChild.required<ElementRef<HTMLElement>>('controls');
  private readonly measured = arenaContainerWidth();
  private readonly small = arenaReadBreakpoint('sm');

  protected readonly name = computed(() => {
    const label = this.label();
    if (label.trim() === '') throw new Error('ArenaFilterBar: `label` is required, and names the group of filters');
    return label;
  });

  private readonly ids = computed(() => this.applied().map((filter) => filter.id), {
    equal: (a, b) => a.length === b.length && a.every((id, index) => id === b[index]),
  });

  protected readonly narrow = computed(() => {
    const width = this.measured();
    return width !== null && width < this.small;
  });

  protected readonly styles = computed(() => arenaFilterBarStyles({ narrow: this.narrow() }));

  private readonly follow = afterRenderEffect(() => {
    const ids = this.ids();
    untracked(() => this.land(ids));
  });

  protected ngAfterContentInit(): void {
    const projected = [...this.controls().nativeElement.childNodes].filter(
      (node) => node.nodeType === node.ELEMENT_NODE
        || (node.nodeType === node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
    );
    if (projected.length === 0) {
      throw new Error('ArenaFilterBar: a filter bar with no controls is not a legal shape, because it would filter nothing');
    }
    this.shown = this.ids();
  }

  private land(ids: readonly string[]): void {
    const before = this.shown;
    this.shown = ids;
    const target = arenaFilterBarTarget(this.pending, before, ids);
    if (target === null) return;
    this.pending = null;
    const bar = this.host.nativeElement;
    const controls = this.controls().nativeElement;
    if (!arenaFilterBarMayFocus(bar.ownerDocument.activeElement, bar, controls)) return;
    if (target === 'content') {
      arenaFirstTabbable(controls)?.focus();
      return;
    }
    const chips = bar.querySelectorAll<HTMLElement>(`[data-arena-part="${this.parts.chip}"]`);
    chips.item(target.chip)?.querySelector<HTMLElement>('[data-arena-part="tag.close"]')?.focus();
  }

  protected onRemove(index: number, filter: ArenaAppliedFilter): void {
    this.pending = index;
    this.remove.emit(filter);
  }

  protected onClear(): void {
    this.pending = 'clear';
    this.clear.emit();
  }
}
