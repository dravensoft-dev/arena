import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-combobox/ArenaCombobox.classes.generated.ts';
import { sp1 } from '../../../Tokens.generated.js';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import { ARENA_PANEL_POPOVER, useArenaAnchoredPanel } from '../../../UseAnchoredPanel.ts';
import { ArenaTag } from '../../display/arena-tag/ArenaTag.tsx';
import {
  arenaActiveOptionId, arenaAtCap, arenaChipAfterRemoval, arenaChipWindow, arenaFilterOptions,
  arenaOpeningOption, arenaOptionId, arenaStepChip, arenaStepOption, arenaToggleValue, arenaUniqueValues,
} from '../arena-combobox/ComboboxRules.ts';

import type { ArenaComboboxFilter, ArenaSelectOption, ArenaValueSet } from '../../../Api.generated';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ARENA_CONTEXT_VOCABULARY, type ArenaMultiSelectClass } from '../../../Vocabulary.generated.ts';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon.tsx';

export type { ArenaComboboxFilter, ArenaSelectOption, ArenaValueSet };

export interface ArenaMultiSelectProps {
  className?: ArenaMultiSelectClass;


  /** The control's accessible name. Required, and guarded at runtime after trimming: a field with no name is announced as an unlabelled edit field. */
  label: string;

  /** Whether the label is drawn above the field. False keeps the name for assistive technology and draws nothing, for a filter row with no room for a label. */
  showLabel?: boolean;

  /** Shown in the empty field while no value is chosen. A hint about what to type, never an option. */
  placeholder?: string;

  /** The choices, in the order the list draws them. */
  options?: readonly ArenaSelectOption[];

  /** The chosen values, in the order they were chosen. A value that neither the options nor an earlier choice holds is kept and drawn as its own text. */
  value?: readonly string[];

  /** The most values that can be chosen. Absent, there is no limit. Once it is reached, every row not chosen is unavailable and choosing one is announced as blocked; removing a value stays possible. */
  max?: number;

  /** How many chosen values are drawn as chips before the rest collapse into a count. Absent, every chip is drawn and the field wraps. The collapsed values stay readable in the open list, where they are the chosen rows. */
  maxVisible?: number;

  /** Whether a control that empties the whole selection is drawn while a value is chosen. A declared boolean rather than a reading of whether change is listened to; false by default because a field one press can empty is a choice the consumer makes. */
  clearable?: boolean;

  /** Options are being fetched. The list reports itself busy and draws a status line in place of the empty one. Declared, never inferred from the options. */
  loading?: boolean;

  /** Who narrows the options by the typed text: the control itself, or the host, which listens to search and passes the options it found. A declared member rather than a reading of whether search is listened to. */
  filter?: ArenaComboboxFilter;

  /** Blocks the control and dims it, chips included. */
  disabled?: boolean;

  /** At least one value must be chosen for the form to be complete. The field reports itself required to assistive technology. */
  required?: boolean;

  /** A line of help under the field. */
  hint?: string;

  /** Controlled error message, and the whole validation surface: every value is an option's or one the consumer supplied, so there is nothing for a validator to parse. */
  error?: string;

  /** Forces the valid state, drawn with a check glyph at the field's end. */
  valid?: boolean;

  /** Phosphor class name drawn at the field's start through ArenaIcon. */
  icon?: string;

  /** Submitted with the form. Each chosen value is submitted under it as a hidden input, so a form posts a repeated field; nothing is drawn without a name. */
  name?: string;


  /** The chosen set changed, by a row, a chip or the clear control; carries the whole new set, never a difference. */
  onValueChange?: (set: ArenaValueSet) => void;

  /** The text the list is filtered by changed; carries the new text, empty after a pick, Escape or a blur. The hook a remote search listens to. */
  onSearch?: (text: string) => void;
}

const arenaMultiSelectStyles = arenaStyles(manifest);

const CLOSE = '[data-arena-part="tag.close"]';

