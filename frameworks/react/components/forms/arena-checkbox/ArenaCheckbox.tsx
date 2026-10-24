import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaCheckbox.classes.generated.ts';
import type { ArenaCheckboxClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaCheckboxProps {
  className?: ArenaCheckboxClass;


  /** Whether it is ticked. */
  checked?: boolean;

  /** The checkbox's accessible name, and the text beside the box unless `showLabel` is false. Required, and guarded at runtime after trimming: a checkbox with no name is announced as an unlabelled checkbox. */
  label: string;

  /** Whether the label is drawn beside the box. False keeps the name on the input for assistive technology and draws nothing, for a row-selection box with no room for text. */
  showLabel?: boolean;

  /** Blocks toggling and dims it. */
  disabled?: boolean;

  /** Must be checked for the form to submit. */
  required?: boolean;

  /** Submitted with the form. */
  name?: string;

  /** The value submitted under `name` when checked. */
  value?: string;

  /** Toggled; carries the new checked state. The native change of the inner box is never stopped, so a listener on the document hears it; this event carries the value. */
  onValueChange?: (checked: boolean) => void;
}


const arenaCheckboxStyles = arenaStyles(manifest);

export function ArenaCheckbox({ className, checked = false, onValueChange, label, showLabel = true, disabled = false, required = false, name, value }: ArenaCheckboxProps) {
  if (!label?.trim()) throw new Error('ArenaCheckbox: `label` is required, and names the checkbox');
  const styles = arenaCheckboxStyles({ checked, disabled });
  return (
    <label className={arenaClassName('ArenaCheckbox', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <span className={styles.box()} data-arena-part={manifest.parts.box} {...styles.$data.box()}>
        {checked && (
          <svg className={styles.check()} data-arena-part={manifest.parts.check} {...styles.$data.check()} viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {showLabel && <span className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{label}</span>}
      <input type="checkbox" checked={checked} name={name} value={value} required={required} aria-label={showLabel ? undefined : label}
        onChange={(e) => onValueChange && onValueChange(e.target.checked)} disabled={disabled}
        className={styles.input()} data-arena-part={manifest.parts.input} {...styles.$data.input()} />
    </label>
  );
}
