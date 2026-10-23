import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaDividerStyles } from './ArenaDivider.variants';
import manifest from './ArenaDivider.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';

@Component({
  selector: 'arena-divider',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @if (word(); as text) {
      <div [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root">
        <span aria-hidden="true" [class]="styles().rule()" [arenaSlotData]="styles().$data.rule()" [attr.data-arena-part]="parts.rule"></span>
        <span [class]="styles().label()" [arenaSlotData]="styles().$data.label()" [attr.data-arena-part]="parts.label">{{ text }}</span>
        <span aria-hidden="true" [class]="styles().rule()" [arenaSlotData]="styles().$data.rule()" [attr.data-arena-part]="parts.rule"></span>
      </div>
    } @else {
      <hr [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root" />
    }
  `,
})
export class ArenaDivider {
  protected readonly parts = manifest.parts;

  /** The word drawn between two rules, plain text and never markup. Absent or blank, the divider is one <hr>. Arena draws it in the label register, so it is data rather than a slot. */
  readonly label = input<string>();

  protected readonly word = computed(() => {
    const text = this.label();
    return text?.trim() ? text : null;
  });

  protected readonly styles = computed(() => arenaDividerStyles({ labelled: this.word() !== null }));
}
