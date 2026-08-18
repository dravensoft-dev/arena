import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input,
} from '@angular/core';
import { ArenaRadioGroupState } from '../arena-radio-group/ArenaRadioGroupState';
import { arenaRadioStyles } from './ArenaRadio.variants';
import manifest from './ArenaRadio.classes.generated';

@Component({
  selector: 'arena-radio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <label [class]="styles().root()" [attr.data-arena-part]="parts.root">
      <span [class]="styles().ring()" [attr.data-arena-part]="parts.ring">
        @if (checked()) {
          <span [class]="styles().dot()" [attr.data-arena-part]="parts.dot"></span>
        }
      </span>
      @if (label() || hint()) {
        <span [class]="styles().text()" [attr.data-arena-part]="parts.text">
          @if (label(); as text) {
            <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ text }}</span>
          }
          @if (hint(); as text) {
            <span [class]="styles().hint()" [attr.data-arena-part]="parts.hint">{{ text }}</span>
          }
        </span>
      }
      <input type="radio" [class]="styles().input()" [attr.data-arena-part]="parts.input" [attr.name]="groupName()"
             [attr.value]="value()" [checked]="checked()" [disabled]="disabled()"
             (change)="onChange($event)" />
    </label>
  `,
})
export class ArenaRadio {
  protected readonly parts = manifest.parts;

  /** This option's value, matched against the group's. */
  readonly value = input.required<string>();
  /** The option's label. */
  readonly label = input<string>();
  /** A line of help under the label. */
  readonly hint = input<string>();
  /** Blocks selection and dims the option. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly group = inject(ArenaRadioGroupState);

  protected readonly groupName = computed(() => this.group.groupName());
  protected readonly checked = computed(() => this.group.selected() === this.value());

  protected readonly styles = computed(() => arenaRadioStyles({
    checked: this.checked(), disabled: this.disabled(),
  }));

  protected onChange(event: Event): void {
    event.stopPropagation();
    if (!this.disabled()) this.group.choose(this.value());
  }
}
