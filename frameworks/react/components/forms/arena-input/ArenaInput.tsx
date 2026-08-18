import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaInput.classes.generated.ts';

import type { ArenaInputType, ArenaValidateOn } from '../../../Api.generated';

export interface ArenaInputProps {

  /** Field label above the control. */
  label?: string;

  /** The control's id, and what the label's `for` points at. Generated from `label` when omitted, as `in-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose: the same markup must get the same id in every layer, and an ArenaInput and an ArenaTextarea sharing a label must not collide. */
  id?: string;

  /** A line of help under the field. */
  hint?: string;

  /** Controlled error message; wins over `validate`. */
  error?: string;

  /** Force the valid (green check) state. */
  valid?: boolean;

  /** Marks the label and the control required. */
  required?: boolean;

  /** Called on the value; returns the error message, or empty for valid. */
  validate?: (value: string) => string | null | undefined;

  /** When `validate` runs. */
  validateOn?: ArenaValidateOn;

  /** Native input type. */
  type?: ArenaInputType;

  /** Phosphor class name drawn at the field's start. */
  icon?: string;

  /** Static text Arena draws before the value, e.g. `git@`. */
  prefix?: string;

  /** The controlled text. */
  value?: string;

  /** Blocks editing and dims it. */
  disabled?: boolean;

  /** Shows the value but blocks editing. */
  readOnly?: boolean;

  /** Shown when empty. */
  placeholder?: string;

  /** Submitted with the form. */
  name?: string;

  /** The browser autofill hint. */
  autoComplete?: string;

  /** Minimum, for number/date types. */
  min?: string;

  /** Maximum, for number/date types. */
  max?: string;

  /** Step, for number/date types. */
  step?: string;

  /** Caps the length. */
  maxLength?: number;

  /** A regex the value must match. */
  pattern?: string;

  /** Edited; carries the new value. */
  onChange?: (value: string) => void;

  /** Left the field; carries the value. */
  onBlur?: (value: string) => void;
}


const arenaInputStyles = arenaStyles(manifest);

export interface ArenaInputHandle {
  focus(options?: FocusOptions): void;
  select(): void;
}

export const ArenaInput = forwardRef<ArenaInputHandle, ArenaInputProps>(function ArenaInput({
  label, id, hint, error, valid = false, required = false,
  validate, validateOn = 'blur', type = 'text',
  icon, prefix, value, disabled = false, readOnly = false,
  placeholder, name, autoComplete, min, max, step, maxLength, pattern,
  onChange, onBlur,
}: ArenaInputProps, handle) {
  const control = useRef<HTMLInputElement>(null);
  useImperativeHandle(handle, () => ({
    focus: (options?: FocusOptions) => control.current?.focus(options),
    select: () => control.current?.select(),
  }), []);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const inputId = id || (label ? 'in-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);

  const shownError = error != null ? error : (touched ? localErr : null);
  const isValid = !shownError && (valid || (touched && validate && localErr === null));

  const runValidate = (v: string) => { if (validate) setLocalErr(validate(v) || null); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { onChange && onChange(e.target.value); if (validateOn === 'change') { setTouched(true); runValidate(e.target.value); } };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => { setTouched(true); runValidate(e.target.value); onBlur && onBlur(e.target.value); };

  const styles = arenaInputStyles({
    state: shownError ? 'error' : isValid ? 'valid' : 'neutral',
    disabled,
    readonly: readOnly,
  });

  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      {label && (
        <label htmlFor={inputId} className={styles.label()} data-arena-part={manifest.parts.label}>
          {label}{required && <span className={styles.required()} data-arena-part={manifest.parts.required}>*</span>}
        </label>
      )}
      <div className={styles.field()} data-arena-part={manifest.parts.field}>
        {icon && <i className={`${icon} ${styles.icon()}`} data-arena-part={manifest.parts.icon} aria-hidden="true" />}
        {prefix && <span className={styles.prefix()} data-arena-part={manifest.parts.prefix}>{prefix}</span>}
        <input ref={control} id={inputId} type={type} value={value} disabled={disabled} readOnly={readOnly}
          required={required} aria-invalid={!!shownError} className={styles.input()} data-arena-part={manifest.parts.input}
          placeholder={placeholder} name={name} autoComplete={autoComplete}
          min={min} max={max} step={step} maxLength={maxLength} pattern={pattern}
          onBlur={handleBlur} onChange={handleChange} />
        {shownError && <i className={`ph-fill ph-warning-circle ${styles.statusIcon()}`} data-arena-part={manifest.parts.statusIcon} aria-hidden="true" />}
        {isValid && <i className={`ph-fill ph-check-circle ${styles.statusIcon()}`} data-arena-part={manifest.parts.statusIcon} aria-hidden="true" />}
      </div>
      {shownError ? <span className={styles.error()} data-arena-part={manifest.parts.error}>{shownError}</span>
        : hint && <span className={styles.hint()} data-arena-part={manifest.parts.hint}>{hint}</span>}
    </div>
  );
});