export function ArenaMultiSelect({ className,
  label, showLabel = true, placeholder, options = [], value = [], max, maxVisible, clearable = false, loading = false,
  filter = 'local', disabled = false, required = false, hint, error, valid = false, icon, name, onValueChange, onSearch,
}: ArenaMultiSelectProps) {
  const picked = useMemo(() => arenaUniqueValues(value), [value]);
  const uid = `multi-select-${useId().replace(/:/g, '')}`;
  if (!label?.trim()) throw new Error('ArenaMultiSelect: `label` is required, and names the field');
  const locale = useArenaLocale();
  const listboxId = `${uid}-listbox`;
  const noteId = `${uid}-note`;
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const composing = useRef(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const [notice, setNotice] = useState('');
  const [chipFocus, setChipFocus] = useState<{ value: string | null } | null>(null);
  const reported = useRef('');
  const labels = useRef(new Map<string, string>());

  for (const one of picked) {
    const held = options.find((option) => option.value === one);
    if (held) labels.current.set(held.value, held.label);
  }
  const rows = filter === 'none' || query === null ? [...options] : arenaFilterOptions(options, query);
  const capped = arenaAtCap(picked, max);
  const { shown, hidden } = arenaChipWindow(picked, maxVisible);

  const report = (values: string[]) => onValueChange?.({ values });
  const settle = () => { if (reported.current !== '') { reported.current = ''; onSearch?.(''); } };
  const closeList = () => { setOpen(false); setActive(-1); setDraft(''); setQuery(null); setNotice(''); settle(); };
  const present = useArenaAnchoredPanel({
    open, anchor: fieldRef, panel: panelRef, trigger: () => inputRef.current, offset: sp1 * 1.5,
    matchAnchorWidth: true,
    onDismiss: () => closeList(),
  });

  useEffect(() => {
    if (!present || active < 0) return;
    const row = panelRef.current?.querySelectorAll('[role="option"]').item(active);
    if (row instanceof HTMLElement && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
  }, [present, active]);

  useEffect(() => {
    if (chipFocus === null) return;
    const buttons = chipsRef.current?.querySelectorAll<HTMLElement>(CLOSE);
    const at = chipFocus.value === null ? -1 : shown.indexOf(chipFocus.value);
    const target = at >= 0 ? buttons?.item(at) : null;
    (target ?? inputRef.current)?.focus();
    setChipFocus(null);
  }, [chipFocus]);

  const openList = () => {
    if (disabled || open) return;
    setOpen(true);
    setActive(arenaOpeningOption(rows, picked));
  };
  const toggle = (row: ArenaSelectOption): boolean => {
    const next = arenaToggleValue(picked, row.value, max);
    if (next === null) {
      const text = arenaPhrase(locale.multiSelectMax, { max: max ?? 0 });
      setNotice((before) => (before === text ? `${text}\u00a0` : text));
      return false;
    }
    labels.current.set(row.value, row.label);
    setNotice('');
    setDraft('');
    setQuery(null);
    settle();
    setActive(options.findIndex((option) => option.value === row.value));
    report(next);
    return true;
  };
  const remove = (index: number) => {
    if (disabled) return;
    const left = shown.filter((_, at) => at !== index);
    const next = arenaChipAfterRemoval(index, shown.length);
    report(picked.filter((one) => one !== shown[index]));
    setChipFocus({ value: next >= 0 ? left[next] ?? null : null });
  };
  const focusChip = (index: number) => setChipFocus({ value: index >= 0 ? shown[index] ?? null : null });
  const onFieldPress = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.button !== 0 || target === inputRef.current || disabled || target.closest('button')) return;
    event.preventDefault();
    inputRef.current?.focus();
    openList();
  };
  const typed = (text: string) => {
    setQuery(text);
    setOpen(true);
    setNotice('');
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
    const atStart = draft === '' && (event.currentTarget.selectionStart ?? 0) === 0;
    if ((event.key === 'Backspace' || event.key === 'ArrowLeft') && atStart && shown.length > 0) {
      event.preventDefault();
      focusChip(shown.length - 1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { if (event.key === 'ArrowDown') openList(); return; }
      setActive(arenaStepOption(active, event.key, rows.length));
      return;
    }
    if (event.key !== 'Enter') return;
    if (open) event.preventDefault();
    const row = present && active >= 0 ? rows[active] : undefined;
    if (row && toggle(row)) closeList();
  };
  const onChipKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.matches(CLOSE)) return;
    const buttons = [...(chipsRef.current?.querySelectorAll<HTMLElement>(CLOSE) ?? [])];
    const index = buttons.indexOf(target);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusChip(arenaStepChip(index, event.key, buttons.length));
      return;
    }
    if (['Delete', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      remove(index);
    }
  };

  const hasError = Boolean(error);
  const styles = arenaMultiSelectStyles({ state: hasError ? 'error' : valid ? 'valid' : 'neutral', disabled });
  const activeId = present ? arenaActiveOptionId(uid, active, rows.length) : undefined;
  const announcement = notice || (present && query !== null && !loading ? arenaPhrase(locale.multiSelectCount, { count: rows.length }) : '');

  return (
    <div className={arenaClassName('ArenaMultiSelect', styles.root(), className, ARENA_CONTEXT_VOCABULARY)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      {showLabel && <label htmlFor={uid} className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{label}</label>}
      <div ref={fieldRef} onMouseDown={onFieldPress} className={styles.field()} data-arena-part={manifest.parts.field} {...styles.$data.field()}>
        {icon && <span className={styles.icon()} data-arena-part={manifest.parts.icon} {...styles.$data.icon()} aria-hidden="true"><ArenaIcon icon={icon} /></span>}
        <div ref={chipsRef} className={styles.chips()} data-arena-part={manifest.parts.chips} {...styles.$data.chips()} onKeyDown={onChipKey}>
          {shown.map((one, index) => (
            <ArenaTag key={one} removable tabStop={false} disabled={disabled} onRemove={() => remove(index)}>{labels.current.get(one) ?? one}</ArenaTag>
          ))}
          {hidden > 0 && <span role="img" aria-label={arenaPhrase(locale.multiSelectMoreLabel, { count: hidden })} className={styles.more()} data-arena-part={manifest.parts.more} {...styles.$data.more()}>{arenaPhrase(locale.multiSelectMore, { count: hidden })}</span>}
          <input ref={inputRef} id={uid} type="text" value={draft} placeholder={picked.length === 0 ? placeholder : undefined} disabled={disabled}
            role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={present}
            aria-controls={present ? listboxId : undefined} aria-activedescendant={activeId}
            aria-label={showLabel ? undefined : label} aria-required={required || undefined} aria-invalid={hasError || undefined}
            aria-describedby={error || hint ? noteId : undefined} autoComplete="off"
            className={styles.input()} data-arena-part={manifest.parts.input} {...styles.$data.input()}
            onChange={onInput} onKeyDown={onKeyDown} onClick={openList} onBlur={closeList}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={(event) => { composing.current = false; typed(event.currentTarget.value); }} />
        </div>
        {clearable && picked.length > 0 && !disabled && (
          <button type="button" tabIndex={-1} aria-label={locale.multiSelectClear} className={styles.clear()} data-arena-part={manifest.parts.clear} {...styles.$data.clear()}
            onMouseDown={(event) => event.preventDefault()} onClick={() => { setNotice(''); report([]); inputRef.current?.focus(); }}>
            <ArenaIcon icon="ph-bold ph-x-circle" />
          </button>
        )}
        {hasError && <span className={styles.statusIcon()} data-arena-part={manifest.parts.statusIcon} {...styles.$data.statusIcon()} aria-hidden="true"><ArenaIcon icon="ph-fill ph-warning-circle" /></span>}
        {!hasError && valid && <span className={styles.statusIcon()} data-arena-part={manifest.parts.statusIcon} {...styles.$data.statusIcon()} aria-hidden="true"><ArenaIcon icon="ph-fill ph-check-circle" /></span>}
        <span className={styles.caret()} data-arena-part={manifest.parts.caret} {...styles.$data.caret()} aria-hidden="true"><ArenaIcon icon="ph-bold ph-caret-down" /></span>
      </div>
      {name && picked.map((one) => <input key={one} type="hidden" name={name} value={one} disabled={disabled} />)}
      <span role="status" className={styles.announcement()} data-arena-part={manifest.parts.announcement} {...styles.$data.announcement()}>{announcement}</span>
      {error
        ? <span id={noteId} className={styles.error()} data-arena-part={manifest.parts.error} {...styles.$data.error()}>{error}</span>
        : hint && <span id={noteId} className={styles.hint()} data-arena-part={manifest.parts.hint} {...styles.$data.hint()}>{hint}</span>}
      {present && (
        <div ref={panelRef} className={styles.panel()} data-arena-part={manifest.parts.panel} {...styles.$data.panel()}
          data-arena-surface="floating" {...ARENA_PANEL_POPOVER} onMouseDown={(event) => event.preventDefault()}>
          <div id={listboxId} role="listbox" aria-label={label} aria-multiselectable="true" aria-busy={loading || undefined}
            className={styles.list()} data-arena-part={manifest.parts.list} {...styles.$data.list()}>
            {rows.map((row, index) => {
              const chosen = picked.includes(row.value);
              const blocked = capped && !chosen;
              const rowStyles = arenaMultiSelectStyles({ active: index === active, selected: chosen, blocked });
              return (
                <div key={index} id={arenaOptionId(uid, index)} role="option" aria-selected={chosen} aria-disabled={blocked || undefined} tabIndex={-1}
                  className={rowStyles.option()} data-arena-part={manifest.parts.option} {...rowStyles.$data.option()}
                  onMouseEnter={() => setActive(index)} onClick={() => toggle(row)}>
                  <span className={rowStyles.optionLabel()} data-arena-part={manifest.parts.optionLabel} {...rowStyles.$data.optionLabel()}>{row.label}</span>
                  {chosen && <span className={styles.optionMark()} data-arena-part={manifest.parts.optionMark} {...styles.$data.optionMark()} aria-hidden="true"><ArenaIcon icon="ph-bold ph-check" /></span>}
                </div>
              );
            })}
          </div>
          {loading && <div className={styles.status()} data-arena-part={manifest.parts.status} {...styles.$data.status()}>{locale.multiSelectLoading}</div>}
          {!loading && rows.length === 0 && <div className={styles.empty()} data-arena-part={manifest.parts.empty} {...styles.$data.empty()}>{arenaPhrase(locale.multiSelectEmpty, { query: draft })}</div>}
        </div>
      )}
    </div>
  );
}
