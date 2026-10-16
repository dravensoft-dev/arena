import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, numberAttribute, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { ArenaStepperStep } from '../../../Api.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaSlotAttributes } from '../../../SlotData';
import { arenaStepIndex, arenaStepReachable, arenaStepState } from './StepperState';
import { arenaStepperStyles } from './ArenaStepper.variants';
import manifest from './ArenaStepper.classes.generated';

export const ARENA_STEP_GLYPHS = { complete: 'ph-bold ph-check', error: 'ph-fill ph-warning-circle' } as const;

@Component({
  selector: 'arena-stepper',
  standalone: true,
  imports: [NgTemplateOutlet, ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @if (rows().length > 0) {
      <ol role="list" [attr.aria-label]="name()" [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root">
        @for (row of rows(); track $index) {
          <li [attr.aria-current]="row.state === 'current' ? 'step' : null" [class]="row.styles.step()" [arenaSlotData]="row.styles.$data.step()" [attr.data-arena-part]="parts.step">
            @if (row.reachable) {
              <button type="button" (click)="change.emit(row.index)" [class]="row.styles.trigger()" [arenaSlotData]="row.styles.$data.trigger()" [attr.data-arena-part]="parts.trigger">
                <ng-container [ngTemplateOutlet]="body" [ngTemplateOutletContext]="{ $implicit: row }" />
              </button>
            } @else {
              <div [class]="row.styles.trigger()" [arenaSlotData]="row.styles.$data.trigger()" [attr.data-arena-part]="parts.trigger">
                <ng-container [ngTemplateOutlet]="body" [ngTemplateOutletContext]="{ $implicit: row }" />
              </div>
            }
          </li>
        }
      </ol>
    }
    <ng-template #body let-row>
      <span aria-hidden="true" [class]="row.styles.rail()" [arenaSlotData]="row.styles.$data.rail()" [attr.data-arena-part]="parts.rail">
        <span [class]="row.styles.marker()" [arenaSlotData]="row.styles.$data.marker()" [attr.data-arena-part]="parts.marker">@if (row.glyph) {<i [class]="row.glyph + ' ' + row.styles.icon()" [arenaSlotData]="row.styles.$data.icon()" [attr.data-arena-part]="parts.icon"></i>} @else {{{ row.index + 1 }}}</span>
        @if (!row.last) {
          <span [class]="row.styles.connector()" [arenaSlotData]="row.styles.$data.connector()" [attr.data-arena-part]="parts.connector"></span>
        }
      </span>
      <span [class]="row.styles.text()" [arenaSlotData]="row.styles.$data.text()" [attr.data-arena-part]="parts.text">
        <span [class]="row.styles.name()" [arenaSlotData]="row.styles.$data.name()" [attr.data-arena-part]="parts.name">{{ row.name }}</span>
        <span [class]="row.styles.label()" [arenaSlotData]="row.styles.$data.label()" [attr.data-arena-part]="parts.label">{{ row.step.label }}</span>
        @if (row.step.description) {
          <span [class]="row.styles.description()" [arenaSlotData]="row.styles.$data.description()" [attr.data-arena-part]="parts.description">{{ row.step.description }}</span>
        }
      </span>
    </ng-template>
  `,
})
export class ArenaStepper {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);

  /** Names the list: which process this is the progress of, such as Checkout, never Steps. Required, and guarded at runtime after trimming: two steppers on one page are indistinguishable otherwise. */
  readonly ariaLabel = input.required<string>();
  /** The process, in order. Arena draws each step from its fields; an empty list draws nothing. */
  readonly steps = input.required<readonly ArenaStepperStep[]>();
  /** Which step is current, counted from zero. The steps before it are complete and the ones after it upcoming. A value at or past the number of steps marks every step complete, and a negative or non-finite one reads as 0. */
  readonly index = input(0, { transform: numberAttribute });
  /** Whether the steps behind the current one can be chosen. Only those steps become buttons: the current step and every step ahead stay text, so a reader never meets a dead control. */
  readonly interactive = input(false, { transform: booleanAttribute });
  /** A step behind the current one was chosen; carries its index, counted from zero. Never fires while `interactive` is false, nor for the current step or a later one. The host owns `index` and moves it. */
  readonly change = output<number>();

  protected readonly name = computed(() => {
    const name = this.ariaLabel();
    if (!name?.trim()) throw new Error('ArenaStepper: `ariaLabel` is required, and names the process the steps belong to');
    return name;
  });

  protected readonly styles = computed(() => arenaStepperStyles());

  protected readonly rows = computed(() => {
    this.name();
    const steps = this.steps();
    const current = arenaStepIndex(this.index(), steps.length);
    const words = { complete: this.locale.stepperComplete, current: this.locale.stepperCurrent, upcoming: this.locale.stepperUpcoming };
    return steps.map((step, index) => {
      const state = arenaStepState(index, current);
      const error = step.error === true;
      const reachable = arenaStepReachable(index, current, this.interactive());
      return {
        step, index, state, reachable,
        last: index === steps.length - 1,
        glyph: error ? ARENA_STEP_GLYPHS.error : state === 'complete' ? ARENA_STEP_GLYPHS.complete : undefined,
        name: error ? `${words[state]}, ${this.locale.stepperError}` : words[state],
        styles: arenaStepperStyles({ state, error, reachable }),
      };
    });
  });
}
