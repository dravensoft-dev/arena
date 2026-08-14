import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { arenaCommandPaletteStyles } from './ArenaCommandPalette.variants';
import { isArenaPrimaryActivation } from '../../../AnchorActivation';
import { type FocusTrapState, arenaHandleOpenTransition, arenaTrapTabKey } from '../../../FocusTrap';
import type { ArenaCommand } from '../../../Api.generated';

let nextId = 0;

export function arenaFilterCommands(commands: readonly ArenaCommand[], query: string): ArenaCommand[] {
  const needle = query.toLowerCase();
  return commands.filter((command) => `${command.label} ${command.hint ?? ''}`.toLowerCase().includes(needle));
}

export function arenaCapCommands(commands: readonly ArenaCommand[], max: number | undefined): readonly ArenaCommand[] {
  return max === undefined || max < 0 ? commands : commands.slice(0, max);
}

export function arenaOrderCommands(commands: readonly ArenaCommand[]): ArenaCommand[] {
  const names: string[] = [];
  for (const command of commands) {
    if (command.group && !names.includes(command.group)) names.push(command.group);
  }
  return [
    ...commands.filter((command) => !command.group),
    ...names.flatMap((name) => commands.filter((command) => command.group === name)),
  ];
}

export interface CommandRow {
  command: ArenaCommand;
  index: number;
}

export interface ArenaCommandGroup {
  name: string | null;
  rows: CommandRow[];
}

export function arenaCommandGroups(ordered: readonly ArenaCommand[]): ArenaCommandGroup[] {
  const groups: ArenaCommandGroup[] = [];
  ordered.forEach((command, index) => {
    const name = command.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.rows.push({ command, index });
    else groups.push({ name, rows: [{ command, index }] });
  });
  return groups;
}

export function arenaNextActiveIndex(current: number, key: 'ArrowDown' | 'ArrowUp', count: number): number {
  if (count === 0) return 0;
  const last = count - 1;
  return key === 'ArrowDown' ? Math.min(current + 1, last) : Math.max(current - 1, 0);
}

export function arenaScrollRowIntoView(list: HTMLElement, index: number): void {
  const row = list.querySelectorAll('[role="option"]').item(index);
  if (row instanceof HTMLElement) row.scrollIntoView({ block: 'nearest' });
}

export function arenaOptionRowId(uid: string, index: number): string {
  return `${uid}-option-${index}`;
}

export function arenaActiveOptionId(uid: string, active: number, rowCount: number): string | undefined {
  return active >= 0 && active < rowCount ? arenaOptionRowId(uid, active) : undefined;
}

