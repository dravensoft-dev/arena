import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ArenaAccordionState } from '../arena-accordion/ArenaAccordionState';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaSlotAttributes } from '../../../SlotData';
import { arenaAccordionItemStyles } from './ArenaAccordionItem.variants';
import manifest from '../arena-accordion/ArenaAccordion.classes.generated';

@Component({
  selector: 'arena-accordion-item',
  standalone: true,
  imports: [NgTemplateOutlet, ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().item()',
    '[attr.data-arena-part]': 'parts.item',
  },
  template: `
    <ng-template #header>
      <button type="button" [attr.id]="triggerId" [attr.aria-expanded]="isOpen()" [attr.aria-controls]="panelId"
              [attr.aria-disabled]="locked() ? 'true' : null" (click)="accordion.toggle(name())"
              [class]="styles().trigger()" [arenaSlotData]="styles().$data.trigger()" [attr.data-arena-part]="parts.trigger">
        <span [class]="styles().triggerLabel()" [arenaSlotData]="styles().$data.triggerLabel()" [attr.data-arena-part]="parts.triggerLabel">{{ text() }}</span>
        <i [class]="(isOpen() ? 'ph-bold ph-caret-down ' : 'ph-bold ph-caret-right ') + styles().caret()" [arenaSlotData]="styles().$data.caret()" [attr.data-arena-part]="parts.caret" aria-hidden="true"></i>
      </button>
    </ng-template>
    @switch (accordion.level()) {
      @case ('h1') { <h1 [class]="styles().heading()" [arenaSlotData]="styles().$data.heading()" [attr.data-arena-part]="parts.heading"><ng-container [ngTemplateOutlet]="header" /></h1> }
      @case ('h2') { <h2 [class]="styles().heading()" [arenaSlotData]="styles().$data.heading()" [attr.data-arena-part]="parts.heading"><ng-container [ngTemplateOutlet]="header" /></h2> }
      @case ('h4') { <h4 [class]="styles().heading()" [arenaSlotData]="styles().$data.heading()" [attr.data-arena-part]="parts.heading"><ng-container [ngTemplateOutlet]="header" /></h4> }
      @default { <h3 [class]="styles().heading()" [arenaSlotData]="styles().$data.heading()" [attr.data-arena-part]="parts.heading"><ng-container [ngTemplateOutlet]="header" /></h3> }
    }
    <div role="group" [attr.id]="panelId" [attr.aria-labelledby]="triggerId" [attr.hidden]="isOpen() ? null : ''"
         [class]="styles().panel()" [arenaSlotData]="styles().$data.panel()" [attr.data-arena-part]="parts.panel" data-arena-boundary><ng-content /></div>
  `,
})
export class ArenaAccordionItem {
  protected readonly parts = manifest.parts;

  /** The item's identity, and what the accordion's `value`, `values` and their events carry. Required, and guarded at runtime after trimming: two blank values cannot be told apart, and the two items would open together. */
  readonly value = input.required<string>();
  /** What the header reads, and the accessible name of the panel. Required, and guarded at runtime after trimming: a header with no words names nothing for the panel to borrow. */
  readonly label = input.required<string>();

  protected readonly accordion = inject(ArenaAccordionState);
  private readonly base = inject(ArenaIdGenerator).next('arena-accordion-item');
  protected readonly triggerId = `${this.base}-trigger`;
  protected readonly panelId = `${this.base}-panel`;

  protected readonly name = computed(() => {
    const value = this.value();
    if (!value?.trim()) throw new Error('ArenaAccordionItem: `value` is required, and two blank values would open together');
    return value;
  });

  protected readonly text = computed(() => {
    const label = this.label();
    if (!label?.trim()) throw new Error('ArenaAccordionItem: `label` is required, and it names the panel');
    return label;
  });

  protected readonly isOpen = computed(() => this.accordion.open().includes(this.name()));
  protected readonly locked = computed(() => this.isOpen() && this.accordion.keepsOneOpen());
  protected readonly styles = computed(() => arenaAccordionItemStyles({ open: this.isOpen() }));
}
