import React, { useEffect, useRef } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTextarea.classes.generated.ts';

export interface ArenaTextareaProps {

  /** Field label; the counter and error sit under the field. */
  label?: string;

  /** The control's id, and what the label's `for` points at. Generated from `label` when omitted, as `ta-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased: the derivation ArenaInput.id states, under this component's own prefix. */
  id?: string;

  /** A line of help under the field. */
  hint?: string;

  /** Error message; turns the border crimson and shows below. */
  error?: string;

  /** Marks the label and the control required. */
  required?: boolean;

  /** Shows a live length/maxLength count, which warns once the length is STRICTLY past nine tenths of `maxLength`; exactly at the share is not yet near the limit. */
  counter?: boolean;

  /** Grows with the content instead of scrolling. */
  autoResize?: boolean;

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

  /** Caps the length; feeds the counter. */
  maxLength?: number;

  /** Initial visible rows. */
  rows?: number;

  /** Edited; carries the new text. */
  onChange?: (value: string) => void;
}


export function arenaBorderBoxSlack(element: HTMLElement): number {
  return element.offsetHeight - element.clientHeight;
}

export function arenaFitToContent(element: HTMLElement | null): void {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight + arenaBorderBoxSlack(element)}px`;
}

const arenaTextareaStyles = arenaStyles(manifest);

export function ArenaTextarea({
  label, id, hint, error, required = false, rows = 4, maxLength, counter = false,
  disabled = false, readOnly = false, autoResize = false, placeholder, name, value, onChange,
}: ArenaTextareaProps) {
  const boxRef = useRef<HTMLTextAreaElement | null>(null);
  const taId = id || (label ? 'ta-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const len = typeof value === 'string' ? value.length : 0;
  const styles = arenaTextareaStyles({
    state: error ? 'error' : 'neutral',
    resize: autoResize ? 'none' : 'vertical',
    disabled,
    readonly: readOnly,
  });
  useEffect(() => {
    if (autoResize) arenaFitToContent(boxRef.current);
  }, [autoResize, value, rows]);
  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      {label && (
        <label htmlFor={taId} className={styles.label()} data-arena-part={manifest.parts.label}>
          {label}{required && <span className={styles.required()} data-arena-part={manifest.parts.required}>*</span>}
        </label>
      )}
      <textarea ref={boxRef} id={taId} rows={rows} maxLength={maxLength} disabled={disabled} required={required}
        readOnly={readOnly} placeholder={placeholder} name={name}
        aria-invalid={!!error} value={value}
        onChange={(e) => { if (autoResize) arenaFitToContent(e.target); onChange && onChange(e.target.value); }}
        className={styles.field()} data-arena-part={manifest.parts.field} />
      <div className={styles.foot()} data-arena-part={manifest.parts.foot}>
        {error ? <span className={styles.error()} data-arena-part={manifest.parts.error}>{error}</span>
          : hint ? <span className={styles.hint()} data-arena-part={manifest.parts.hint}>{hint}</span> : <span />}
        {counter && maxLength && (
          <span className={len > maxLength * 0.9 ? styles.counterNear() : styles.counter()}
            data-arena-part={manifest.parts.counter}>{`${len}/${maxLength}`}</span>
        )}
      </div>
    </div>
  );
}