@Component({
  selector: 'arena-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '(click)': 'onScrimClick()',
  },
  template: `
    @if (open()) {
      <div #panel [class]="styles().panel()" role="dialog" aria-modal="true" aria-label="ArenaCommand palette"
           (click)="$event.stopPropagation()">
        <div [class]="styles().search()">
          <i [class]="styles().searchIcon() + ' ph-bold ph-magnifying-glass'" aria-hidden="true"></i>
          <input [class]="styles().input()" [value]="query()" [attr.placeholder]="placeholder()"
                 role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="true"
                 [attr.aria-controls]="listboxId" [attr.aria-activedescendant]="activeId()"
                 [attr.aria-label]="placeholder() || 'Search commands'"
                 (input)="onQuery($event)" (keydown)="onKey($event)" />
          <span [class]="styles().esc()">ESC</span>
        </div>
        <div #list [class]="styles().list()" [id]="listboxId" role="listbox" aria-label="Commands">
          @for (group of groups(); track group.name ?? '') {
          <div [class]="styles().group()" [attr.role]="group.name ? 'group' : null"
               [attr.aria-label]="group.name">
            @if (group.name; as heading) {
              <span [class]="styles().groupLabel()" aria-hidden="true">{{ heading }}</span>
            }
            @for (row of group.rows; track row.command.id ?? row.command.label) {
            @let i = row.index;
            @let command = row.command;
            @if (command.route; as target) {
              <a [id]="optionId(i)" role="option" [attr.aria-selected]="i === active()" tabindex="-1"
                 [href]="target"
                 [class]="styles().row() + ' ' + (i === active() ? styles().rowActive() : styles().rowDefault())"
                 (mouseenter)="onHover(i)" (click)="onRouteClick(command, $event)">
                @if (command.icon; as glyph) {
                  <span [class]="styles().rowIcon()"><i [class]="glyph" aria-hidden="true"></i></span>
                }
                <span [class]="styles().rowLabel() + ' ' + (i === active() ? styles().rowLabelActive() : styles().rowLabelDefault())">{{ command.label }}</span>
                @if (command.shortcut; as shortcut) {
                  <span [class]="styles().shortcut()">{{ shortcut }}</span>
                }
              </a>
            } @else {
            <button type="button" [id]="optionId(i)" role="option" [attr.aria-selected]="i === active()" tabindex="-1"
                    [class]="styles().row() + ' ' + (i === active() ? styles().rowActive() : styles().rowDefault())"
                    (mouseenter)="onHover(i)" (click)="onRun(command)">
              @if (command.icon; as glyph) {
                <span [class]="styles().rowIcon()"><i [class]="glyph" aria-hidden="true"></i></span>
              }
              <span [class]="styles().rowLabel() + ' ' + (i === active() ? styles().rowLabelActive() : styles().rowLabelDefault())">{{ command.label }}</span>
              @if (command.shortcut; as shortcut) {
                <span [class]="styles().shortcut()">{{ shortcut }}</span>
              }
            </button>
            }
            }
          </div>
          }
        </div>
        @if (filtered().length === 0) {
          <div [class]="styles().empty()">No results for "{{ query() }}".</div>
        }
      </div>
    }
  `,
})
export class ArenaCommandPalette {
  /** Whether the palette is shown. Closed renders nothing. */
  readonly open = input.required<boolean, unknown>({ transform: booleanAttribute });
  /** Every command the palette can find. Filtered by label and hint as the user types. */
  readonly commands = input.required<readonly ArenaCommand[]>();
  /** The search field's placeholder. */
  readonly placeholder = input<string, string | undefined>(
    'Search for an action or project…',
    { transform: (value) => value ?? 'Search for an action or project…' },
  );
  /** How many matches the list shows at most. Absent, all of them. The ceiling applies AFTER the query has run over every command, which is what makes it different from the caller trimming `commands` before passing them: a trimmed list cannot match what was cut, and a capped one can, so the first rows are still the best the whole set has. It is the palette's rather than the domain's, because how many rows help before the list stops being an accelerator is a property of this control; a caller who caps their own collection has guessed at it once, for one collection, with no query in hand. It is not ranking: the order stays the order the caller passed, ungrouped first and then each group as it first appears. */
  readonly maxResults = input<number>();
  /** The palette asked to be closed: Escape, the scrim, or a command having been run. */
  readonly close = output<void>();
  /** A command was activated, carrying which one. Emitted after close. For a command with `route` it fires for a primary click with no modifier and for Enter, both of which cancel the row's anchor first, so the two activations do the same thing and a host that routes here never navigates twice; a modified or middle click on such a row is the browser's, fires nothing and does not close the palette. */
  readonly run = output<ArenaCommand>();

  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly styles = computed(() => arenaCommandPaletteStyles({ open: this.open() }));
  protected readonly filtered = computed(() => arenaOrderCommands(
    arenaCapCommands(arenaFilterCommands(this.commands(), this.query()), this.maxResults()),
  ));

  protected readonly groups = computed(() => arenaCommandGroups(this.filtered()));

  private readonly doc = inject(DOCUMENT);
  private readonly uid = `arena-command-palette-${nextId++}`;
  protected readonly listboxId = `${this.uid}-listbox`;
  protected readonly activeId = computed(() => arenaActiveOptionId(this.uid, this.active(), this.filtered().length));

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private readonly focusTrap: FocusTrapState = { wasOpen: false, restoreTo: null };

  constructor() {
    effect(() => {
      if (this.open()) {
        this.query.set('');
        this.active.set(0);
      }
    });
    afterRenderEffect(() => {
      const isOpen = this.open();
      untracked(() => {
        arenaHandleOpenTransition(this.focusTrap, isOpen, this.panel()?.nativeElement ?? null, this.doc.activeElement);
      });
    });
    afterRenderEffect(() => {
      const index = this.active();
      const hasRows = this.filtered().length > 0;
      untracked(() => {
        const list = this.list()?.nativeElement;
        if (list && hasRows) arenaScrollRowIntoView(list, index);
      });
    });
  }

  protected optionId(index: number): string {
    return arenaOptionRowId(this.uid, index);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.active.set(0);
  }

  protected onHover(index: number): void {
    this.active.set(index);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.active.update((current) => arenaNextActiveIndex(current, event.key as 'ArrowDown' | 'ArrowUp', this.filtered().length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const command = this.filtered()[this.active()];
      if (command) this.onRun(command);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close.emit();
    } else if (event.key === 'Tab') {
      const panel = this.panel()?.nativeElement;
      if (panel) arenaTrapTabKey(panel, event, this.doc.activeElement);
    }
  }

  protected onRouteClick(command: ArenaCommand, event: MouseEvent): void {
    if (!isArenaPrimaryActivation(event)) return;
    event.preventDefault();
    this.onRun(command);
  }

  protected onRun(command: ArenaCommand): void {
    this.close.emit();
    this.run.emit(command);
  }

  protected onScrimClick(): void {
    if (this.open()) this.close.emit();
  }
}
