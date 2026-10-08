import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSkeleton.classes.generated.ts';

import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaSkeletonClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaSkeletonProps {
  className?: ArenaSkeletonClass;

  /** How many lines of text the placeholder stands in for. Absent, it is one box in the shape its class names; given, it is a stack of that many lines, the last running short when there is more than one. */
  lines?: number;
}

const arenaSkeletonStyles = arenaStyles(manifest);

export function ArenaSkeleton({ className, lines }: ArenaSkeletonProps) {
  const locale = useArenaLocale();
  const styles = arenaSkeletonStyles({});
  if (lines !== undefined) {
    const count = Number.isFinite(lines) ? Math.max(0, Math.floor(lines)) : 0;
    const last = arenaSkeletonStyles({ last: true });
    return (
      <div role="status" aria-label={locale.skeletonLabel} className={arenaClassName('ArenaSkeleton', styles.stack(), className)}
        data-arena-part={manifest.parts.stack} {...styles.$data.stack()}>
        {Array.from({ length: count }).map((_, i) => {
          const row = i === count - 1 && count > 1 ? last : styles;
          return <div key={i} className={row.line()} data-arena-part={manifest.parts.line} {...row.$data.line()} />;
        })}
      </div>
    );
  }
  return (
    <div className={arenaClassName('ArenaSkeleton', styles.root(), className)} data-arena-part={manifest.parts.root}
      {...styles.$data.root()} role="status" aria-label={locale.skeletonLabel} />
  );
}
