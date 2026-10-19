import {
  ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, computed, inject, input, output, signal,
} from '@angular/core';
import type { ArenaHeadingLevel, ArenaValueSet } from '../../../Api.generated';
import { arenaWarnOnce } from '../../../WarnOnce';
import { ArenaAccordionState } from './ArenaAccordionState';
import { arenaAccordionStyles } from './ArenaAccordion.variants';
import manifest from './ArenaAccordion.classes.generated';

const NEXT: Record<string, (at: number, count: number) => number> = {
  ArrowDown: (at, count) => (at + 1) % count,
  ArrowUp: (at, count) => (at - 1 + count) % count,
  Home: () => 0,
  End: (_, count) => count - 1,
};

@Component({
  selector: 'arena-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaAccordionState],
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    'data-arena-boundary': '',
    '(keydown)': 'onKeydown($event)',
  },
  template: `<ng-content />`,
})
export class ArenaAccordion {
  protected readonly parts = manifest.parts;

  /** Whether several panels may be open at once. False reads `value`, `defaultValue` and `valueChange`; true reads `values`, `defaultValues` and `valuesChange`. The pair of the other mode is ignored, and a set one is warned about once. */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Without `multiple`, whether the open panel may be closed again. False keeps it open once one is open, and its header writes aria-disabled. Nothing opens by itself: seed `defaultValue` to start with one open. Ignored with `multiple`, where every press toggles. */
  readonly collapsible = input(true, { transform: booleanAttribute });
  /** The rung each header's heading takes. The rung defaults to `h3`, the card's rung under a section's `h2`. `none` is refused at runtime, because each label names its panel and a header is a heading. */
  readonly headingLevel = input<ArenaHeadingLevel, ArenaHeadingLevel | undefined>(
    'h3', { transform: (value) => value ?? 'h3' },
  );
  /** Without `multiple`, the open item's value, controlled. The empty string, or a value no item has, opens nothing. Omit it and pass `defaultValue` to let the accordion govern itself. */
  readonly value = input<string>();
  /** Without `multiple`, the item open at first render when uncontrolled. Absent, every panel starts closed. */
  readonly defaultValue = input<string>();
  /** Without `multiple`, a header was pressed; carries the value of the item now open, or the empty string when the open one closed. Fired on a press only, never when a controlled `value` merely changes. */
  readonly valueChange = output<string>();
  /** With `multiple`, the open items' values, controlled. A value no item has opens nothing. Omit it and pass `defaultValues` to let the accordion govern itself. */
  readonly values = input<readonly string[]>();
  /** With `multiple`, the items open at first render when uncontrolled. Absent, every panel starts closed. */
  readonly defaultValues = input<readonly string[]>();
  /** With `multiple`, a header was pressed; carries the whole set of open values that results, never a delta. Fired on a press only, never when controlled `values` merely change. */
  readonly valuesChange = output<ArenaValueSet>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly state = inject(ArenaAccordionState);
  private readonly single = signal<string | undefined>(undefined);
  private readonly many = signal<readonly string[] | undefined>(undefined);

  protected readonly level = computed(() => {
    const level = this.headingLevel();
    if (level === 'none') {
      throw new Error('ArenaAccordion: `headingLevel` cannot be none, because each header is a heading whose label names its panel');
    }
    return level;
  });

  private readonly active = computed(() => this.value() ?? this.single() ?? this.defaultValue() ?? '');

  protected readonly open = computed<readonly string[]>(() => {
    if (this.multiple()) {
      if (this.value() !== undefined || this.defaultValue() !== undefined) {
        arenaWarnOnce('ArenaAccordion: `value` and `defaultValue` are read only without `multiple`, so this accordion ignores them; pass `values` instead');
      }
      return this.values() ?? this.many() ?? this.defaultValues() ?? [];
    }
    if (this.values() !== undefined || this.defaultValues() !== undefined) {
      arenaWarnOnce('ArenaAccordion: `values` and `defaultValues` are read only with `multiple`, so this accordion ignores them; pass `value` instead');
    }
    return [this.active()];
  });

  protected readonly styles = computed(() => {
    this.level();
    this.open();
    return arenaAccordionStyles();
  });

  constructor() {
    this.state.open = this.open;
    this.state.level = this.level;
    this.state.keepsOneOpen = computed(() => !this.multiple() && !this.collapsible());
    this.state.toggle = (pressed: string) => this.toggle(pressed);
  }

  private toggle(pressed: string): void {
    if (this.multiple()) {
      const open = this.open();
      const next = open.includes(pressed) ? open.filter((v) => v !== pressed) : [...open, pressed];
      this.many.set(next);
      this.valuesChange.emit({ values: [...next] });
      return;
    }
    const active = this.active();
    if (pressed === active && !this.collapsible()) return;
    const next = pressed === active ? '' : pressed;
    this.single.set(next);
    this.valueChange.emit(next);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const move = NEXT[event.key];
    if (!move) return;
    const root = this.host.nativeElement;
    const own = Array.from(root.querySelectorAll<HTMLElement>(`[data-arena-part="${this.parts.trigger}"]`))
      .filter((trigger) => trigger.closest(`[data-arena-part="${this.parts.root}"]`) === root);
    const at = own.indexOf(event.target as HTMLElement);
    if (at === -1) return;
    event.preventDefault();
    own[move(at, own.length)]?.focus();
  }
}
