import React from 'react';
import type { ArenaTableColumn } from '../../../Api.generated';
import { isArenaPrimaryActivation } from '../../../AnchorActivation.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-table/ArenaTable.classes.generated.ts';

const cellStyles = arenaStyles(manifest);

export interface ArenaTableCellProps {

  /** What the cell shows: a value, or one of Arena's own components, such as an ArenaBadge for a status or an ArenaButton for an action. This is what the compound shape exists for. The consumer instantiates one element per cell, so nothing here is per-item projection. */
  children?: React.ReactNode;

  /** Present => the cell draws an <a> around its content, inside its own box, which is where HTML admits one and why this member is the cell's rather than the row's: an anchor wrapping a row would break the row/cell structure the grid is made of, and may not contain the button a cell's own contract invites. It carries the settled anchor convention rather than restating it, the fifth member to do so after ArenaCard.href, ArenaCommand.route, ArenaCrumb.href and ArenaSideNavItem.href: a primary click with no modifier is cancelled and reported through `navigate`, so a router owns it, and ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing. The anchor is a tab stop of its own, which is the answer this table already gives for a control a consumer puts in a cell, so it is one Tab from the cell rather than a step-in the grid does not have. Inside a row carrying `interactive` the anchor wins and the row does not fire, because a press that lands on a control inside the row was never the row's. It survives both shapes: below --bp-md the anchor is still an anchor and does not compete with the row's role="button", by the same predicate. */
  href?: string;

  /** The cell's anchor was activated by the one activation a router owns, a primary click with no modifier, and Arena has already cancelled the anchor's own navigation by the time it fires; a modified click, a middle click and a context menu are the browser's and do not fire it at all. No payload, because the consumer wrote this element and already holds what it is about, the same shape as ArenaTableRow.click. It is `navigate` rather than a `click` because the cell has no other activation to report: with no `href` there is no anchor, and an event that only ever fires for one member is named after what that member does. */
  onNavigate?: () => void;
}

export interface ArenaTableCellInjected {
  column: ArenaTableColumn;
  layout: 'table' | 'card';
  tabIndex: number | undefined;
  onCellFocus: (() => void) | undefined;
}



export function ArenaTableCell({
  children, href, onNavigate, column, layout = 'table', tabIndex, onCellFocus,
}: ArenaTableCellProps & Partial<ArenaTableCellInjected>) {

  const c: Partial<ArenaTableColumn> = column ?? {};

  const shown = href === undefined ? children : (
    <a href={href} className={cellStyles({ narrow: layout === 'card' }).link()}
      data-arena-part={manifest.parts.link}
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
        <td role="presentation" className={cellStyles({ narrow: true }).cardBlock()} data-arena-part={manifest.parts.cardBlock}>
          {shown}
        </td>
      );
    }
    const card = cellStyles({ narrow: true });
    return (
      <td role="presentation" className={card.cardRow()} data-arena-part={manifest.parts.cardRow}>
        <span className={card.cardLabel()} data-arena-part={manifest.parts.cardLabel}>{c.header}</span>
        <span className={c.mono ? card.cardValueMono() : card.cardValue()}
          data-arena-part={manifest.parts.cardValue}>
          {shown}
        </span>
      </td>
    );
  }

  return (
    <td tabIndex={tabIndex}

      onFocus={onCellFocus ? (e) => { if (e.target === e.currentTarget) onCellFocus(); } : undefined}
      className={c.mono
        ? cellStyles({ narrow: false, align: c.align || 'left' }).tdMono()
        : cellStyles({ narrow: false, align: c.align || 'left' }).td()}
      data-arena-part={manifest.parts.td}>
      {shown}
    </td>
  );
}
