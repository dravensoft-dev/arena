import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaRadio.classes.generated.ts';

export interface ArenaRadioInjected {
  name: string;
  checked: boolean;
  onSelect: (value: string) => void;
}

export interface ArenaRadioProps {

  /** This option's value, matched against the group's. */
  value: string;

  /** The option's label. */
  label?: string;

  /** A line of help under the label. */
  hint?: string;

  /** Blocks selection and dims the option. */
  disabled?: boolean;
}


const arenaRadioStyles = arenaStyles(manifest);

export function ArenaRadio({ value, label, hint, name, checked = false, onSelect, disabled = false }: ArenaRadioProps & Partial<ArenaRadioInjected>) {
  if (!value) throw new Error('ArenaRadio: `value` is required');
  const styles = arenaRadioStyles({ checked, disabled });
  return (
    <label className={styles.root()} data-arena-part={manifest.parts.root}>
      <span className={styles.ring()} data-arena-part={manifest.parts.ring}>
        {checked && <span className={styles.dot()} data-arena-part={manifest.parts.dot} />}
      </span>
      <span className={styles.text()} data-arena-part={manifest.parts.text}>
        {label && <span className={styles.label()} data-arena-part={manifest.parts.label}>{label}</span>}
        {hint && <span className={styles.hint()} data-arena-part={manifest.parts.hint}>{hint}</span>}
      </span>
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled}
        onChange={() => onSelect && onSelect(value)} className={styles.input()} data-arena-part={manifest.parts.input} />
    </label>
  );
}
