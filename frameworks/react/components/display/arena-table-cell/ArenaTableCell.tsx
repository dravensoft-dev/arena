import React from 'react';
import type { ArenaTableColumn } from '../../../Api.generated';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-table/ArenaTable.classes.generated.ts';

const cellStyles = arenaStyles(manifest);

export interface ArenaTableCellProps {

  /** What the cell shows: a value, or one of Arena's own components, such as an ArenaBadge for a status or an ArenaButton for an action. This is what the compound shape exists for. The consumer instantiates one element per cell, so nothing here is per-item projection. */
  children?: React.ReactNode;
}

export interface ArenaTableCellInjected {
  column: ArenaTableColumn;
  layout: 'table' | 'card';
  tabIndex: number | undefined;
  onCellFocus: (() => void) | undefined;
}



export function ArenaTableCell({
  children, column, layout = 'table', tabIndex, onCellFocus,
}: ArenaTableCellProps & Partial<ArenaTableCellInjected>) {

  const c: Partial<ArenaTableColumn> = column ?? {};

  if (layout === 'card') {
    if (c.mobileLayout === 'block') {

      return (
        <div className={cellStyles({ narrow: true }).cardBlock()} data-arena-part={manifest.parts.cardBlock}>
          {children}
        </div>
      );
    }
    const card = cellStyles({ narrow: true });
    return (
      <div className={card.cardRow()} data-arena-part={manifest.parts.cardRow}>
        <span className={card.cardLabel()} data-arena-part={manifest.parts.cardLabel}>{c.header}</span>
        <span className={c.mono ? card.cardValueMono() : card.cardValue()}
          data-arena-part={manifest.parts.cardValue}>
          {children}
        </span>
      </div>
    );
  }

  return (
    <td role="gridcell" tabIndex={tabIndex}

      onFocus={onCellFocus ? (e) => { if (e.target === e.currentTarget) onCellFocus(); } : undefined}
      className={c.mono
        ? cellStyles({ narrow: false, align: c.align || 'left' }).tdMono()
        : cellStyles({ narrow: false, align: c.align || 'left' }).td()}
      data-arena-part={manifest.parts.td}>
      {children}
    </td>
  );
}
