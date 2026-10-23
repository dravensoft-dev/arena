import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-tabs/ArenaTabs.classes.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ARENA_CONTEXT_VOCABULARY, type ArenaTabClass } from '../../../Vocabulary.generated.ts';

export interface ArenaTabInjected {
  selected: boolean;
  tabStop: boolean;
  tabId: string;
  panelId: string;
  onSelect: (value: string) => void;
}

export interface ArenaTabProps {
  className?: ArenaTabClass;


  /** What this tab selects, and what the `onValueChange` event of ArenaTabs carries. */
  value: string;

  /** What the tab reads. Arena draws the button; the consumer names it. */
  label: string;

  /** What the panel shows while this tab is selected. ArenaTabs places it; ArenaTab never renders it, because a tabpanel may not sit inside a tablist. */
  children?: React.ReactNode;
}


const arenaTabsStyles = arenaStyles(manifest);

export function ArenaTab({ className, 
  value, label,
  selected = false, tabStop = false, tabId, panelId, onSelect,
}: ArenaTabProps & Partial<ArenaTabInjected>) {

  if (!value) throw new Error('ArenaTab: `value` is required');
  if (!label) throw new Error('ArenaTab: `label` is required');
  return (
    <button type="button" role="tab" id={tabId}
      aria-selected={selected} aria-controls={panelId}

      tabIndex={tabStop ? 0 : -1}
      onClick={() => onSelect && onSelect(value)}
      className={arenaClassName('ArenaTab', arenaTabsStyles({ selected }).tab(), className, ARENA_CONTEXT_VOCABULARY)} data-arena-part={manifest.parts.tab} {...arenaTabsStyles({ selected }).$data.tab()}>
      {label}
    </button>
  );
}
