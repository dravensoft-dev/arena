import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaUnauthCard.classes.generated.ts';
import { ArenaCard } from '../arena-card/ArenaCard.tsx';

import type { ArenaHeadingLevel } from '../../../Api.generated';

export interface ArenaUnauthCardProps {

  /** The brand lock-up above the panel's content. An ArenaAppLogo, in practice. */
  brand?: React.ReactNode;

  /** Mono crimson microlabel: the product, not the task. */
  eyebrow?: string;

  /** The task. "Welcome back", "Check your inbox". */
  title?: string;

  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h2` because this title is drawn in the section register rather than the card one, so the outline follows the register the same way every other title on the ladder does. A signed-out screen whose only title is this one says `h1` and gets the page's one heading, which is the case the member exists for. `none` takes the title out of the outline entirely; with no title there is no heading either way. */
  headingLevel?: ArenaHeadingLevel;

  /** Centred muted line below the content: a recovery link, a legal note. */
  footer?: React.ReactNode;

  /** The fields, composed from ArenaInput and ArenaButton. */
  children?: React.ReactNode;
}


const unauthStyles = arenaStyles(manifest);

export function ArenaUnauthCard({ brand, eyebrow, title, headingLevel = 'h2', footer, children }: ArenaUnauthCardProps) {
  const styles = unauthStyles();
  const Heading = headingLevel === 'none' ? 'div' : headingLevel;
  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      <ArenaCard>
        <div className={styles.body()} data-arena-part={manifest.parts.body}>
          {brand && <div className={styles.brand()} data-arena-part={manifest.parts.brand}>{brand}</div>}
          {eyebrow && <div className={styles.eyebrow()} data-arena-part={manifest.parts.eyebrow}>{eyebrow}</div>}
          {title && <Heading className={styles.title()} data-arena-part={manifest.parts.title}>{title}</Heading>}
          {children}
          {footer && <div className={styles.footer()} data-arena-part={manifest.parts.footer}>{footer}</div>}
        </div>
      </ArenaCard>
    </div>
  );
}
