import React, { useEffect, useId, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaCombobox.classes.generated.ts';
import { sp1 } from '../../../Tokens.generated.js';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import { ARENA_PANEL_POPOVER, useArenaAnchoredPanel } from '../../../UseAnchoredPanel.ts';
import {
  arenaActiveOptionId, arenaCommitText, arenaFilterOptions, arenaOpeningOption, arenaOptionId,
  arenaStepOption,
} from './ComboboxRules.ts';

import type { ArenaComboboxFilter, ArenaSelectOption } from '../../../Api.generated';
import type { ArenaComboboxClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export type { ArenaComboboxFilter, ArenaSelectOption };
export { arenaFilterOptions } from './ComboboxRules.ts';

export interface ArenaComboboxProps {
  className?: ArenaComboboxClass;


  /** The control's accessible name. Required, and guarded at runtime after trimming: a combobox with no name is announced as an unlabelled edit field. */
  label: string;

  /** Whether the label is drawn above the field. False keeps the name for assistive technology and draws nothing, for a filter row with no room for a label. */
  showLabel?: boolean;

  /** Shown in the empty field. A hint about what to type, never an option. */
  placeholder?: string;

  /** The choices, in the order the list draws them. */
  options?: readonly ArenaSelectOption[];

  /** The chosen option's value. A value that neither the options nor an earlier choice holds draws an empty field with the placeholder and posts the empty string. */
  value?: string;

  /** Options are being fetched. The list reports itself busy and draws a status line in place of the empty one. Declared, never inferred from the options. */
  loading?: boolean;

  /** Who narrows the options by the typed text: the control itself, or the host, which listens to search and passes the options it found. A declared member rather than a reading of whether search is listened to. */
  filter?: ArenaComboboxFilter;

  /** Blocks the control and dims it. */
  disabled?: boolean;

  /** Must have a value for the form to submit. An emptied field on a required control restores the chosen label instead of clearing it. */
  required?: boolean;

  /** A line of help under the field. */
  hint?: string;

  /** Controlled error message, and the whole validation surface: the value is always an option's, so there is nothing for a validator to reject that the options did not already prevent. */
  error?: string;

  /** Forces the valid state, drawn with a check glyph at the field's end. */
  valid?: boolean;

  /** Phosphor class name drawn at the field's start. */
  icon?: string;

  /** Submitted with the form. The chosen value is submitted, never the label, through a hidden input drawn only when a name is given. */
  name?: string;


  /** A different option was chosen; carries its value. An emptied field committed on a control that is not required reports the empty string. */
  onChange?: (value: string) => void;

  /** The text the list is filtered by changed; carries the new text, empty after a choice, Escape or a blur. The hook a remote search listens to. */
  onSearch?: (text: string) => void;
}

const arenaComboboxStyles = arenaStyles(manifest);

export function ArenaCombobox({ className,
  label, showLabel = true, placeholder, options = [], value, loading = false, filter = 'local', disabled = false,
  required = false, hint, error, valid = false, icon, name, onChange, onSearch,
}: ArenaComboboxProps) {
  const uid = `combobox-${useId().replace(/:/g, '')}`;
  if (!label?.trim()) throw new Error('ArenaCombobox: `label` is required, and names the field');
  const locale = useArenaLocale();
  const listboxId = `${uid}-listbox`;
  const noteId = `${uid}-note`;
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const composing = useRef(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const reported = useRef('');
  const labels = useRef(new Map<string, string>());
  const [active, setActive] = useState(-1);

  const rows = filter === 'none' || query === null ? [...options] : arenaFilterOptions(options, query);
  const held = value === undefined ? undefined : options.find((option) => option.value === value);
  if (held) labels.current.set(held.value, held.label);
  const known = value !== undefined && (held !== undefined || labels.current.has(value));
  const chosenLabel = held ? held.label : labels.current.get(value ?? '') ?? '';
  const shown = draft ?? chosenLabel;

  const restore = () => {
    setDraft(null); setQuery(null); setOpen(false); setActive(-1);
    if (reported.current !== '') { reported.current = ''; onSearch?.(''); }
  };
  const present = useArenaAnchoredPanel({
    open, anchor: fieldRef, panel: panelRef, trigger: () => inputRef.current, offset: sp1 * 1.5,
    matchAnchorWidth: true,
    onDismiss: (reason) => { if (reason === 'escape') restore(); else commit(); },
  });

  useEffect(() => {
    if (!present || active < 0) return;
    const row = panelRef.current?.querySelectorAll('[role="option"]').item(active);
    if (row instanceof HTMLElement && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
  }, [present, active]);

  const openList = () => {
    if (disabled || open) return;
    setOpen(true);
    setActive(arenaOpeningOption(rows, value ? [value] : []));
  };
  const choose = (row: ArenaSelectOption) => {
    labels.current.set(row.value, row.label);
    restore();
    if (row.value !== value) onChange?.(row.value);
  };
  const commit = () => {
    if (draft === null) { setOpen(false); return; }
    const verdict = arenaCommitText(draft, value, required);
    restore();
    if (verdict === 'clear') onChange?.('');
  };
  const typed = (text: string) => {
    setQuery(text);
    setOpen(true);
    const next = filter === 'none' ? [...options] : arenaFilterOptions(options, text);
    setActive(text.trim() === '' || next.length === 0 ? -1 : 0);
    reported.current = text;
    onSearch?.(text);
  };

  const onInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setDraft(text);
    if (!composing.current) typed(text);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || composing.current || event.nativeEvent.keyCode === 229) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { if (event.key === 'ArrowDown') openList(); return; }
      setActive(arenaStepOption(active, event.key, rows.length));
      return;
    }
    if (event.key !== 'Enter') return;
    const row = present && active >= 0 ? rows[active] : undefined;
    if (row) { event.preventDefault(); choose(row); return; }
    if (open) event.preventDefault();
    if (draft !== null && draft.trim() === '') commit();
  };
  const onFieldPress = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target === inputRef.current || disabled) return;
    event.preventDefault();
    inputRef.current?.focus();
    openList();
  };

  const hasError = Boolean(error);
  const styles = arenaComboboxStyles({ state: hasError ? 'error' : valid ? 'valid' : 'neutral', disabled });
  const activeId = present ? arenaActiveOptionId(uid, active, rows.length) : undefined;
  const announcement = present && query !== null && !loading ? arenaPhrase(locale.comboboxCount, { count: rows.length }) : '';

  return (
    <div className={arenaClassName('ArenaCombobox', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      {showLabel && <label htmlFor={uid} className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{label}</label>}
      <div ref={fieldRef} onMouseDown={onFieldPress} className={styles.field()} data-arena-part={manifest.parts.field} {...styles.$data.field()}>
        {icon && <i className={`${icon} ${styles.icon()}`} data-arena-part={manifest.parts.icon} {...styles.$data.icon()} aria-hidden="true" />}
        <input ref={inputRef} id={uid} type="text" value={shown} placeholder={placeholder} disabled={disabled} required={required}
          role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={present}
          aria-controls={present ? listboxId : undefined} aria-activedescendant={activeId}
          aria-label={showLabel ? undefined : label} aria-invalid={hasError || undefined}
          aria-describedby={error || hint ? noteId : undefined} autoComplete="off"
          className={styles.input()} data-arena-part={manifest.parts.input} {...styles.$data.input()}
          onChange={onInput} onKeyDown={onKeyDown} onClick={openList} onBlur={commit}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={(event) => { composing.current = false; typed(event.currentTarget.value); }} />
        {hasError && <i className={`ph-fill ph-warning-circle ${styles.statusIcon()}`} data-arena-part={manifest.parts.statusIcon} {...styles.$data.statusIcon()} aria-hidden="true" />}
        {!hasError && valid && <i className={`ph-fill ph-check-circle ${styles.statusIcon()}`} data-arena-part={manifest.parts.statusIcon} {...styles.$data.statusIcon()} aria-hidden="true" />}
        <i className={`ph-bold ph-caret-down ${styles.caret()}`} data-arena-part={manifest.parts.caret} {...styles.$data.caret()} aria-hidden="true" />
      </div>
      {name && <input type="hidden" name={name} value={known ? (value ?? '') : ''} disabled={disabled} />}
      <span role="status" className={styles.announcement()} data-arena-part={manifest.parts.announcement} {...styles.$data.announcement()}>{announcement}</span>
      {error
        ? <span id={noteId} className={styles.error()} data-arena-part={manifest.parts.error} {...styles.$data.error()}>{error}</span>
        : hint && <span id={noteId} className={styles.hint()} data-arena-part={manifest.parts.hint} {...styles.$data.hint()}>{hint}</span>}
      {present && (
        <div ref={panelRef} className={styles.panel()} data-arena-part={manifest.parts.panel} {...styles.$data.panel()}
          data-arena-surface="floating" {...ARENA_PANEL_POPOVER} onMouseDown={(event) => event.preventDefault()}>
          <div id={listboxId} role="listbox" aria-label={label} aria-busy={loading || undefined}
            className={styles.list()} data-arena-part={manifest.parts.list} {...styles.$data.list()}>
            {rows.map((row, index) => {
              const chosen = row.value === value;
              const rowStyles = arenaComboboxStyles({ active: index === active, selected: chosen });
              return (
                <div key={index} id={arenaOptionId(uid, index)} role="option" aria-selected={chosen} tabIndex={-1}
                  className={rowStyles.option()} data-arena-part={manifest.parts.option} {...rowStyles.$data.option()}
                  onMouseEnter={() => setActive(index)} onClick={() => choose(row)}>
                  <span className={rowStyles.optionLabel()} data-arena-part={manifest.parts.optionLabel} {...rowStyles.$data.optionLabel()}>{row.label}</span>
                  {chosen && <i className={`ph-bold ph-check ${styles.optionMark()}`} data-arena-part={manifest.parts.optionMark} {...styles.$data.optionMark()} aria-hidden="true" />}
                </div>
              );
            })}
          </div>
          {loading && <div className={styles.status()} data-arena-part={manifest.parts.status} {...styles.$data.status()}>{locale.comboboxLoading}</div>}
          {!loading && rows.length === 0 && <div className={styles.empty()} data-arena-part={manifest.parts.empty} {...styles.$data.empty()}>{arenaPhrase(locale.comboboxEmpty, { query: draft ?? '' })}</div>}
        </div>
      )}
    </div>
  );
}
