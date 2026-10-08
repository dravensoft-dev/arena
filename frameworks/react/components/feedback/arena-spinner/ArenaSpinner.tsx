import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSpinner.classes.generated.ts';

import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaSpinnerClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaSpinnerProps {
  className?: ArenaSpinnerClass;




  /** Accessible name, announced by the status role. Say what is loading when you can. Absent, the provided locale's spinnerLabel answers it, which reads Loading by default. */
  label?: string;
}


const arenaSpinnerStyles = arenaStyles(manifest);

export function ArenaSpinner({ className, label }: ArenaSpinnerProps) {
  const locale = useArenaLocale();
  const name = label ?? locale.spinnerLabel;
  const styles = arenaSpinnerStyles({});
  return (
    <span role="progressbar" aria-live="polite" aria-label={name} className={arenaClassName('ArenaSpinner', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <span className={styles.circle()} data-arena-part={manifest.parts.circle} {...styles.$data.circle()} aria-hidden="true" />
    </span>
  );
}
