import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, numberAttribute } from '@angular/core';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaSlotAttributes } from '../../../SlotData';
import { arenaMeterStyles } from './ArenaMeter.variants';
import manifest from './ArenaMeter.classes.generated';
import {
  arenaMeterRange, arenaMeterReadout, arenaMeterShare, arenaMeterStanding, arenaMeterValue, arenaMeterValueText, arenaMeterWord,
} from './MeterStanding';

@Component({
  selector: 'arena-meter',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
  },
  template: `
    <div [class]="styles().head()" [arenaSlotData]="styles().$data.head()" [attr.data-arena-part]="parts.head">
      @if (showLabel()) {
        <span [class]="styles().label()" [arenaSlotData]="styles().$data.label()" [attr.data-arena-part]="parts.label">{{ name() }}</span>
      }
      <span [class]="styles().value()" [arenaSlotData]="styles().$data.value()" [attr.data-arena-part]="parts.value">{{ readout() }}</span>
      @if (word(); as standing) {
        <span [class]="styles().standing()" [arenaSlotData]="styles().$data.standing()" [attr.data-arena-part]="parts.standing">{{ standing }}</span>
      }
    </div>
    <div role="meter" [class]="styles().track()" [arenaSlotData]="styles().$data.track()" [attr.data-arena-part]="parts.track"
         [attr.aria-label]="name()" [attr.aria-valuenow]="clamped()" [attr.aria-valuemin]="range().min" [attr.aria-valuemax]="range().max"
         [attr.aria-valuetext]="spoken()">
      <span [class]="styles().fill()" [arenaSlotData]="styles().$data.fill()" [attr.data-arena-part]="parts.fill" [style.width.%]="share()"></span>
    </div>
  `,
})
export class ArenaMeter {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);

  /** Names what is measured. Drawn above the track and the meter's accessible name. Required, and guarded at runtime after trimming: nothing can derive what is measured, and a fallback of Meter tells a reader only what the component is. */
  readonly label = input.required<string>();
  /** The measurement, in the range's own unit. The drawing and aria-valuenow clamp it into the range, and a value that is not a finite number reads as min. The readout shows the number as passed. */
  readonly value = input.required<number>();
  /** The lower bound of the range. */
  readonly min = input(0, { transform: numberAttribute });
  /** The upper bound of the range. A max below min reads as min, so the range is never inverted. */
  readonly max = input(100, { transform: numberAttribute });
  /** The top of the low region, clamped into the range. Absent, it is min. A value equal to it is in the region above it. */
  readonly low = input<number | undefined>();
  /** The bottom of the high region, clamped into the range and never below low. Absent, it is max. A value equal to it is in the high region, except at max, where no high region opens and the value stays in the middle. */
  readonly high = input<number | undefined>();
  /** Where the best reading sits, which decides which region is good. Absent, it is the midpoint. With none of low, high and optimum given, no standing is derived and the fill paints the accent. */
  readonly optimum = input<number | undefined>();
  /** Draws the label above the track. False keeps the accessible name on the meter and hides the drawn label, for a cell whose row already says what is measured. */
  readonly showLabel = input(true, { transform: booleanAttribute });
  /** The reading as a person says it, such as 62 of 100 GB. The drawn readout shows this text, and aria-valuetext starts with it. Absent, the readout is the value written as a plain number. */
  readonly valueText = input<string>();

  protected readonly name = computed(() => {
    const text = this.label();
    if (!text?.trim()) throw new Error('ArenaMeter: `label` is required (it names what is measured, and nothing can derive that)');
    return text;
  });
  protected readonly range = computed(() => arenaMeterRange(this.min(), this.max(), this.low(), this.high(), this.optimum()));
  protected readonly clamped = computed(() => arenaMeterValue(this.value(), this.range()));
  protected readonly share = computed(() => arenaMeterShare(this.value(), this.range()));
  protected readonly standing = computed(() => arenaMeterStanding(this.value(), this.range()));
  protected readonly word = computed(() => arenaMeterWord(this.standing(), this.locale));
  protected readonly readout = computed(() => arenaMeterReadout(this.value(), this.range(), this.valueText()));
  protected readonly spoken = computed(() => arenaMeterValueText(this.readout(), this.word()));
  protected readonly styles = computed(() => arenaMeterStyles({ standing: this.standing() }));
}
