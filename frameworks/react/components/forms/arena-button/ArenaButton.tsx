import React from 'react';

import type { ArenaButtonType, ArenaButtonVariant, ArenaControlSize } from '../../../Api.generated';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaButton.classes.generated.ts';

export interface ArenaButtonProps {

  /** The button's label. Sits between the two icons when both are given. */
  children?: React.ReactNode;
  /** Which action this is. Danger is outline, never filled. */
  variant?: ArenaButtonVariant;
  /** Height, from the density tokens, so the button re-densifies inside .arena-compact. */
  size?: ArenaControlSize;

  /** Phosphor class name drawn before the label. Replaced by the spinner while loading. */
  icon?: string;

  /** Phosphor class name drawn after the label: a caret on a menu trigger, an arrow on a next action. */
  iconRight?: string;

  /** Replaces the leading icon with a spinner and blocks activation. The spin slows under reduced motion rather than stopping: a frozen spinner reads as a hung process. */
  loading?: boolean;

  /** Stretches to the container's width. */
  full?: boolean;
  /** Blocks activation and dims the control. Implied by loading. */
  disabled?: boolean;

  /** Native button behaviour. Defaults to 'button' so a button inside a form does not submit it by accident. */
  type?: ArenaButtonType;

  /** Submitted with the form, when the button submits one. */
  name?: string;

  /** The value submitted under `name`. */
  value?: string;

  /** Focused on mount. */
  autoFocus?: boolean;

  /** The id of the form this button belongs to, when it is not a descendant of it. */
  form?: string;

  /** Whether the control is reached from the page's Tab sequence. Set false when it lives inside a composite that manages its own focus (a grid with a roving tab stop, a menu), where reaching it by Tab would be a second way in. Arena writes tabindex="-1" and the control stays programmatically focusable; a positive tab order is not expressible and never should be. ArenaTable's actions column is where this one is needed: an ArenaButton inside a row of a grid. */
  tabStop?: boolean;

  /** The button was activated, by pointer or by keyboard. */
  onClick?: () => void;
}


const arenaButtonStyles = arenaStyles(manifest);

export function ArenaButton({
  children, variant = 'primary', size = 'md', icon, iconRight,
  disabled = false, loading = false, full = false,
  type = 'button', name, value, autoFocus = false, form, onClick, tabStop = true,
}: ArenaButtonProps) {
  const styles = arenaButtonStyles({ variant, size, full });

  return (
    <button
      className={styles.root()} data-arena-part={manifest.parts.root}
      type={type}
      name={name}
      value={value}
      autoFocus={autoFocus}
      form={form}
      onClick={onClick}
      tabIndex={tabStop ? undefined : -1}
      disabled={disabled || loading}
    >
      {loading
        ? <span className={styles.spinner()} data-arena-part={manifest.parts.spinner} aria-hidden="true" />
        : icon && <i className={icon} aria-hidden="true" />}
      {children}
      {iconRight && <i className={iconRight} aria-hidden="true" />}
    </button>
  );
}
