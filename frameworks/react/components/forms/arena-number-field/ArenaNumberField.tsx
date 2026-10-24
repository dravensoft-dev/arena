import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaNumberField.classes.generated.ts';

import type { ArenaNumberFormat, ArenaValidateOn } from '../../../Api.generated';
import type { ArenaNumberFieldClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaValueWriter } from '../../../DataVisuals.ts';
import {
  arenaCanonicalNumber, arenaClampNumber, arenaDraftText, arenaFieldFormat, arenaNumberBaseline, arenaNumberFieldIds,
  arenaNumberKey, arenaNumberSeparators, arenaParseNumber, arenaStepNumber,
} from '../NumberRules.ts';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon.tsx';

export interface ArenaNumberFieldProps {
  className?: ArenaNumberFieldClass;

  /** Names the number, such as "Replicas", and labels the field. Required, and guarded at runtime: a blank one throws, because nothing can derive what a number counts. */
  label: string;

  /** Draws the label above the field. False keeps the accessible name and drops the drawn text, for a field inside a row that already names it. */
  showLabel?: boolean;

  /** The field's id, and what the label's `for` points at. Generated from `label` when omitted, as `nf-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose. Identical markup must get an identical id in every layer, and two controls sharing a label must not collide. The hint or the error takes it followed by `-note`. */
  id?: string;

  /** A line of help under the field, and the field's description. An error replaces it while one shows. */
  hint?: string;

  /** Controlled error message; wins over `validate`, and describes the field while it shows. */
  error?: string;

  /** Force the valid (success-tone check) state. */
  valid?: boolean;

  /** Marks the label and sets the native `required` on the field, so a native submission refuses an empty one. */
  required?: boolean;

  /** Called on a committed number; returns the error message, or empty for valid. Never called for an empty field. */
  validate?: (value: number) => string;

  /** When `validate` runs: "blur" on a commit by blur or Enter, "change" on every commit, a key or stepper step included. */
  validateOn?: ArenaValidateOn;

  /** The committed number. Absent, the field is empty and holds what the person commits; present, it controls the field. A number outside `min` and `max` is drawn and announced at the nearest bound, and nothing is reported. */
  value?: number;

  /** The lowest number a commit keeps. Home goes to it, and the decrease stepper stops at it. */
  min?: number;

  /** The highest number a commit keeps. End goes to it, and the increase stepper stops at it. */
  max?: number;

  /** What an arrow key or a stepper adds or takes away; Page Up and Page Down move ten of it. A step lands on the decimal places of `step`, `min` and the number it starts from, and a typed number is clamped but never snapped to it. A step that is not a positive number reads as 1. */
  step?: number;

  /** How the value is written while the field is not being edited. Absent, or with no `locale`, it follows `ArenaLocale.locale`, and the field reads typed text in the same locale. `compact` is ignored, because 48.2K cannot be read back. */
  format?: ArenaNumberFormat;

  /** Static text Arena draws before the number, such as `$`. Spoken with the value, never typed. */
  prefix?: string;

  /** Static text Arena draws after the number, such as `kg`. Spoken with the value, never typed. */
  suffix?: string;

  /** Whether the decrease and increase buttons are drawn at the field's two ends. The steppers stay out of the Tab sequence: the field is the one stop, and its arrow keys do what they do. */
  steppers?: boolean;

  /** Blocks editing and both steppers, and dims the field. */
  disabled?: boolean;

  /** Shows the value at full contrast on the panel surface and blocks editing; no key and no stepper changes it. */
  readOnly?: boolean;

  /** Shown when empty. */
  placeholder?: string;

  /** Submitted with the form as the plain decimal string, such as `1234.5`, through a hidden input; empty when the field is empty. The drawn field carries formatted text and is never submitted. */
  name?: string;

  /** A number was committed, clamped, and differs from the one before; carries it. */
  onChange?: (value: number) => void;

  /** The field was committed empty. Never fires with `onChange` for one commit, and never for a field that was already empty. */
  onClear?: () => void;
}

const arenaNumberFieldStyles = arenaStyles(manifest);

export interface ArenaNumberFieldHandle {
  focus(options?: FocusOptions): void;
  select(): void;
}

type Commit = 'blur' | 'enter' | 'step';

