import React, { useState, useEffect, useRef } from 'react';
import { isArenaPrimaryActivation } from '../../../AnchorActivation.ts';
import { arenaTrapTabKey } from '../../../UseDialogModal.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaCommandPalette.classes.generated.ts';

import type { ArenaCommand } from '../../../Api.generated';

export type { ArenaCommand };

export interface ArenaCommandPaletteProps {

  /** Whether the palette is shown. Closed renders nothing. */
  open: boolean;

  /** Every command the palette can find. Filtered by label and hint as the user types. */
  commands: readonly ArenaCommand[];

  /** The search field's placeholder. */
  placeholder?: string;

  /** How many matches the list shows at most. Absent, all of them. The ceiling applies AFTER the query has run over every command, which is what makes it different from the caller trimming `commands` before passing them: a trimmed list cannot match what was cut, and a capped one can, so the first rows are still the best the whole set has. It is the palette's rather than the domain's, because how many rows help before the list stops being an accelerator is a property of this control; a caller who caps their own collection has guessed at it once, for one collection, with no query in hand. It is not ranking: the order stays the order the caller passed, ungrouped first and then each group as it first appears. */
  maxResults?: number;

  /** The palette asked to be closed: Escape, the scrim, or a command having been run. */
  onClose?: () => void;

  /** A command was activated, carrying which one. Emitted after close. For a command with `route` it fires for a primary click with no modifier and for Enter, both of which cancel the row's anchor first, so the two activations do the same thing and a host that routes here never navigates twice; a modified or middle click on such a row is the browser's, fires nothing and does not close the palette. */
  onRun?: (command: ArenaCommand) => void;
}


const paletteStyles = arenaStyles(manifest);

let nextId = 0;

export function arenaCapCommands(commands: readonly ArenaCommand[], max: number | undefined): readonly ArenaCommand[] {
  return max === undefined || max < 0 ? commands : commands.slice(0, max);
}

export function arenaOrderCommands(commands: readonly ArenaCommand[]): ArenaCommand[] {
  const names: string[] = [];
  for (const command of commands) {
    if (command.group && !names.includes(command.group)) names.push(command.group);
  }
  return [
    ...commands.filter((command) => !command.group),
    ...names.flatMap((name) => commands.filter((command) => command.group === name)),
  ];
}

export interface ArenaCommandGroup {
  name: string | null;
  rows: { command: ArenaCommand; index: number }[];
}

export function arenaCommandGroups(ordered: readonly ArenaCommand[]): ArenaCommandGroup[] {
  const groups: ArenaCommandGroup[] = [];
  ordered.forEach((command, index) => {
    const name = command.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.rows.push({ command, index });
    else groups.push({ name, rows: [{ command, index }] });
  });
  return groups;
}

export function ArenaCommandPalette({ open, commands, placeholder = 'Search for an action or project…', maxResults, onClose, onRun }: ArenaCommandPaletteProps) {
  if (open == null) throw new Error('ArenaCommandPalette: `open` is required');
  if (commands == null) throw new Error('ArenaCommandPalette: `commands` is required');
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const uid = useRef<string | null>(null);
  if (uid.current === null) uid.current = `arena-command-palette-${nextId++}`;
  const listboxId = `${uid.current}-listbox`;
  const optionId = (index: number) => `${uid.current}-option-${index}`;
  const filtered = arenaOrderCommands(arenaCapCommands(
    commands.filter((c) => (c.label + ' ' + (c.hint || '')).toLowerCase().includes(q.toLowerCase())),
    maxResults,
  ));
  const groups = arenaCommandGroups(filtered);
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 0); } }, [open]);
  useEffect(() => { setI(0); }, [q]);
  useEffect(() => {
    const row = listRef.current?.querySelectorAll('[role="option"]').item(i);
    if (row instanceof HTMLElement) row.scrollIntoView({ block: 'nearest' });
  }, [i, q, open]);
  if (!open) return null;
  const run = (c: ArenaCommand | undefined) => { onClose && onClose(); c && onRun && onRun(c); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(v + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(v - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(filtered[i]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose && onClose(); }
  };
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && panelRef.current) arenaTrapTabKey(panelRef.current, e, document.activeElement);
  };
  const styles = paletteStyles({ open: true });
  return (
    <div onClick={onClose} className={styles.root()}>
      <div ref={panelRef} onKeyDown={onPanelKeyDown}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="ArenaCommand palette"
        className={styles.panel()}>
        <div className={styles.search()}>
          <i className={`ph-bold ph-magnifying-glass ${styles.searchIcon()}`} aria-hidden="true" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={placeholder}
            role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="true"
            aria-controls={listboxId} aria-label={placeholder || 'Search commands'}
            aria-activedescendant={i >= 0 && i < filtered.length ? optionId(i) : undefined}
            className={styles.input()} />
          <span className={styles.esc()}>ESC</span>
        </div>
        <div ref={listRef} id={listboxId} role="listbox" aria-label="Commands" className={styles.list()}>
          {filtered.length === 0 && <div className={styles.empty()}>No results for "{q}".</div>}
          {groups.map((group) => (
            <div key={group.name ?? ''} className={styles.group()}
              role={group.name ? 'group' : undefined} aria-label={group.name ?? undefined}>
              {group.name && (
                <span aria-hidden="true" className={styles.groupLabel()}>{group.name}</span>
              )}
              {group.rows.map(({ command: c, index: idx }) => {
                const on = idx === i;
                const rowProps = {
                  id: optionId(idx),
                  role: 'option' as const,
                  'aria-selected': on,
                  tabIndex: -1,
                  onMouseEnter: () => setI(idx),
                  onClick: (e: React.MouseEvent) => {
                    if (c.route !== undefined) {
                      if (!isArenaPrimaryActivation(e)) return;
                      e.preventDefault();
                    }
                    run(c);
                  },
                  className: `${styles.row()} ${on ? styles.rowActive() : styles.rowDefault()}`,
                };
                const body = (
                  <>
                    {c.icon && <span className={styles.rowIcon()}><i className={c.icon} aria-hidden="true" /></span>}
                    <span className={`${styles.rowLabel()} ${on ? styles.rowLabelActive() : styles.rowLabelDefault()}`}>{c.label}</span>
                    {c.shortcut && <span className={styles.shortcut()}>{c.shortcut}</span>}
                  </>
                );
                return c.route
                  ? <a key={c.id} href={c.route} {...rowProps}>{body}</a>
                  : <button key={c.id} type="button" {...rowProps}>{body}</button>;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
