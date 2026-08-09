import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { arenaContainerWidth, arenaReadBreakpoint } from '../../../ContainerSize';
import { arenaBulkActionBarStyles } from './ArenaBulkActionBar.variants';
import type { ArenaBulkAction, ArenaBulkActionBarLayout } from '../../../Api.generated';

@Component({
  selector: 'arena-bulk-action-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.role]': "count() > 0 ? 'toolbar' : null",
    '[attr.aria-label]': "count() > 0 ? 'Actions on the selection' : null",
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    @if (count() > 0) {
      <span [class]="styles().count()">
        <b [class]="styles().number()">{{ count() }}</b> {{ noun() }} selected
      </span>
      <span [class]="styles().divider()" aria-hidden="true"></span>
      <div [class]="styles().actions()">
        @for (action of actions(); track action.label; let i = $index) {
          <button type="button" [class]="classesFor(action).action()" (click)="run.emit(action)"
                  [attr.tabindex]="i === at() ? 0 : -1" (focus)="cursor.set(i)">
            @if (action.icon; as glyph) {
              <span [class]="styles().actionIcon()"><i [class]="glyph" aria-hidden="true"></i></span>
            }
            {{ action.label }}
          </button>
        }
      </div>
      @if (clearable()) {
        <button type="button" [class]="styles().clear()" aria-label="Clear selection"
                [attr.tabindex]="actions().length === at() ? 0 : -1" (focus)="cursor.set(actions().length)"
                (click)="clear.emit()">Clear</button>
      }
    }
  `,
})
export class ArenaBulkActionBar {
  /** How many rows are selected. Zero renders no bar at all. */
  readonly count = input.required<number>();
  /** What is being counted, plural: "items", "projects". */
  readonly noun = input<string, string | undefined>('items', { transform: (value) => value ?? 'items' });
  /** The actions offered for the current selection. */
  readonly actions = input.required<readonly ArenaBulkAction[]>();
  /** Whether the bar may stack. 'auto' measures its OWN container, not the viewport, and drops the count, the actions and Clear onto separate rows when one row does not fit; 'inline' keeps the single row at every width, for a bar in a place the consumer knows is wide. It is a member rather than something a consumer reaches in with CSS because the alternative is what happens without it: reordering the bar's own children by position, which puts focus order out of step with visual order and breaks the next time anything inside moves. Stacking here reorders nothing, so the tab order and the reading order stay the same order they are wide. */
  readonly layout = input<ArenaBulkActionBarLayout, ArenaBulkActionBarLayout | undefined>(
    'auto',
    { transform: (value) => value ?? 'auto' },
  );
  /** Whether the Clear control is drawn. Every layer gates on this member and never on whether anything listens for `clear`, because Arena never derives what it draws from what a consumer listens for. */
  readonly clearable = input(true, { transform: booleanAttribute });
  /** An action was activated, carrying which one. */
  readonly run = output<ArenaBulkAction>();
  /** The Clear control was activated. */
  readonly clear = output<void>();

  protected readonly cursor = signal(0);
  protected readonly at = computed(() => {
    const stops = this.clearable() ? this.actions().length + 1 : this.actions().length;
    return Math.min(this.cursor(), Math.max(stops - 1, 0));
  });

  private readonly measured = arenaContainerWidth();
  private readonly small = arenaReadBreakpoint('sm');

  protected readonly narrow = computed(() => {
    const width = this.measured();
    return this.layout() === 'auto' && width !== null && width < this.small;
  });

  protected readonly styles = computed(() => arenaBulkActionBarStyles({
    open: this.count() > 0, narrow: this.narrow(),
  }));

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const els = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button'));
    if (els.length === 0) return;
    const here = els.indexOf(document.activeElement as HTMLElement);
    const from = here === -1 ? this.at() : here;
    const there = event.key === 'ArrowRight'
      ? (from + 1) % els.length
      : (from - 1 + els.length) % els.length;
    event.preventDefault();
    this.cursor.set(there);
    els[there].focus();
  }

  protected classesFor(action: ArenaBulkAction) {
    return arenaBulkActionBarStyles({ destructive: !!action.destructive, narrow: this.narrow() });
  }
}