export const ArenaNumberField = forwardRef<ArenaNumberFieldHandle, ArenaNumberFieldProps>(function ArenaNumberField({
  className, label, showLabel = true, id, hint, error, valid = false, required = false, validate, validateOn = 'blur',
  value, min, max, step = 1, format, prefix, suffix, steppers = true, disabled = false, readOnly = false,
  placeholder, name, onChange, onClear,
}: ArenaNumberFieldProps, handle) {
  if (!label?.trim()) throw new Error('ArenaNumberField: `label` is required, and names the number the field holds');
  const locale = useArenaLocale();
  const control = useRef<HTMLInputElement>(null);
  useImperativeHandle(handle, () => ({
    focus: (options?: FocusOptions) => control.current?.focus(options),
    select: () => control.current?.select(),
  }), []);

  const [held, setHeld] = useState<number | undefined>(value);
  const [given, setGiven] = useState<number | undefined>(value);
  if (given !== value) {
    setGiven(value);
    setHeld(value);
  }
  const shown = value !== undefined ? value : held;
  const committed = shown === undefined ? undefined : arenaClampNumber(shown, min, max);
  const [draft, setDraft] = useState<string | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const shape = arenaFieldFormat(format, locale.locale);
  const write = useMemo(() => arenaValueWriter({ format: shape }), [shape.locale, shape.fractionDigits, shape.grouping]);
  const spoken = useMemo(() => arenaValueWriter({ prefix, suffix, format: shape }), [prefix, suffix, shape.locale, shape.fractionDigits, shape.grouping]);
  const separators = useMemo(() => arenaNumberSeparators(shape.locale ?? locale.locale), [shape.locale, locale.locale]);
  const ids = arenaNumberFieldIds(id, label);
  const frozen = disabled || readOnly;

  const runValidate = (next: number | undefined) => {
    if (!validate) return;
    setLocalErr(next === undefined ? null : validate(next) || null);
  };

  const commit = (next: number | undefined, how: Commit) => {
    const kept = next === undefined ? undefined : arenaClampNumber(next, min, max);
    if (control.current && control.current === control.current.ownerDocument.activeElement) setDraft(arenaDraftText(kept, separators));
    if (how !== 'step' || validateOn === 'change') {
      setTouched(true);
      runValidate(kept);
    }
    if (kept === committed) return;
    setHeld(kept);
    if (kept === undefined) onClear?.();
    else onChange?.(kept);
  };

  const typed = () => {
    if (draft === null) return committed;
    const parsed = arenaParseNumber(draft, separators);
    return parsed === undefined || Number.isNaN(parsed) ? committed : parsed;
  };

  const stepBy = (steps: number) => {
    const from = typed();
    if (from === undefined) commit(arenaNumberBaseline(min, max), 'step');
    else commit(arenaStepNumber(from, steps, step, min, max), 'step');
  };

  const settle = (how: Commit) => {
    if (draft === null) return;
    const parsed = arenaParseNumber(draft, separators);
    if (parsed !== undefined && Number.isNaN(parsed)) {
      setDraft(how === 'blur' ? null : arenaDraftText(committed, separators));
      return;
    }
    commit(parsed, how);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { settle('enter'); return; }
    if (event.key === 'Escape') { setDraft(arenaDraftText(committed, separators)); return; }
    const key = arenaNumberKey(event.key);
    if (key === null || frozen) return;
    if (key === 'home' || key === 'end') {
      const bound = key === 'home' ? min : max;
      if (bound === undefined) return;
      event.preventDefault();
      commit(bound, 'step');
      return;
    }
    event.preventDefault();
    stepBy(key);
  };

  const shownError = error != null ? error : (touched ? localErr : null);
  const isValid = !shownError && (valid || (touched && validate !== undefined && committed !== undefined && localErr === null));
  const styles = arenaNumberFieldStyles({
    state: shownError ? 'error' : isValid ? 'valid' : 'neutral',
    steppers,
    disabled,
    readOnly,
  });
  const atMin = committed !== undefined && min !== undefined && committed <= min;
  const atMax = committed !== undefined && max !== undefined && committed >= max;
  const noteId = shownError || hint ? ids.note : undefined;

  const stepper = (steps: number, glyph: string, word: string, atBound: boolean) => (
    <button type="button" tabIndex={-1} aria-label={word} disabled={frozen || atBound}
      className={styles.stepper()} data-arena-part={manifest.parts.stepper} {...styles.$data.stepper()}
      onMouseDown={(event) => event.preventDefault()} onClick={() => stepBy(steps)}>
      <ArenaIcon icon={glyph} />
    </button>
  );

  return (
    <div className={arenaClassName('ArenaNumberField', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      {showLabel && (
        <label id={ids.label} htmlFor={ids.control} className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>
          {label}{required && <span className={styles.required()} data-arena-part={manifest.parts.required} {...styles.$data.required()} aria-hidden="true">*</span>}
        </label>
      )}
      <div className={styles.field()} data-arena-part={manifest.parts.field} {...styles.$data.field()}>
        {steppers && stepper(-1, 'ph-bold ph-minus', locale.numberFieldDecrease, atMin)}
        {prefix && <span className={styles.prefix()} data-arena-part={manifest.parts.prefix} {...styles.$data.prefix()} aria-hidden="true">{prefix}</span>}
        <input ref={control} id={ids.control} type="text" role="spinbutton" inputMode="decimal" autoComplete="off"
          value={draft ?? (committed === undefined ? '' : write(committed))}
          aria-valuenow={committed} aria-valuemin={min} aria-valuemax={max}
          aria-valuetext={committed === undefined ? undefined : spoken(committed)}
          aria-label={showLabel ? undefined : label} aria-invalid={!!shownError} aria-describedby={noteId}
          disabled={disabled} readOnly={readOnly} required={required} placeholder={placeholder}
          className={styles.input()} data-arena-part={manifest.parts.input} {...styles.$data.input()}
          onFocus={() => setDraft(arenaDraftText(committed, separators))}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => { settle('blur'); setDraft(null); }}
          onKeyDown={onKeyDown} />
        {suffix && <span className={styles.suffix()} data-arena-part={manifest.parts.suffix} {...styles.$data.suffix()} aria-hidden="true">{suffix}</span>}
        {shownError && <span className={styles.statusIcon()} data-arena-part={manifest.parts.statusIcon} {...styles.$data.statusIcon()} aria-hidden="true"><ArenaIcon icon="ph-fill ph-warning-circle" /></span>}
        {isValid && <span className={styles.statusIcon()} data-arena-part={manifest.parts.statusIcon} {...styles.$data.statusIcon()} aria-hidden="true"><ArenaIcon icon="ph-fill ph-check-circle" /></span>}
        {steppers && stepper(1, 'ph-bold ph-plus', locale.numberFieldIncrease, atMax)}
      </div>
      {name && <input type="hidden" name={name} value={arenaCanonicalNumber(committed)} disabled={disabled} />}
      {shownError ? <span id={ids.note} className={styles.error()} data-arena-part={manifest.parts.error} {...styles.$data.error()}>{shownError}</span>
        : hint && <span id={ids.note} className={styles.hint()} data-arena-part={manifest.parts.hint} {...styles.$data.hint()}>{hint}</span>}
    </div>
  );
});
