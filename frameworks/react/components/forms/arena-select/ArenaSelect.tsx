import React, { useId } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSelect.classes.generated.ts';

import type { ArenaSelectOption } from '../../../Api.generated';

export type { ArenaSelectOption };
export interface ArenaSelectProps {

  /** Field label above the control. */
  label?: string;

  /** An empty-valued first option, drawn before the choices and unselectable once a real one is made -- "Choose a customer". It is an option rather than an attribute because a native select has no placeholder, and it is what makes "nothing chosen yet" distinguishable from "the first choice". */
  placeholder?: string;

  /** The choices, drawn as native options. */
  options?: readonly ArenaSelectOption[];

  /** The selected option's value. */
  value?: string;

  /** Blocks the control and dims it. */
  disabled?: boolean;

  /** Must have a value for the form to submit. */
  required?: boolean;

  /** A line of help under the field. */
  hint?: string;

  /** Controlled error message. It is the whole validation surface here, unlike ArenaInput, which also takes a `validate` function: a native select offers a closed list, so there is no value to parse and nothing for a validator to reject that the options did not already prevent. */
  error?: string;

  /** Force the valid (green check) state. */
  valid?: boolean;

  /** Phosphor class name drawn at the field's start. */
  icon?: string;

  /** Submitted with the form. */
  name?: string;


  /** A different option was chosen; carries its value. */
  onChange?: (value: string) => void;
}

const arenaSelectStyles = arenaStyles(manifest);

export function ArenaSelect({
  label, placeholder, options = [], value, onChange, disabled = false, required = false,
  hint, error, valid = false, icon, name,
}: ArenaSelectProps) {
  const selectId = `select-${useId().replace(/:/g, '')}`;
  const noteId = `${selectId}-note`;

  const hasError = Boolean(error);
  const styles = arenaSelectStyles({
    state: hasError ? 'error' : valid ? 'valid' : 'neutral',
    disabled,
    hasIcon: Boolean(icon),
  });

  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      {label && <label htmlFor={selectId} className={styles.label()} data-arena-part={manifest.parts.label}>{label}</label>}
      <div className={styles.wrap()} data-arena-part={manifest.parts.wrap}>
        {icon && <i className={`${icon} ${styles.iconWrap()}`} data-arena-part={manifest.parts.iconWrap} aria-hidden="true" />}
        <select id={selectId} value={value} onChange={(e) => onChange && onChange(e.target.value)} disabled={disabled}
          required={required} name={name}
          aria-invalid={hasError || undefined} aria-describedby={error || hint ? noteId : undefined}
          className={styles.field()} data-arena-part={manifest.parts.field}>
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className={styles.caret()} data-arena-part={manifest.parts.caret} aria-hidden="true">▾</span>
      </div>
      {error
        ? <span id={noteId} className={styles.error()} data-arena-part={manifest.parts.error}>{error}</span>
        : hint && <span id={noteId} className={styles.hint()} data-arena-part={manifest.parts.hint}>{hint}</span>}
    </div>
  );
}
