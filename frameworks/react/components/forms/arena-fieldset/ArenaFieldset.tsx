import React, { useId } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaFieldset.classes.generated.ts';
import type { ArenaFieldsetClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon.tsx';

export interface ArenaFieldsetProps {
  className?: ArenaFieldsetClass;

  /** Names the set, on screen and to assistive technology, which announces it on entering the set. Required, and guarded at runtime after trimming: a set with no name announces only that a group began. Say what the set is ("Billing address"), not that it is a group. Plain text. */
  legend: string;

  /** The fields. Required, and guarded at runtime: a fieldset renders a legend naming a set, so a childless one names nothing. The guard counts as the render path does: a false conditional is no child. */
  children: React.ReactNode;

  /** A line of help for the whole set, under the fields, and part of the set's description. */
  hint?: string;

  /** A message about the set rather than about one field ("Choose at least one"), under the fields with a warning glyph. Wins over `hint`, and is part of the set's description while it shows. */
  error?: string;

  /** Whether the whole set is unavailable. Every native control inside it is disabled by the platform, and the set dims. A control that only reflects an unavailable state, and stays focusable, does not inherit it. */
  disabled?: boolean;
}

const arenaFieldsetStyles = arenaStyles(manifest);

export function ArenaFieldset({ className, legend, children, hint, error, disabled = false }: ArenaFieldsetProps) {
  const noteId = `fieldset-${useId().replace(/:/g, '')}-note`;
  if (!legend?.trim()) {
    throw new Error('ArenaFieldset: `legend` is required, and names the set of fields it draws');
  }
  if (React.Children.toArray(children).length === 0) {
    throw new Error('ArenaFieldset: a fieldset with no children is not a legal shape, because its legend would name nothing');
  }
  const styles = arenaFieldsetStyles({ state: error ? 'error' : 'neutral', disabled });
  return (
    <fieldset className={arenaClassName('ArenaFieldset', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}
      disabled={disabled} aria-describedby={error || hint ? noteId : undefined}>
      <legend className={styles.legend()} data-arena-part={manifest.parts.legend} {...styles.$data.legend()}>{legend}</legend>
      <div className={styles.stack()} data-arena-part={manifest.parts.stack} {...styles.$data.stack()}>
        <div className={styles.body()} data-arena-part={manifest.parts.body} {...styles.$data.body()} data-arena-boundary="">{children}</div>
        {error
          ? (
            <span id={noteId} className={styles.error()} data-arena-part={manifest.parts.error} {...styles.$data.error()}>
              <span className={styles.statusIcon()} data-arena-part={manifest.parts.statusIcon} {...styles.$data.statusIcon()} aria-hidden="true"><ArenaIcon icon="ph-fill ph-warning-circle" /></span>
              {error}
            </span>
          )
          : hint && <span id={noteId} className={styles.hint()} data-arena-part={manifest.parts.hint} {...styles.$data.hint()}>{hint}</span>}
      </div>
    </fieldset>
  );
}
