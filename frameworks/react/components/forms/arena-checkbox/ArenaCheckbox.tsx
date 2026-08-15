import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaCheckbox.classes.generated.ts';

export interface ArenaCheckboxProps {

  /** Whether it is ticked. */
  checked?: boolean;

  /** Text beside the box. */
  label?: string;

  /** Blocks toggling and dims it. */
  disabled?: boolean;

  /** Must be checked for the form to submit. */
  required?: boolean;

  /** Submitted with the form. */
  name?: string;

  /** The value submitted under `name` when checked. */
  value?: string;

  /** Toggled; carries the new checked state. */
  onChange?: (checked: boolean) => void;
}


const arenaCheckboxStyles = arenaStyles(manifest);

export function ArenaCheckbox({ checked = false, onChange, label, disabled = false, required = false, name, value }: ArenaCheckboxProps) {
  const styles = arenaCheckboxStyles({ checked, disabled });
  return (
    <label className={styles.root()} data-arena-part={manifest.parts.root}>
      <span className={styles.box()} data-arena-part={manifest.parts.box}>
        {checked && (
          <svg className={styles.check()} data-arena-part={manifest.parts.check} viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span className={styles.label()} data-arena-part={manifest.parts.label}>{label}</span>}
      <input type="checkbox" checked={checked} name={name} value={value} required={required}
        onChange={(e) => onChange && onChange(e.target.checked)} disabled={disabled}
        className={styles.input()} data-arena-part={manifest.parts.input} />
    </label>
  );
}
