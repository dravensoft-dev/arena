import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPagination.classes.generated.ts';
import { arenaPageWindow } from './PaginationWindow.ts';

export interface ArenaPaginationProps {

  /** The current page, 1-based. */
  page: number;

  /** How many pages there are. Required, and guarded at runtime: an ArenaPagination with no page count renders a window over nothing. */
  pageCount: number;

  /** Names this navigation landmark. Required, and guarded at runtime: two paginated tables in one dashboard is a routine layout, and a shared constant name leaves them indistinguishable while satisfying the requirement mechanically. It was optional with a "ArenaPagination" default for one batch, which narrowed the gap rather than closing it: a name the caller omits is still the constant. Say what is being paged: "Deployments", not "Pages". */
  ariaLabel: string;

  /** A page was chosen; carries the new 1-based page. Never fires for the current page, nor for a page outside 1..pageCount. */
  onChange?: (page: number) => void;
}


const arenaPaginationStyles = arenaStyles(manifest);

export function ArenaPagination({ page, pageCount, ariaLabel, onChange }: ArenaPaginationProps) {

  if (!ariaLabel?.trim()) throw new Error('ArenaPagination: `ariaLabel` is required');
  if (page == null) throw new Error('ArenaPagination: `page` is required');
  if (pageCount == null) throw new Error('ArenaPagination: `pageCount` is required');
  const styles = arenaPaginationStyles();
  const go = (p: number) => { if (p >= 1 && p <= pageCount && p !== page) onChange && onChange(p); };
  const nav = (dir: number, dis: boolean) => (
    <button onClick={() => go(page + dir)} disabled={dis} aria-label={dir < 0 ? 'Previous' : 'Next'}
      className={styles.nav()} data-arena-part={manifest.parts.nav}>
      <i className={dir < 0 ? 'ph-bold ph-caret-left' : 'ph-bold ph-caret-right'} />
    </button>
  );
  return (
    <nav aria-label={ariaLabel} className={styles.root()} data-arena-part={manifest.parts.root}>
      {nav(-1, page <= 1)}
      {arenaPageWindow(page, pageCount).map((p, i) =>
        p === '\u2026'
          ? <span key={'e' + i} className={styles.ellipsis()} data-arena-part={manifest.parts.ellipsis}>{'\u2026'}</span>
          : (
            <button key={p} onClick={() => go(Number(p))} aria-current={p === page ? 'page' : undefined}
              className={`${styles.page()} ${p === page ? styles.pageCurrent() : styles.pageOther()}`}
              data-arena-part={manifest.parts.page}>{p}</button>
          ))}
      {nav(1, page >= pageCount)}
    </nav>
  );
}
