import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaToast.classes.generated.ts';

import type { ArenaToastTone } from '../../../Api.generated';
import { dismissDefault, dismissActionable } from '../../../Tokens.generated.js';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaToastClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaToastProps {
  className?: ArenaToastClass;


  /** The bold lead line. */
  title?: string;

  /** The body. */
  message?: string;

  /** The side bar's colour, and whether the toast announces assertively. */
  tone?: ArenaToastTone;

  /** The label of the single inline action: Undo, Retry, View logs. Absent renders no action. */
  actionLabel?: string;

  /** The inline action was activated. */
  onAction?: () => void;

  /** Disables the host's auto-dismiss and shows the Pinned marker. **Implied by `tone: "danger"`, which ignores `false`**: a critical message that vanishes on a timer is one a user can miss entirely, and this was documented as mandatory in an error state while nothing enforced it. Set it explicitly for any other tone that must not disappear on its own. */
  persist?: boolean;

  /** Whether the × is shown. Every layer gates the × on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. */
  dismissible?: boolean;

  /** The × was activated. */
  onClose?: () => void;
}

export const ARENA_TOAST_DISMISS = { default: dismissDefault, actionable: dismissActionable } as const;

const arenaToastStyles = arenaStyles(manifest);
const TONES: readonly string[] = manifest.values.tone;
type ArenaTone = typeof manifest.values.tone[number];
const toneOf = (tone: string | undefined): ArenaTone =>
  (tone && TONES.includes(tone) ? tone as ArenaTone : 'neutral');

export function ArenaToast({ className, title, message, tone = 'neutral', actionLabel, onAction, dismissible = false, onClose, persist = false }: ArenaToastProps) {
  const locale = useArenaLocale();
  const pinned = persist || tone === 'danger';
  const styles = arenaToastStyles({ tone: toneOf(tone) });
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      data-persist={pinned ? '' : undefined} className={arenaClassName('ArenaToast', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <div className={styles.body()} data-arena-part={manifest.parts.body} {...styles.$data.body()}>
        {title && (
          <div className={styles.title()} data-arena-part={manifest.parts.title} {...styles.$data.title()}>
            {title}
            {pinned && <span title={locale.toastPinnedHint} className={styles.pinned()} data-arena-part={manifest.parts.pinned} {...styles.$data.pinned()}>{locale.toastPinned}</span>}
          </div>
        )}
        {message && <div className={styles.message()} data-arena-part={manifest.parts.message} {...styles.$data.message()}>{message}</div>}
        {actionLabel && (
          <button onClick={onAction} className={styles.action()} data-arena-part={manifest.parts.action} {...styles.$data.action()}>{actionLabel}</button>
        )}
      </div>
      {dismissible && (
        <button onClick={onClose} aria-label={locale.toastClose} className={styles.close()} data-arena-part={manifest.parts.close} {...styles.$data.close()}>
          <i className="ph-bold ph-x" />
        </button>
      )}
    </div>
  );
}
