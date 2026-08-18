import React, { useRef, useState } from 'react';
import { useArenaContainerWidth, arenaReadBreakpoint } from '../../../UseArenaContainerWidth.ts';

import type { ArenaBulkAction, ArenaBulkActionBarLayout } from '../../../Api.generated';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaBulkActionBar.classes.generated.ts';

export type { ArenaBulkAction };

export interface ArenaBulkActionBarProps {

  /** How many rows are selected. Zero renders no bar at all. */
  count: number;

  /** What is being counted, plural: "items", "projects". */
  noun?: string;

  /** The actions offered for the current selection. */
  actions: readonly ArenaBulkAction[];

  /** An action was activated, carrying which one. */
  onRun?: (action: ArenaBulkAction) => void;

  /** Whether the bar may stack. 'auto' measures its OWN container, not the viewport, and drops the count, the actions and Clear onto separate rows when one row does not fit; 'inline' keeps the single row at every width, for a bar in a place the consumer knows is wide. It is a member rather than something a consumer reaches in with CSS because the alternative is what happens without it: reordering the bar's own children by position, which puts focus order out of step with visual order and breaks the next time anything inside moves. Stacking here reorders nothing, so the tab order and the reading order stay the same order they are wide. */
  layout?: ArenaBulkActionBarLayout;

  /** Whether the Clear control is drawn. Every layer gates on this member and never on whether anything listens for `clear`, because Arena never derives what it draws from what a consumer listens for. */
  clearable?: boolean;

  /** The Clear control was activated. */
  onClear?: () => void;
}


const barStyles = arenaStyles(manifest);

export function ArenaBulkActionBar({ count, noun = 'items', actions, layout = 'auto', onRun, onClear, clearable = true }: ArenaBulkActionBarProps) {
  if (count == null) throw new Error('ArenaBulkActionBar: `count` is required');
  if (actions == null) throw new Error('ArenaBulkActionBar: `actions` is required');
  if (!count) return null;

  const [barRef, width] = useArenaContainerWidth<HTMLDivElement>();
  const narrow = layout === 'auto' && width !== null && width < arenaReadBreakpoint('sm');
  const [cursor, setCursor] = useState(0);
  const stops = clearable ? actions.length + 1 : actions.length;
  const at = Math.min(cursor, Math.max(stops - 1, 0));
  const styles = barStyles({ narrow, open: true });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bar = barRef.current;
    if (!bar) return;
    const els = [...bar.querySelectorAll('button')];
    if (els.length === 0) return;
    const active = document.activeElement;
    const here = active instanceof HTMLButtonElement ? els.indexOf(active) : -1;
    const from = here === -1 ? at : here;
    const there = e.key === 'ArrowRight'
      ? (from + 1) % els.length
      : (from - 1 + els.length) % els.length;
    e.preventDefault();
    setCursor(there);
    els[there]?.focus();
  };

  return (
    <div role="toolbar" aria-label="Actions on the selection"
      ref={barRef} onKeyDown={onKeyDown}
      className={styles.root()} data-arena-part={manifest.parts.root}>
      <span className={styles.count()} data-arena-part={manifest.parts.count}>
        <b className={styles.number()} data-arena-part={manifest.parts.number}>{count}</b>{` ${noun} selected`}
      </span>
      {!narrow && (
        <span aria-hidden="true" className={styles.divider()} data-arena-part={manifest.parts.divider} />
      )}
      <div className={styles.actions()} data-arena-part={manifest.parts.actions}>
        {actions.map((a, i) => (
          <button key={i} onClick={() => onRun && onRun(a)}
            tabIndex={i === at ? 0 : -1} onFocus={() => setCursor(i)}
            className={barStyles({ narrow, open: true, destructive: Boolean(a.destructive) }).action()} data-arena-part={manifest.parts.action}>
            {a.icon && <span className={styles.actionIcon()} data-arena-part={manifest.parts.actionIcon}><i className={a.icon} aria-hidden="true" /></span>}{a.label}
          </button>
        ))}
      </div>
      {clearable && (
        <button onClick={() => onClear && onClear()} aria-label="Clear selection"
          tabIndex={actions.length === at ? 0 : -1} onFocus={() => setCursor(actions.length)}
          className={styles.clear()} data-arena-part={manifest.parts.clear}>
          Clear
        </button>
      )}
    </div>
  );
}
