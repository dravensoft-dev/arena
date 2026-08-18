import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSwitch.classes.generated.ts';

import type { ArenaOrientation, ArenaSwitchSize } from '../../../Api.generated';

export interface ArenaSwitchProps {
  /** The current on/off value. Controlled: the consumer owns it and pushes it each render. */
  state?: boolean;
  /** Whether the switch lies horizontally or stands vertically. */
  orientation?: ArenaOrientation;
  /** The switch's overall size. */
  size?: ArenaSwitchSize;
  /** A Phosphor class name for the glyph shown while on. Arena draws the aria-hidden `<i>`. */
  iconOn?: string;
  /** A Phosphor class name for the glyph shown while off. */
  iconOff?: string;
  /** The accessible name for the switch, also drawn beside it. */
  label: string;
  /** Whether the switch is inoperable. */
  disabled?: boolean;
  /** When set, a change is not applied on the fly; it is requested through `requestChange` so the host can confirm it first. */
  confirm?: boolean;
  /** The switch was turned on. */
  onFuncOn?: () => void;
  /** The switch was turned off. */
  onFuncOff?: () => void;
  /** A change was requested while `confirm` is set: the host opens an ArenaConfirmDialog and, on confirmation, flips `state` (the requested value is always the negation of the current one). */
  onRequestChange?: () => void;
}


const arenaSwitchStyles = arenaStyles(manifest);

export function ArenaSwitch({
  state = false, orientation = 'horizontal', size = 'md',
  iconOn, iconOff, label, disabled = false, confirm = false,
  onFuncOn, onFuncOff, onRequestChange,
}: ArenaSwitchProps) {
  if (!label) throw new Error('ArenaSwitch: `label` is required (a switch must have an accessible name)');
  const icon = state ? iconOn : iconOff;
  const styles = arenaSwitchStyles({
    size,
    orientation,
    checked: state,
    disabled,
    footprint: `${orientation}-${size}`,
    thumb: `${state ? 'on' : 'off'}-${orientation}`,
  });

  const activate = () => {
    if (disabled) return;
    if (confirm) { onRequestChange && onRequestChange(); return; }
    if (state) { onFuncOff && onFuncOff(); } else { onFuncOn && onFuncOn(); }
  };

  return (
    <span className={styles.root()} data-arena-part={manifest.parts.root}>
      <button type="button" role="switch" aria-checked={state} aria-label={label} disabled={disabled} onClick={activate}
        className={styles.track()} data-arena-part={manifest.parts.track}>
        <span aria-hidden="true" className={styles.knob()} data-arena-part={manifest.parts.knob}>
          {icon && <i aria-hidden="true" className={`${icon} ${styles.icon()}`} data-arena-part={manifest.parts.icon} />}
        </span>
      </button>
      {label && (
        <span onClick={activate} className={styles.label()} data-arena-part={manifest.parts.label}>
          {label}
          {confirm && <i className={`ph-bold ph-shield-check ${styles.guard()}`} data-arena-part={manifest.parts.guard} aria-hidden="true" title="Requires confirmation" />}
        </span>
      )}
    </span>
  );
}
