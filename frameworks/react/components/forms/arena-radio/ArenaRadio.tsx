import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaRadio.classes.generated.ts';
import type { ArenaRadioClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaRadioInjected {
  name: string;
  checked: boolean;
  onSelect: (value: string) => void;
}

export interface ArenaRadioProps {
  className?: ArenaRadioClass;


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

export function ArenaRadio({ className, value, label, hint, name, checked = false, onSelect, disabled = false }: ArenaRadioProps & Partial<ArenaRadioInjected>) {
  if (!value) throw new Error('ArenaRadio: `value` is required');
  const styles = arenaRadioStyles({ checked, disabled });
  return (
    <label className={arenaClassName('ArenaRadio', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <span className={styles.ring()} data-arena-part={manifest.parts.ring} {...styles.$data.ring()}>
        {checked && <span className={styles.dot()} data-arena-part={manifest.parts.dot} {...styles.$data.dot()} />}
      </span>
      <span className={styles.text()} data-arena-part={manifest.parts.text} {...styles.$data.text()}>
        {label && <span className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{label}</span>}
        {hint && <span className={styles.hint()} data-arena-part={manifest.parts.hint} {...styles.$data.hint()}>{hint}</span>}
      </span>
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled}
        onChange={() => onSelect && onSelect(value)} className={styles.input()} data-arena-part={manifest.parts.input} {...styles.$data.input()} />
    </label>
  );
}
