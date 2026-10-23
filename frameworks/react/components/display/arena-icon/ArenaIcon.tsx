import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaIcon.classes.generated.ts';

import { useArenaIcons } from '../../../ArenaIcons.ts';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import type { ArenaIconClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaIconProps {
  className?: ArenaIconClass;
  /** Phosphor class names, a weight and a glyph such as ph-bold ph-plus. The weight defaults to regular. */
  icon: string;
}

const WEIGHTS: Record<string, string> = {
  'ph-thin': 'thin', 'ph-light': 'light', 'ph': 'regular', 'ph-bold': 'bold', 'ph-duotone': 'duotone', 'ph-fill': 'fill',
};

function symbolId(icon: string): string | null {
  let weight = 'regular';
  let glyph: string | null = null;
  for (const token of icon.split(/\s+/)) {
    const named = Object.hasOwn(WEIGHTS, token) ? WEIGHTS[token] : undefined;
    if (named !== undefined) weight = named;
    else if (token.startsWith('ph-') && token.length > 3) glyph = token.slice(3);
  }
  return glyph === null ? null : `ph-${weight}-${glyph}`;
}

const arenaIconStyles = arenaStyles(manifest);

export function ArenaIcon({ icon, className }: ArenaIconProps) {
  const href = useArenaIcons();
  const id = symbolId(icon);
  if (id === null) {
    arenaWarnOnce(`ArenaIcon has no glyph: "${icon}" names no ph-<name> class.`);
    return null;
  }
  if (href === null) {
    arenaWarnOnce('ArenaIcon has no sprite: hand the URL of the icons-<hash>.svg arena build writes to ArenaIconsProvider (React) or provideArenaIcons (Angular).');
    return null;
  }
  const styles = arenaIconStyles({});
  return (
    <svg className={arenaClassName('ArenaIcon', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()} aria-hidden="true" focusable="false">
      <use href={`${href}#${id}`} />
    </svg>
  );
}
