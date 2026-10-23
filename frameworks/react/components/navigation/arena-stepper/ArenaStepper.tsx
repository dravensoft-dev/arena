import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaStepper.classes.generated.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaStepperStep } from '../../../Api.generated';
import type { ArenaStepperClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaStepIndex, arenaStepReachable, arenaStepState } from './StepperState.ts';

export interface ArenaStepperProps {
  className?: ArenaStepperClass;

  /** Names the list: which process this is the progress of, such as Checkout, never Steps. Required, and guarded at runtime after trimming: two steppers on one page are indistinguishable otherwise. */
  ariaLabel: string;

  /** The process, in order. Arena draws each step from its fields; an empty list draws nothing. */
  steps: readonly ArenaStepperStep[];

  /** Which step is current, counted from zero. The steps before it are complete and the ones after it upcoming. A value at or past the number of steps marks every step complete, and a negative or non-finite one reads as 0. */
  index?: number;

  /** Whether the steps behind the current one can be chosen. Only those steps become buttons: the current step and every step ahead stay text, so a reader never meets a dead control. */
  interactive?: boolean;

  /** A step behind the current one was chosen; carries its index, counted from zero. Never fires while `interactive` is false, nor for the current step or a later one. The host owns `index` and moves it. */
  onChange?: (index: number) => void;
}

const stepperStyles = arenaStyles(manifest);

export const ARENA_STEP_GLYPHS = { complete: 'ph-bold ph-check', error: 'ph-fill ph-warning-circle' } as const;

export function ArenaStepper({ className, ariaLabel, steps, index = 0, interactive = false, onChange }: ArenaStepperProps) {
  if (!ariaLabel?.trim()) throw new Error('ArenaStepper: `ariaLabel` is required, and names the process the steps belong to');
  const locale = useArenaLocale();
  if (steps.length === 0) return null;
  const current = arenaStepIndex(index, steps.length);
  const words = { complete: locale.stepperComplete, current: locale.stepperCurrent, upcoming: locale.stepperUpcoming };
  const root = stepperStyles();
  return (
    <ol role="list" aria-label={ariaLabel} className={arenaClassName('ArenaStepper', root.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...root.$data.root()}>
      {steps.map((step, i) => {
        const state = arenaStepState(i, current);
        const error = step.error === true;
        const reachable = arenaStepReachable(i, current, interactive);
        const styles = stepperStyles({ state, error, reachable });
        const glyph = error ? ARENA_STEP_GLYPHS.error : state === 'complete' ? ARENA_STEP_GLYPHS.complete : undefined;
        const name = error ? `${words[state]}, ${locale.stepperError}` : words[state];
        const body = (
          <>
            <span aria-hidden="true" className={styles.rail()} data-arena-part={manifest.parts.rail} {...styles.$data.rail()}>
              <span className={styles.marker()} data-arena-part={manifest.parts.marker} {...styles.$data.marker()}>
                {glyph
                  ? <i className={`${glyph} ${styles.icon()}`} data-arena-part={manifest.parts.icon} {...styles.$data.icon()} />
                  : `${i + 1}`}
              </span>
              {i < steps.length - 1 && <span className={styles.connector()} data-arena-part={manifest.parts.connector} {...styles.$data.connector()} />}
            </span>
            <span className={styles.text()} data-arena-part={manifest.parts.text} {...styles.$data.text()}>
              <span className={styles.name()} data-arena-part={manifest.parts.name} {...styles.$data.name()}>{name}</span>
              <span className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{step.label}</span>
              {step.description && <span className={styles.description()} data-arena-part={manifest.parts.description} {...styles.$data.description()}>{step.description}</span>}
            </span>
          </>
        );
        return (
          <li key={i} aria-current={state === 'current' ? 'step' : undefined}
            className={styles.step()} data-arena-part={manifest.parts.step} {...styles.$data.step()}>
            {reachable
              ? <button type="button" onClick={() => onChange?.(i)} className={styles.trigger()} data-arena-part={manifest.parts.trigger} {...styles.$data.trigger()}>{body}</button>
              : <div className={styles.trigger()} data-arena-part={manifest.parts.trigger} {...styles.$data.trigger()}>{body}</div>}
          </li>
        );
      })}
    </ol>
  );
}
