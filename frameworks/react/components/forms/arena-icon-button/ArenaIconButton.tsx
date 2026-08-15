import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaIconButton.classes.generated.ts';

import type { ArenaButtonType, ArenaControlSize, ArenaIconButtonVariant } from '../../../Api.generated';

export interface ArenaIconButtonProps {

  /** Phosphor class name, e.g. 'ph-bold ph-plus'. Arena draws the <i> and hides it from assistive technology; `label` is the accessible name. */
  icon: string;

  /** The accessible name, present in every state. Also the visible text when showLabel is set, and the title attribute when it is not. */
  label: string;
  /** Height, from the density tokens: the same scale ArenaButton uses, so the two re-densify together in a toolbar. */
  size?: ArenaControlSize;
  /** Visual treatment. */
  variant?: ArenaIconButtonVariant;

  /** Whether this control is a toggle, and whether it is currently on. Present, Arena writes aria-pressed and draws the on state with the same accent tint a current ArenaSideNav item takes, so "this one is on" is one statement across the library; absent, the control is not a toggle at all. The tri-state is the point and a default of false would destroy it: aria-pressed="false" on a plain button announces a toggle that is off rather than a button, so every ArenaIconButton in the system would announce as an unpressed toggle. The label does NOT change with the state, which is what the button pattern means by a toggle: a control that renames itself is announced as a different control rather than as the same one in another state. */
  pressed?: boolean;

  /** Shows the label as text beside the icon (H6). Don't rely on the title alone on touch or keyboard surfaces. */
  showLabel?: boolean;
  /** Blocks activation and dims the control. */
  disabled?: boolean;

  /** Native button behaviour. Defaults to 'button' so an icon button inside a form does not submit it by accident. */
  type?: ArenaButtonType;

  /** Submitted with the form, when the button submits one. */
  name?: string;

  /** The value submitted under `name`. */
  value?: string;

  /** Focused on mount. */
  autoFocus?: boolean;

  /** The id of the form this button belongs to, when it is not a descendant of it. */
  form?: string;

  /** Whether the control is reached from the page's Tab sequence. Set false when it lives inside a composite that manages its own focus (a grid with a roving tab stop, a menu), where reaching it by Tab would be a second way in. Arena writes tabindex="-1" and the control stays programmatically focusable; a positive tab order is not expressible and never should be. */
  tabStop?: boolean;

  /** The button was activated, by pointer or by keyboard. */
  onClick?: () => void;
}


const arenaIconButtonStyles = arenaStyles(manifest);

export function ArenaIconButton({
  icon, label, size = 'md', variant = 'ghost', pressed, showLabel = false, disabled = false,
  type = 'button', name, value, autoFocus = false, form, onClick, tabStop = true,
}: ArenaIconButtonProps) {
  if (!icon) throw new Error('ArenaIconButton: `icon` is required');
  if (!label) throw new Error('ArenaIconButton: `label` is required');
  const styles = arenaIconButtonStyles({ variant, size, showLabel, pressed });
  return (
    <button type={type} name={name} value={value} autoFocus={autoFocus} form={form} onClick={onClick}

      tabIndex={tabStop ? undefined : -1}
      aria-label={label} aria-pressed={pressed} title={showLabel ? undefined : label} disabled={disabled}
      className={styles.root()} data-arena-part={manifest.parts.root}>
      <i className={icon} aria-hidden="true" />
      {showLabel && <span className={styles.label()} data-arena-part={manifest.parts.label}>{label}</span>}
    </button>
  );
}
