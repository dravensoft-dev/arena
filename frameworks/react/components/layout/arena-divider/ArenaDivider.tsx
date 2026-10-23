import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaDivider.classes.generated.ts';
import type { ArenaDividerClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaDividerProps {
  className?: ArenaDividerClass;

  /** The word drawn between two rules, plain text and never markup. Absent or blank, the divider is one <hr>. Arena draws it in the label register, so it is data rather than a slot. */
  label?: string;
}

const arenaDividerStyles = arenaStyles(manifest);

export function ArenaDivider({ className, label }: ArenaDividerProps) {
  const word = label?.trim() ? label : null;
  const styles = arenaDividerStyles({ labelled: word !== null });
  if (word === null) {
    return (
      <hr className={arenaClassName('ArenaDivider', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()} />
    );
  }
  return (
    <div className={arenaClassName('ArenaDivider', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <span aria-hidden="true" className={styles.rule()} data-arena-part={manifest.parts.rule} {...styles.$data.rule()} />
      <span className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{word}</span>
      <span aria-hidden="true" className={styles.rule()} data-arena-part={manifest.parts.rule} {...styles.$data.rule()} />
    </div>
  );
}
