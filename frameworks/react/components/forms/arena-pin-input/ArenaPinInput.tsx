import React, { forwardRef, useEffect, useId, useImperativeHandle, useReducer, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPinInput.classes.generated.ts';

import type { ArenaPinCharacters } from '../../../Api.generated';
import type { ArenaPinInputClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import {
  arenaPinBackspace, arenaPinCode, arenaPinCompletes, arenaPinDelete, arenaPinFilter, arenaPinInputMode, arenaPinInsert, arenaPinKey,
  arenaPinLength, arenaPinMoveTo, arenaPinPattern, arenaPinTabStop, arenaPinTyped, type ArenaPinEdit,
} from './PinRules.ts';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon.tsx';

export type { ArenaPinCharacters };

export interface ArenaPinInputProps {
  className?: ArenaPinInputClass;

  /** Names the code, such as "Verification code", drawn above the cells and the group's accessible name. Required, and guarded at runtime: a blank one throws, because nothing can derive what a code is for. */
  label: string;

  /** How many cells, one per character. A value that is not a whole number of at least 1 reads as 6. */
  length?: number;

  /** Which characters a cell accepts, and which keypad a phone shows. A refused character changes nothing and fires no event. */
  characters?: ArenaPinCharacters;

  /** Hides what each cell holds, as a password field does. */
  masked?: boolean;

  /** The whole code. Absent, the cells hold what the person types; present, it controls them. A string shorter than `length` fills the first cells, and a character `characters` refuses is dropped. */
  value?: string;

  /** A line of help under the cells, and each cell's description. An error replaces it while one shows. */
  hint?: string;

  /** Controlled error message; the cells take the danger tone and turn invalid, and the message describes each cell while it shows. */
  error?: string;

  /** Force the valid (success-tone check) state. */
  valid?: boolean;

  /** Marks the label and sets the native `required` on every cell, so a native submission refuses a code with an empty cell. */
  required?: boolean;

  /** Blocks editing and dims it. */
  disabled?: boolean;

  /** Submitted with the form as the whole code, once, through a hidden input. The cells carry no name, so a form never receives one character on its own. */
  name?: string;

  /** The browser autofill hint, on every cell. A code that is not sent by text message, such as a device PIN, passes `off`. */
  autoComplete?: string;

  /** The code after an edit, whatever its length; a refused character fires nothing. The native change of the inner cell is never stopped, so a listener on the document hears it; this event carries the value. */
  onValueChange?: (value: string) => void;

  /** The code, when an edit makes it `length` characters long. Fires after `onValueChange`. A typed character fires it only when it completes the code anew. A paste or autofill of more than one character fires it whenever the code ends full. A `value` the host fills does not fire it. */
  onComplete?: (value: string) => void;

  /** Focus left the group; carries the code. A move from one cell to another is not a blur. */
  onBlur?: (value: string) => void;
}

const arenaPinInputStyles = arenaStyles(manifest);

export interface ArenaPinInputHandle {
  focus(options?: FocusOptions): void;
}

const mirroredAt = (element: Element) => {
  const dir = element.closest('[dir]')?.getAttribute('dir');
  return dir ? dir.toLowerCase() === 'rtl' : element.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl';
};

export const ArenaPinInput = forwardRef<ArenaPinInputHandle, ArenaPinInputProps>(function ArenaPinInput({
  className, label, length, characters = 'numeric', masked = false, value, hint, error, valid = false,
  required = false, disabled = false, name, autoComplete = 'one-time-code', onValueChange, onComplete, onBlur,
}: ArenaPinInputProps, handle) {
  if (!label?.trim()) throw new Error('ArenaPinInput: `label` is required, and names what the code is for');
  const locale = useArenaLocale();
  const base = `pin-${useId().replace(/:/g, '')}`;
  const cells = useRef<(HTMLInputElement | null)[]>([]);
  const total = arenaPinLength(length);

  const [held, setHeld] = useState(value ?? '');
  const [given, setGiven] = useState(value);
  if (given !== value) {
    setGiven(value);
    setHeld(value ?? '');
  }
  const code = arenaPinCode(value !== undefined ? value : held, total, characters);
  const [focused, setFocused] = useState<number | null>(null);
  const stop = focused === null ? arenaPinTabStop(code, total) : Math.min(focused, total - 1);

  useImperativeHandle(handle, () => ({
    focus: (options?: FocusOptions) => cells.current[0]?.focus(options),
  }), []);

  const [, answered] = useReducer((count: number) => count + 1, 0);
  const clamp = useRef(false);
  useEffect(() => {
    if (!clamp.current) return;
    clamp.current = false;
    const limit = arenaPinTabStop(code, total);
    if (focused !== null && focused > limit) cells.current[limit]?.focus();
  });

  const apply = (edit: ArenaPinEdit, inserted = 0) => {
    cells.current[edit.cell]?.focus();
    if (edit.code === code) return;
    setHeld(edit.code);
    onValueChange?.(edit.code);
    if (arenaPinCompletes(code, edit.code, total, inserted)) onComplete?.(edit.code);
    clamp.current = true;
    answered();
  };

  const onKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      apply(event.key === 'Backspace' ? arenaPinBackspace(code, index) : arenaPinDelete(code, index));
      return;
    }
    const move = arenaPinKey(event.key, mirroredAt(event.currentTarget));
    if (move === null) return;
    event.preventDefault();
    cells.current[arenaPinMoveTo(index, move, total)]?.focus();
  };

  const onInput = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = arenaPinTyped(code[index] ?? '', event.target.value);
    apply(arenaPinInsert(code, index, text, total, characters), arenaPinFilter(text, characters).length);
  };

  const onPaste = (index: number) => (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text');
    apply(arenaPinInsert(code, index, text, total, characters), arenaPinFilter(text, characters).length);
  };

  const onGroupBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setFocused(null);
    onBlur?.(code);
  };

  const shownError = error != null && error !== '' ? error : null;
  const isValid = !shownError && valid;
  const styles = arenaPinInputStyles({ state: shownError ? 'error' : isValid ? 'valid' : 'neutral', disabled });
  const noteId = shownError || hint ? `${base}-note` : undefined;

  return (
    <div className={arenaClassName('ArenaPinInput', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <span id={`${base}-label`} className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>
        {label}{required && <span className={styles.required()} data-arena-part={manifest.parts.required} {...styles.$data.required()} aria-hidden="true">*</span>}
      </span>
      <div role="group" aria-labelledby={`${base}-label`} onBlur={onGroupBlur}
        className={styles.group()} data-arena-part={manifest.parts.group} {...styles.$data.group()}>
        {Array.from({ length: total }, (_, index) => (
          <input key={index} ref={(element) => { cells.current[index] = element; }}
            type={masked ? 'password' : 'text'} inputMode={arenaPinInputMode(characters)} pattern={arenaPinPattern(characters)}
            autoComplete={autoComplete} autoCapitalize="off" spellCheck={false}
            value={code[index] ?? ''} tabIndex={index === stop ? 0 : -1}
            aria-label={arenaPhrase(locale.pinInputCell, { index: index + 1, total })}
            aria-invalid={!!shownError} aria-describedby={noteId} required={required} disabled={disabled}
            className={styles.cell()} data-arena-part={manifest.parts.cell} {...styles.$data.cell()}
            onFocus={() => setFocused(index)} onChange={onInput(index)} onKeyDown={onKeyDown(index)} onPaste={onPaste(index)} />
        ))}
        {shownError && <span className={styles.statusIcon()} data-arena-part={manifest.parts.statusIcon} {...styles.$data.statusIcon()} aria-hidden="true"><ArenaIcon icon="ph-fill ph-warning-circle" /></span>}
        {isValid && <span className={styles.statusIcon()} data-arena-part={manifest.parts.statusIcon} {...styles.$data.statusIcon()} aria-hidden="true"><ArenaIcon icon="ph-fill ph-check-circle" /></span>}
      </div>
      {name && <input type="hidden" name={name} value={code} disabled={disabled} />}
      {shownError ? <span id={noteId} className={styles.error()} data-arena-part={manifest.parts.error} {...styles.$data.error()}>{shownError}</span>
        : hint && <span id={noteId} className={styles.hint()} data-arena-part={manifest.parts.hint} {...styles.$data.hint()}>{hint}</span>}
    </div>
  );
});
