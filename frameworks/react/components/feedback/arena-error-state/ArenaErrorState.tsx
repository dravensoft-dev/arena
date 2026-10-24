import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaErrorState.classes.generated.ts';
import { ArenaButton } from '../../forms/arena-button/ArenaButton.tsx';

import type { ArenaHeadingLevel } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaErrorStateClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon.tsx';

export interface ArenaErrorStateProps {
  className?: ArenaErrorStateClass;

  /** A Phosphor class name for the danger glyph ArenaIcon draws. */
  icon?: string;
  /** The headline: what failed. Absent, the provided locale's errorStateTitle answers it. */
  title?: string;
  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. The default is `h3`, the card rung of the title ladder, for the reason an empty state does. A failure fills the body of a region something above it already names. `none` takes the headline out of the outline, which is what a failure inside a small surface wants. The value is available here because `title` carries a default rather than being required. */
  headingLevel?: ArenaHeadingLevel;
  /** A sentence of detail under the title. */
  message?: string;
  /** A diagnostic/support code, shown monospaced. */
  code?: string;
  /** The label of the retry button Arena draws. Absent renders no retry. */
  retryLabel?: string;
  /** The retry button was activated. */
  onRetry?: () => void;
  /** An extra control beside the retry (e.g. a link to logs). The actions wrapper only renders when a retry or a secondary action actually exists, so a bare error state ships no dead space for a retry it does not offer. */
  secondaryAction?: React.ReactNode;
}


const errorStyles = arenaStyles(manifest);

export function ArenaErrorState({ className, icon, title, headingLevel = 'h3', message, code, retryLabel, onRetry, secondaryAction }: ArenaErrorStateProps) {
  const locale = useArenaLocale();
  const heading = title ?? locale.errorStateTitle;
  const styles = errorStyles();
  const Heading = headingLevel === 'none' ? 'div' : headingLevel;
  return (
    <div role="alert" className={arenaClassName('ArenaErrorState', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      {icon && <div className={styles.icon()} data-arena-part={manifest.parts.icon} {...styles.$data.icon()}><ArenaIcon icon={icon} /></div>}
      <Heading className={styles.title()} data-arena-part={manifest.parts.title} {...styles.$data.title()}>{heading}</Heading>
      {message && <div className={styles.message()} data-arena-part={manifest.parts.message} {...styles.$data.message()}>{message}</div>}
      {code && <code className={styles.code()} data-arena-part={manifest.parts.code} {...styles.$data.code()}>{code}</code>}
      {(retryLabel || (secondaryAction !== undefined && secondaryAction !== null && secondaryAction !== false)) && (
        <div className={styles.actions()} data-arena-part={manifest.parts.actions} {...styles.$data.actions()} data-arena-boundary="">
          {retryLabel && <ArenaButton onClick={onRetry}>{retryLabel}</ArenaButton>}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
