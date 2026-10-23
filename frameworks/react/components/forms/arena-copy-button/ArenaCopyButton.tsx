import React, { useEffect, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaCopyButton.classes.generated.ts';
import { dismissConfirmation } from '../../../Tokens.generated.js';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaCopyButtonClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ArenaIconButton } from '../arena-icon-button/ArenaIconButton.tsx';

export interface ArenaCopyButtonProps {
  className?: ArenaCopyButtonClass;


  /** What is written to the clipboard, exactly as given. A blank text draws the button disabled, because there is nothing to copy. The text is data, so it is not guarded. */
  text: string;

  /** The button's accessible name, the same in every state. Absent or blank, the provided locale's copyButtonLabel answers it, which reads Copy by default. Name what is copied when a page holds more than one. */
  label?: string;

  /** Draws the name beside the glyph, as ArenaIconButton.showLabel does. */
  showLabel?: boolean;

  /** Blocks the copy. */
  disabled?: boolean;

  /** The clipboard took the text. No payload, because the consumer already holds the text. */
  onCopied?: () => void;

  /** The clipboard refused the text, or the page has none, as on an insecure origin. No payload and never an error object. */
  onCopyFailed?: () => void;
}

export type ArenaCopyPhase = 'rest' | 'copied' | 'failed';

export const ARENA_COPY_GLYPHS = { rest: 'ph-bold ph-copy', copied: 'ph-bold ph-check', failed: 'ph-bold ph-warning' } as const;

export const ARENA_COPY_CONFIRMATION = dismissConfirmation;

const copyButtonStyles = arenaStyles(manifest);

export function ArenaCopyButton({ className, text, label, showLabel = false, disabled = false, onCopied, onCopyFailed }: ArenaCopyButtonProps) {
  const locale = useArenaLocale();
  const [phase, setPhase] = useState<ArenaCopyPhase>('rest');
  const clock = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(clock.current);
    };
  }, []);

  const styles = copyButtonStyles();
  const name = label?.trim() ? label : locale.copyButtonLabel;
  const off = disabled || text.trim() === '';
  const said = phase === 'copied' ? locale.copyButtonCopied : phase === 'failed' ? locale.copyButtonFailed : '';

  const settle = (next: Exclude<ArenaCopyPhase, 'rest'>) => {
    if (!mounted.current) return;
    clearTimeout(clock.current);
    setPhase(next);
    clock.current = setTimeout(() => setPhase('rest'), ARENA_COPY_CONFIRMATION);
    if (next === 'copied') onCopied?.();
    else onCopyFailed?.();
  };

  const copy = () => {
    if (off) return;
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (!clipboard?.writeText) {
      settle('failed');
      return;
    }
    clipboard.writeText(text).then(() => settle('copied'), () => settle('failed'));
  };

  return (
    <span className={arenaClassName('ArenaCopyButton', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <ArenaIconButton icon={ARENA_COPY_GLYPHS[phase]} label={name} showLabel={showLabel} disabled={off} onClick={copy} />
      <span role="status" className={styles.announcement()} data-arena-part={manifest.parts.announcement} {...styles.$data.announcement()}>{said}</span>
    </span>
  );
}
