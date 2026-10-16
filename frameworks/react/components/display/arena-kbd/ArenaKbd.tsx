import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaKbd.classes.generated.ts';
import type { ArenaKbdClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaKbdProps {
  className?: ArenaKbdClass;

  /** One entry per key, in the order pressed, each spelled as the keyboard prints it: "Ctrl", "K", the command glyph. Required, and guarded at runtime after trimming: an empty list, or an entry with nothing on it, is a cap with no key, so the component throws. */
  keys: readonly string[];

  /** Drawn between caps, never before the first. An empty string glues the caps together, as a Mac shortcut is printed. Arena draws it in its own aria-hidden span. */
  separator?: string;

  /** What a reader hears instead of the caps, for a combination whose glyphs a screen reader reads badly, such as the command glyph. Present and not blank, the caps are hidden from assistive technology and the label is the one spoken text. Arena maps no glyph to a word, so a cap holding a symbol wants one. */
  label?: string;
}

const arenaKbdStyles = arenaStyles(manifest);

export function ArenaKbd({ className, keys, separator = '+', label }: ArenaKbdProps) {
  if (!keys || keys.length === 0 || keys.some((key) => !key?.trim())) {
    throw new Error('ArenaKbd: `keys` is required, and every entry names a key: an empty list or a blank entry is a cap with nothing on it');
  }
  const styles = arenaKbdStyles();
  const spoken = label?.trim() ? label : null;
  return (
    <kbd className={arenaClassName('ArenaKbd', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && separator !== '' && (
            <span aria-hidden="true" className={styles.separator()} data-arena-part={manifest.parts.separator} {...styles.$data.separator()}>{separator}</span>
          )}
          <kbd aria-hidden={spoken === null ? undefined : 'true'} className={styles.key()} data-arena-part={manifest.parts.key} {...styles.$data.key()}>{key}</kbd>
        </React.Fragment>
      ))}
      {spoken !== null && <span className={styles.name()} data-arena-part={manifest.parts.name} {...styles.$data.name()}>{spoken}</span>}
    </kbd>
  );
}
