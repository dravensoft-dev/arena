import React from 'react';
import { isArenaOwnActivation } from '../../../AnchorActivation.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-table/ArenaTable.classes.generated.ts';
import type { ArenaTableColumn } from '../../../Api.generated';
import type { ArenaTableCellInjected } from '../arena-table-cell/ArenaTableCell.tsx';

const rowStyles = arenaStyles(manifest);

export interface ArenaTableRowInjected {
  rowIndex: number;
  columns: readonly ArenaTableColumn[];
  layout: 'table' | 'card';
  cursorCol: number | null;
  onCellFocus: (row: number, col: number) => void;
}

export interface ArenaTableRowProps {

  /** The row's cells. One ArenaTableCell per cell; a row may carry fewer or more than there are columns, and the grid's cursor is clamped against what is really there. */
  children?: React.ReactNode;

  /** Whether the row can be activated. A boolean rather than "is `click` bound?": Arena never derives what it draws from what a consumer listens for, because an outbound member's subscriber list is private in at least one platform and a consumer's binding leaves nothing in the DOM to detect, so deriving the interactive shape from it is a divergence waiting to happen, and it was one. Below --bp-md the row is a card, and an interactive card is a role="button" tab stop with an Enter/Space handler; a non-interactive one is inert, because a dead tab stop on every row of every table is worse than the gap it would close. */
  interactive?: boolean;

  /** Whether the row is drawn but cannot be activated: a record the consumer's rules lock. It reflects through `aria-disabled` rather than the native attribute, and the card shape stays a role="button" in the tab order rather than leaving it, because a disabled control nobody can reach is a control nobody knows exists. With no `click` there is nothing to disable and the row is inert already. */
  disabled?: boolean;

  /** The row was activated, by pointer or by Enter on one of its cells. No payload, because the consumer wrote this element and already holds the row this is about. */
  onClick?: () => void;
}


export function ArenaTableRow({
  children, onClick, interactive = false, disabled = false,
  rowIndex = 0, columns = [], layout = 'table', cursorCol = null, onCellFocus,
}: ArenaTableRowProps & Partial<ArenaTableRowInjected>) {

  const cells = React.Children.toArray(children).map((child, ci) => (
    React.isValidElement<Partial<ArenaTableCellInjected>>(child)
      ? React.cloneElement(child, {
        column: columns[ci],
        layout,

        tabIndex: layout === 'card' ? undefined : (ci === cursorCol ? 0 : -1),
        onCellFocus: layout === 'card' || !onCellFocus ? undefined : () => onCellFocus(rowIndex, ci),
      })
      : child
  ));

  const activate = interactive && onClick && !disabled
    ? (e: React.MouseEvent<Element> | React.KeyboardEvent<Element>) => {
      if (!isArenaOwnActivation(e.target, e.currentTarget)) return;
      onClick();
    }
    : undefined;
  const cursor = interactive ? (disabled ? 'not-allowed' : 'pointer') : 'default';

  if (layout === 'card') {
    return (
      <div onClick={activate}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-disabled={interactive && disabled ? 'true' : undefined}
        onKeyDown={activate ? (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          activate(e);
        } : undefined}
        className={rowStyles({ narrow: true }).card()} data-arena-part={manifest.parts.card}>
        {cells}
      </div>
    );
  }

  const base = rowStyles({ narrow: false });
  const rowClass = [
    rowIndex <= 1 ? `${base.row()} ${base.rowFirst()}` : base.row(),
    activate ? base.rowInteractive() : '',
  ].filter(Boolean).join(' ');

  return (
    <tr role="row" onClick={activate}
      aria-disabled={onClick && disabled ? 'true' : undefined}

      className={rowClass} data-arena-part={manifest.parts.row}>
      {cells}
    </tr>
  );
}
