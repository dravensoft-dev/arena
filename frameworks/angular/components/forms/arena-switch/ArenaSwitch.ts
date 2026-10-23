import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, effect, inject, input, output,
} from '@angular/core';
import { arenaSwitchStyles } from './ArenaSwitch.variants';
import manifest from './ArenaSwitch.classes.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';
import { ArenaSlotAttributes } from '../../../SlotData';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

@Component({
  selector: 'arena-switch',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaControlBinding],
  host: { '[class]': 'styles().root()',
    '[attr.data-arena-disabled]': "styles().$data.root()['data-arena-disabled'] ?? null",
    '[attr.data-arena-part]': 'parts.root', },
  template: `
    <button type="button" role="switch" [class]="styles().track()" [arenaSlotData]="styles().$data.track()" [attr.data-arena-part]="parts.track"
            [attr.aria-checked]="drawn()" [attr.aria-label]="label()"
            [disabled]="off()" (click)="activate()">
      <span [class]="styles().knob()" [arenaSlotData]="styles().$data.knob()" [attr.data-arena-part]="parts.knob" aria-hidden="true">
        @if (glyph()) {
          <span [class]="styles().icon()" [arenaSlotData]="styles().$data.icon()" [attr.data-arena-part]="parts.icon" aria-hidden="true"><arena-icon [icon]="glyph()!" /></span>
        }
      </span>
    </button>
    <span [class]="styles().label()" [attr.data-arena-part]="parts.label" (click)="activate()">
      {{ label() }}
      @if (confirm()) {
        <span [class]="styles().guard()" [attr.data-arena-part]="parts.guard" aria-hidden="true" [title]="locale.switchConfirmHint"><arena-icon icon="ph-bold ph-shield-check" /></span>
      }
    </span>
  `,
})
export class ArenaSwitch {
  protected readonly parts = manifest.parts;
  private readonly binding = inject(ArenaControlBinding);
  protected readonly drawn = computed(() => (this.binding.bound() ? (this.binding.value() as boolean) : this.state()));
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());
  private readonly warned = effect(() => {
    if (this.binding.bound() && this.state() !== false) arenaWarnDoubleBinding('ArenaSwitch', 'state');
  });
  protected readonly locale = inject(ARENA_LOCALE);

  /** The current on/off value. Controlled: the consumer owns it and pushes it each render. */
  readonly state = input(false, { transform: booleanAttribute });
  /** A Phosphor class name for the glyph shown while on. ArenaIcon draws it, hidden from assistive technology. */
  readonly iconOn = input<string>();
  /** A Phosphor class name for the glyph shown while off, drawn through ArenaIcon. */
  readonly iconOff = input<string>();
  /** The accessible name for the switch, also drawn beside it. */
  readonly label = input.required<string>();
  /** Whether the switch is inoperable. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** When set, a change is not applied on the fly; it is requested through `requestChange` so the host can confirm it first. */
  readonly confirm = input(false, { transform: booleanAttribute });
  /** The switch was turned on. */
  readonly funcOn = output<void>();
  /** The switch was turned off. */
  readonly funcOff = output<void>();
  /** A change was requested while `confirm` is set: the host opens an ArenaConfirmDialog and, on confirmation, flips `state` (the requested value is always the negation of the current one). */
  readonly requestChange = output<void>();

  protected readonly glyph = computed(() => (this.drawn() ? this.iconOn() : this.iconOff()));

  protected readonly styles = computed(() => arenaSwitchStyles({
    state: this.drawn(),
    disabled: this.off(),
  }));


  protected activate(): void {
    if (this.off()) return;
    if (this.confirm()) {
      this.requestChange.emit();
      return;
    }
    if (this.drawn()) {
      this.funcOff.emit();
      this.binding.onChange(false);
    } else {
      this.funcOn.emit();
      this.binding.onChange(true);
    }
  }
}
