import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, computed, contentChildren,
  inject, input, output, signal, viewChildren,
} from '@angular/core';
import { FocusKeyManager, type FocusableOption } from '@angular/cdk/a11y';
import { ArenaTab } from '../arena-tab/ArenaTab';
import { ArenaTabsState } from './ArenaTabsState';
import { arenaTabsStyles } from './ArenaTabs.variants';
import manifest from './ArenaTabs.classes.generated';
import { ArenaIdGenerator } from '../../../ArenaIds';

@Component({
  selector: 'arena-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaTabsState],
  host: { style: 'display: contents' },
  template: `
    <div role="tablist" [class]="styles().root()" [attr.data-arena-part]="parts.root" (keydown)="onKeydown($event)">
      @for (tab of tabs(); track tab.value(); let i = $index) {
        <button #tabButton type="button" role="tab" [class]="tabClass(tab.value())" [attr.data-arena-part]="parts.tab"
                [attr.id]="tabId(tab.value())" [attr.aria-controls]="panelId(tab.value())"
                [attr.aria-selected]="tab.value() === active()"
                [attr.tabindex]="i === stopIndex() ? 0 : -1"
                (click)="select(tab.value())">{{ tab.label() }}</button>
      }
    </div>
    <ng-content />
  `,
})
export class ArenaTabs {
  protected readonly parts = manifest.parts;

  /** The selected tab's value. Omit and pass `defaultValue` to let it govern itself. */
  readonly value = input<string>();
  /** The initially selected value when uncontrolled. Defaults to the first tab. */
  readonly defaultValue = input<string>();
  /** A different tab was chosen; carries its value. */
  readonly change = output<string>();

  private readonly base = inject(ArenaIdGenerator).next('arena-tabs');
  private readonly chosen = signal<string | undefined>(undefined);
  private readonly state = inject(ArenaTabsState);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = contentChildren(ArenaTab);

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  private readonly options = computed<FocusableOption[]>(() => this.buttons()
    .map((ref) => ({ focus: () => ref.nativeElement.focus() })));

  private readonly keys = new FocusKeyManager(this.options, this.injector)
    .withHorizontalOrientation('ltr')
    .withVerticalOrientation(false)
    .withWrap();

  protected readonly active = computed(() => this.value()
    ?? this.chosen()
    ?? this.defaultValue()
    ?? this.tabs()[0]?.value());

  protected readonly stopIndex = computed(() => {
    const at = this.tabs().findIndex((tab) => tab.value() === this.active());
    return at === -1 ? 0 : at;
  });

  protected readonly styles = computed(() => arenaTabsStyles());

  constructor() {
    this.state.selected = this.active;
    this.state.tabId = (value: string) => this.idFor('tab', value);
    this.state.panelId = (value: string) => this.idFor('panel', value);

    const sub = this.keys.change.subscribe((index) => {
      const tab = this.tabs()[index];
      if (tab) this.select(tab.value());
    });
    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      this.keys.destroy();
    });
  }

  protected tabClass(value: string): string {
    return arenaTabsStyles({ selected: value === this.active() }).tab();
  }

  protected tabId(value: string): string | null {
    return this.idFor('tab', value);
  }

  protected panelId(value: string): string | null {
    return this.idFor('panel', value);
  }

  protected select(value: string): void {
    if (value === this.active()) return;
    this.chosen.set(value);
    this.change.emit(value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.keys.activeItemIndex !== this.stopIndex()) this.keys.updateActiveItem(this.stopIndex());
    this.keys.onKeydown(event);
  }

  private idFor(kind: 'tab' | 'panel', value: string): string | null {
    const at = this.tabs().findIndex((tab) => tab.value() === value);
    return at === -1 ? null : `${this.base}-${kind}-${at}`;
  }
}
