import React, { useEffect, useRef } from 'react';
import { useArenaContainerWidth, arenaReadBreakpoint } from '../../../UseArenaContainerWidth.ts';

import type { ArenaAppliedFilter } from '../../../Api.generated';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaFilterBar.classes.generated.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaFilterBarClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ArenaTag } from '../../display/arena-tag/ArenaTag.tsx';
import {
  arenaFilterBarMayFocus, arenaFilterBarTarget, arenaFirstTabbable, type ArenaFilterBarPending,
} from './FilterBarFocus.ts';

export type { ArenaAppliedFilter };

export interface ArenaFilterBarProps {
  className?: ArenaFilterBarClass;

  /** Names the group of filters, such as "Deployment filters", never "Filters". Required, and guarded at runtime after trimming: a group with no name announces only that a group began. */
  label: string;

  /** The filter controls, in order: selects, inputs, segmented controls, comboboxes. Fills the bar's control row and never replaces the bar. Required, and guarded at runtime: a bar with no control filters nothing. */
  children: React.ReactNode;

  /** The filters in effect, drawn as chips in a list after the controls. An empty list draws no chip row. */
  applied?: readonly ArenaAppliedFilter[];

  /** Whether Clear all is drawn while `applied` holds a filter. Every layer gates on this member and never on whether anything listens for `onClear`. */
  clearable?: boolean;

  /** A chip's remove button was activated; carries the whole filter. Once the host drops it from `applied`, focus moves to the chip now in its place, else the last chip, else the first control. A control the person has moved to since keeps focus. */
  onRemove?: (filter: ArenaAppliedFilter) => void;

  /** Clear all was activated. Once the host empties `applied`, focus moves to the first control. */
  onClear?: () => void;
}

const barStyles = arenaStyles(manifest);

export function ArenaFilterBar({ className, label, children, applied = [], clearable = true, onRemove, onClear }: ArenaFilterBarProps) {
  if (!label?.trim()) throw new Error('ArenaFilterBar: `label` is required, and names the group of filters');
  if (React.Children.toArray(children).length === 0) {
    throw new Error('ArenaFilterBar: a filter bar with no controls is not a legal shape, because it would filter nothing');
  }
  const locale = useArenaLocale();
  const [barRef, width] = useArenaContainerWidth<HTMLDivElement>();
  const controlsRef = useRef<HTMLDivElement>(null);
  const pending = useRef<ArenaFilterBarPending>(null);
  const ids = applied.map((filter) => filter.id);
  const shown = useRef<readonly string[]>(ids);
  const narrow = width !== null && width < arenaReadBreakpoint('sm');
  const styles = barStyles({ narrow });

  useEffect(() => {
    const before = shown.current;
    shown.current = ids;
    const target = arenaFilterBarTarget(pending.current, before, ids);
    const bar = barRef.current;
    const controls = controlsRef.current;
    if (target === null || !bar || !controls) return;
    pending.current = null;
    if (!arenaFilterBarMayFocus(bar.ownerDocument.activeElement, bar, controls)) return;
    if (target === 'content') {
      arenaFirstTabbable(controls)?.focus();
      return;
    }
    const chips = bar.querySelectorAll<HTMLElement>(`[data-arena-part="${manifest.parts.chip}"]`);
    chips.item(target.chip)?.querySelector<HTMLElement>('[data-arena-part="tag.close"]')?.focus();
  }, [ids.join('\u0000')]);

  const remove = (index: number, filter: ArenaAppliedFilter) => {
    pending.current = index;
    onRemove?.(filter);
  };
  const clear = () => {
    pending.current = 'clear';
    onClear?.();
  };

  return (
    <div role="group" aria-label={label} ref={barRef}
      className={arenaClassName('ArenaFilterBar', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <div ref={controlsRef} onFocus={() => { pending.current = null; }}
        className={styles.controls()} data-arena-part={manifest.parts.controls} {...styles.$data.controls()} data-arena-boundary="">
        {children}
      </div>
      {applied.length > 0 && (
        <ul role="list" aria-label={locale.filterBarApplied}
          className={styles.applied()} data-arena-part={manifest.parts.applied} {...styles.$data.applied()}>
          {applied.map((filter, index) => (
            <li key={filter.id} className={styles.chip()} data-arena-part={manifest.parts.chip} {...styles.$data.chip()}>
              <ArenaTag removable onRemove={() => remove(index, filter)}>{filter.label}</ArenaTag>
            </li>
          ))}
        </ul>
      )}
      {clearable && applied.length > 0 && (
        <button type="button" onClick={clear} aria-label={locale.filterBarClearLabel}
          className={styles.clear()} data-arena-part={manifest.parts.clear} {...styles.$data.clear()}>
          {locale.filterBarClear}
        </button>
      )}
    </div>
  );
}
