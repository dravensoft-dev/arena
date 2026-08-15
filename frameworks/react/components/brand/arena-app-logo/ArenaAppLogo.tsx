import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaAppLogo.classes.generated.ts';

import type { ArenaLogoSize, ArenaOrientation } from '../../../Api.generated';

export interface ArenaAppLogoProps {

  /** Both halves at once: the mark's slot and the wordmark. */
  size?: ArenaLogoSize;
  /** Mark beside the name, or above it. */
  orientation?: ArenaOrientation;

  /** The mark, as an asset the consumer supplies. Required: Arena ships MIT and a default would ship Dravensoft's trademark to whoever never read the API. The slot sizes the mark; a mark that brings its own dimensions fights the lock-up. */
  mark: React.ReactNode;

  /** The product name, or its first half when `dim` carries the second. */
  name: string;

  /** The wordmark's second half, drawn muted. Present for the manual's Primary variant, absent for Monochrome, which is why there is no `variant` member: the mark's ink and this are the same two decisions. */
  dim?: string;
}


const logoStyles = arenaStyles(manifest);

export function ArenaAppLogo({ size = 'md', orientation = 'horizontal', mark, name, dim }: ArenaAppLogoProps) {
  if (!mark || !name) throw new Error('ArenaAppLogo: `mark` and `name` are required');
  const styles = logoStyles({ size, orientation });
  return (
    <span className={styles.root()} data-arena-part={manifest.parts.root}>
      <span className={styles.mark()} data-arena-part={manifest.parts.mark}>{mark}</span>
      <span className={styles.name()} data-arena-part={manifest.parts.name}>
        {name}{dim && <span className={styles.dim()} data-arena-part={manifest.parts.dim}>{dim}</span>}
      </span>
    </span>
  );
}
