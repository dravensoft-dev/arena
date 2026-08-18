import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output,
} from '@angular/core';
import type { ArenaOrientation, ArenaSwitchSize } from '../../../Api.generated';
import { arenaSwitchStyles } from './ArenaSwitch.variants';
import manifest from './ArenaSwitch.classes.generated';

export type SwitchFootprint = `${ArenaOrientation}-${ArenaSwitchSize}`;
export type SwitchThumb = `${'on' | 'off'}-${ArenaOrientation}`;

export function arenaFootprintFor(orientation: ArenaOrientation, size: ArenaSwitchSize): SwitchFootprint {
  return `${orientation}-${size}`;
}

export function arenaThumbFor(state: boolean, orientation: ArenaOrientation): SwitchThumb {
  return `${state ? 'on' : 'off'}-${orientation}`;
}

@Component({
  selector: 'arena-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root', },
  template: `
    <button type="button" role="switch" [class]="styles().track()" [attr.data-arena-part]="parts.track"
            [attr.aria-checked]="state()" [attr.aria-label]="label()"
            [disabled]="disabled()" (click)="activate()">
      <span [class]="styles().knob()" [attr.data-arena-part]="parts.knob" aria-hidden="true">
        @if (glyph()) {
          <i [class]="glyphClass()" [attr.data-arena-part]="parts.icon" aria-hidden="true"></i>
        }
      </span>
    </button>
    <span [class]="styles().label()" [attr.data-arena-part]="parts.label" (click)="activate()">
      {{ label() }}
      @if (confirm()) {
        <i [class]="guardClass()" [attr.data-arena-part]="parts.guard" aria-hidden="true" title="Requires confirmation"></i>
      }
    </span>
  `,
})
export class ArenaSwitch {
  protected readonly parts = manifest.parts;

  /** The current on/off value. Controlled: the consumer owns it and pushes it each render. */
  readonly state = input(false, { transform: booleanAttribute });
  /** Whether the switch lies horizontally or stands vertically. */
  readonly orientation = input<ArenaOrientation, ArenaOrientation | undefined>(
    'horizontal',
    { transform: (value) => value ?? 'horizontal' },
  );
  /** The switch's overall size. */
  readonly size = input<ArenaSwitchSize, ArenaSwitchSize | undefined>(
    'md',
    { transform: (value) => value ?? 'md' },
  );
  /** A Phosphor class name for the glyph shown while on. Arena draws the aria-hidden `<i>`. */
  readonly iconOn = input<string>();
  /** A Phosphor class name for the glyph shown while off. */
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

  protected readonly glyph = computed(() => (this.state() ? this.iconOn() : this.iconOff()));

  protected readonly styles = computed(() => arenaSwitchStyles({
    size: this.size(),
    orientation: this.orientation(),
    checked: this.state(),
    disabled: this.disabled(),
    footprint: arenaFootprintFor(this.orientation(), this.size()),
    thumb: arenaThumbFor(this.state(), this.orientation()),
  }));

  protected readonly glyphClass = computed(() => `${this.styles().icon()} ${this.glyph() ?? ''}`.trim());
  protected readonly guardClass = computed(() => `ph-bold ph-shield-check ${this.styles().guard()}`);

  protected activate(): void {
    if (this.disabled()) return;
    if (this.confirm()) {
      this.requestChange.emit();
      return;
    }
    if (this.state()) this.funcOff.emit();
    else this.funcOn.emit();
  }
}
