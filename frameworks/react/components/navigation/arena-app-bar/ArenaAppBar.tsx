import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaAppBar.classes.generated.ts';

export interface ArenaAppBarProps {

  /** The identity, at the start edge: an ArenaAppLogo, a wordmark, a mark. Wrap it in your own link if it should lead home; the bar draws no anchor of its own, which is what keeps a router's link out of a component that would have to swallow it. */
  brand?: React.ReactNode;

  /** The way through the site, between the brand and the actions. It is a slot and not a list of destinations because the links are the consumer's: they are their router's, and the navigation landmark around them is theirs to name, since a page with a side nav as well needs the two told apart. */
  nav?: React.ReactNode;

  /** What follows the reader everywhere, at the end edge: search, theme, basket, account. Arena draws the row; the consumer draws what sits in it. */
  actions?: React.ReactNode;

  /** Whether the bar stays at the top edge as the page scrolls. True by default, because a bar that carries the way through a site and scrolls away with the content is a bar the reader has to go back for. It takes the navigation layer of the stacking order, so a dialog and a sheet still cover it. */
  sticky?: boolean;
}

const arenaAppBarStyles = arenaStyles(manifest);
const PAGE = 'var(--container-max)';

export function ArenaAppBar({ brand, nav, actions, sticky = true }: ArenaAppBarProps) {
  const styles = arenaAppBarStyles({ sticky });

  return (
    <header className={styles.root()}>
      <div className={styles.band()} style={{ maxWidth: PAGE }}>
        {brand && <div className={styles.brand()}>{brand}</div>}
        {nav && <div className={styles.nav()}>{nav}</div>}
        {actions && <div className={styles.actions()}>{actions}</div>}
      </div>
    </header>
  );
}
