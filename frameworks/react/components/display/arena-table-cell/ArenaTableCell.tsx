import React from 'react';
import type { CSSProperties } from 'react';
import { arenaColumnKey } from '../arena-table/ColumnKey.ts';
import type { ArenaTableColumn } from '../../../Api.generated';
import { isArenaPrimaryActivation } from '../../../AnchorActivation.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-table/ArenaTable.classes.generated.ts';
import type { ArenaTableCellClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

const cellStyles = arenaStyles(manifest);

export interface ArenaTableCellProps {
  className?: ArenaTableCellClass;


  /** What the cell shows: a value, or one of Arena's own components, such as an ArenaBadge for a status or an ArenaButton for an action. This is what the compound shape exists for. The consumer instantiates one element per cell, so nothing here is per-item projection. */
  children?: React.ReactNode;

  /** Present => the cell draws an <a> around its content, inside its own box, which is where HTML admits one and why this member is the cell's rather than the row's: an anchor wrapping a row would break the row/cell structure the grid is made of, and may not contain the button a cell's own contract invites. It carries the settled anchor convention rather than restating it, the same convention as ArenaCard.href, ArenaCommand.route, ArenaCrumb.href and ArenaSideNavItem.href: a primary click with no modifier is cancelled and reported through `onNavigate`, so a router owns it, and ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing. The anchor is a tab stop of its own, which is the answer this table already gives for a control a consumer puts in a cell, so it is one Tab from the cell rather than a step-in the grid does not have. Inside a row carrying `interactive` the anchor wins and the row does not fire, because a press that lands on a control inside the row is never the row's. It survives both shapes: below --bp-md the anchor is still an anchor and does not compete with the row's role="button", by the same predicate. */
  href?: string;

  /** The cell's anchor was activated by the one activation a router owns, a primary click with no modifier, and Arena has already cancelled the anchor's own navigation by the time it fires; a modified click, a middle click and a context menu are the browser's and do not fire it at all. No payload, because the consumer wrote this element and already holds what it is about, the same shape as ArenaTableRow.onClick. It is `onNavigate` rather than a click because the cell has no other activation to report: with no `href` there is no anchor, and an event that only ever fires for one member is named after what that member does. */
  onNavigate?: () => void;
}

export interface ArenaTableCellInjected {
  column: ArenaTableColumn;
  label: string;
  layout: 'table' | 'card';
  tabIndex: number | undefined;
  onCellFocus: (() => void) | undefined;
}



export function ArenaTableCell({ className, 
  children, href, onNavigate, column, label = '', layout = 'table', tabIndex, onCellFocus,
}: ArenaTableCellProps & Partial<ArenaTableCellInjected>) {

  const c: Partial<ArenaTableColumn> = column ?? {};

  const key = layout === 'card' ? null : arenaColumnKey(label, c.key);
  const channels = {
    '--arena-column-width': key === null ? 'initial' : `var(--arena-column-${key}-width)`,
    '--arena-column-align': key === null ? 'initial' : `var(--arena-column-${key}-align)`,
  } as CSSProperties;

  const shown = href === undefined ? children : (
    <a href={href} className={cellStyles({ narrow: layout === 'card' }).link()}
      data-arena-part={manifest.parts.link} {...cellStyles({ narrow: layout === 'card' }).$data.link()} data-arena-boundary=""
      onClick={(event) => {
        if (!isArenaPrimaryActivation(event.nativeEvent)) return;
        event.preventDefault();
        onNavigate?.();
      }}>
      {children}
    </a>
  );

  if (layout === 'card') {
    if (c.mobileLayout === 'block') {

      return (
        <td role="presentation" className={arenaClassName('ArenaTableCell', cellStyles({ narrow: true }).cardBlock(), className)} style={channels} data-arena-part={manifest.parts.cardBlock} {...cellStyles({ narrow: true }).$data.cardBlock()} data-arena-boundary="">
          {shown}
        </td>
      );
    }
    const card = cellStyles({ narrow: true, numeric: Boolean(c.numeric) });
    return (
      <td role="presentation" className={arenaClassName('ArenaTableCell', card.cardRow(), className)} style={channels} data-arena-part={manifest.parts.cardRow} {...card.$data.cardRow()}>
        <span className={card.cardLabel()} data-arena-part={manifest.parts.cardLabel} {...card.$data.cardLabel()}>{c.header}</span>
        <span className={card.cardValue()}
          data-arena-part={manifest.parts.cardValue} {...card.$data.cardValue()} data-arena-boundary="">
          {shown}
        </span>
      </td>
    );
  }

  return (
    <td tabIndex={tabIndex}

      onFocus={onCellFocus ? (e) => { if (e.target === e.currentTarget) onCellFocus(); } : undefined}
      className={arenaClassName('ArenaTableCell', cellStyles({ narrow: false, numeric: Boolean(c.numeric) }).td(), className)}
      style={channels}
      data-arena-part={manifest.parts.td} {...cellStyles({ narrow: false, numeric: Boolean(c.numeric) }).$data.td()} data-arena-boundary="">
      {shown}
    </td>
  );
}
