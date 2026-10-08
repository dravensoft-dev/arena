import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSwitch.classes.generated.ts';

import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaSwitchClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaSwitchProps {
  className?: ArenaSwitchClass;

  /** The current on/off value. Controlled: the consumer owns it and pushes it each render. */
  state?: boolean;
  /** A Phosphor class name for the glyph shown while on. Arena draws the aria-hidden `<i>`. */
  iconOn?: string;
  /** A Phosphor class name for the glyph shown while off. */
  iconOff?: string;
  /** The accessible name for the switch, also drawn beside it. */
  label: string;
  /** Whether the switch is inoperable. */
  disabled?: boolean;
  /** When set, a change is not applied on the fly; it is requested through `onRequestChange` so the host can confirm it first. */
  confirm?: boolean;
  /** The switch was turned on. */
  onFuncOn?: () => void;
  /** The switch was turned off. */
  onFuncOff?: () => void;
  /** A change was requested while `confirm` is set: the host opens an ArenaConfirmDialog and, on confirmation, flips `state` (the requested value is always the negation of the current one). */
  onRequestChange?: () => void;
}


const arenaSwitchStyles = arenaStyles(manifest);

export function ArenaSwitch({ className, 
  state = false,
  iconOn, iconOff, label, disabled = false, confirm = false,
  onFuncOn, onFuncOff, onRequestChange,
}: ArenaSwitchProps) {
  const locale = useArenaLocale();
  if (!label) throw new Error('ArenaSwitch: `label` is required (a switch must have an accessible name)');
  const icon = state ? iconOn : iconOff;
  const styles = arenaSwitchStyles({ state, disabled });

  const activate = () => {
    if (disabled) return;
    if (confirm) { onRequestChange && onRequestChange(); return; }
    if (state) { onFuncOff && onFuncOff(); } else { onFuncOn && onFuncOn(); }
  };

  return (
    <span className={arenaClassName('ArenaSwitch', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <button type="button" role="switch" aria-checked={state} aria-label={label} disabled={disabled} onClick={activate}
        className={styles.track()} data-arena-part={manifest.parts.track} {...styles.$data.track()}>
        <span aria-hidden="true" className={styles.knob()} data-arena-part={manifest.parts.knob} {...styles.$data.knob()}>
          {icon && <i aria-hidden="true" className={`${icon} ${styles.icon()}`} data-arena-part={manifest.parts.icon} {...styles.$data.icon()} />}
        </span>
      </button>
      {label && (
        <span onClick={activate} className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>
          {label}
          {confirm && <i className={`ph-bold ph-shield-check ${styles.guard()}`} data-arena-part={manifest.parts.guard} {...styles.$data.guard()} aria-hidden="true" title={locale.switchConfirmHint} />}
        </span>
      )}
    </span>
  );
}
