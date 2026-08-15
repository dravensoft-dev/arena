import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaBadge.classes.generated.ts';

import type { ArenaTone } from '../../../Api.generated';

export interface ArenaBadgeProps {

  /** The label text. Short: a badge is a chip, not a sentence. */
  children?: React.ReactNode;
  /** System status (success/warning/danger/info) reflects an object's actual state; emphasis (accent, gold) is editorial; neutral carries no semantic weight. */
  tone?: ArenaTone;

  /** Draws a filled dot in the tone colour before the label. */
  dot?: boolean;
}

const arenaBadgeStyles = arenaStyles(manifest);
const TONES = Object.keys(manifest.variants.tone);
const toneOf = (tone: string | undefined): ArenaTone | undefined =>
  (tone && TONES.includes(tone) ? tone as ArenaTone : 'neutral');

export function ArenaBadge({ children, tone = 'neutral', dot = false }: ArenaBadgeProps) {
  const styles = arenaBadgeStyles({ tone: toneOf(tone) });
  return (
    <span className={styles.root()} data-arena-part={manifest.parts.root}>
      {dot && <span className={styles.dot()} data-arena-part={manifest.parts.dot} />}
      {children}
    </span>
  );
}
