import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSpinner.classes.generated.ts';

import type { ArenaControlSize, ArenaSpinnerTone } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';

export interface ArenaSpinnerProps {

  /** Diameter. 'sm' is --icon-sm exactly, so a spinner at that size sits inline with control text. */
  size?: ArenaControlSize;

  /** Colour of the ring. 'on-accent' inside a filled button; 'accent' on a page surface. */
  tone?: ArenaSpinnerTone;

  /** Accessible name, announced by the status role. Say what is loading when you can. Absent, the provided locale's spinnerLabel answers it, which reads Loading by default. */
  label?: string;
}


const arenaSpinnerStyles = arenaStyles(manifest);

export function ArenaSpinner({ size = 'md', tone = 'accent', label }: ArenaSpinnerProps) {
  const locale = useArenaLocale();
  const name = label ?? locale.spinnerLabel;
  const styles = arenaSpinnerStyles({ size, tone });
  return (
    <span role="progressbar" aria-live="polite" aria-label={name} className={styles.root()} data-arena-part={manifest.parts.root}>
      <span className={styles.circle()} data-arena-part={manifest.parts.circle} aria-hidden="true" />
    </span>
  );
}
