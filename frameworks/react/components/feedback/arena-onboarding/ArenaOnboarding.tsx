import React, { useRef } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaOnboarding.classes.generated.ts';
import { onboardingWidth, onboardingHeightReserve, sp3, sp4 } from '../../../Tokens.generated.js';

const SSR_VIEWPORT_H = 900;
import { useArenaDialogModal } from '../../../UseDialogModal.ts';

import type { ArenaOnboardingStep, ArenaOnboardingAnchor } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';

export type { ArenaOnboardingStep };

export interface ArenaOnboardingProps {

  /** Whether the tour is shown. Closed renders nothing, scrim included. */
  open: boolean;

  /** The tour, in order. An empty tour renders nothing. */
  steps: readonly ArenaOnboardingStep[];

  /** Which step is current. The host owns it and answers next/back. */
  index?: number;

  /** Where to attach the coachmark, as the two viewport coordinates it positions from. Absent floats it bottom-right. */
  anchor?: ArenaOnboardingAnchor;

  /** Next was activated on a step that is not the last. */
  onNext?: () => void;

  /** Back was activated on a step that is not the first. */
  onBack?: () => void;

  /** Skip was activated, or the scrim was clicked. */
  onSkip?: () => void;

  /** The final step's confirming control was activated. */
  onDone?: () => void;
}


const arenaOnboardingStyles = arenaStyles(manifest);

export function ArenaOnboarding({ open, steps, index = 0, onNext, onBack, onSkip, onDone, anchor }: ArenaOnboardingProps) {
  const locale = useArenaLocale();
  if (open == null) throw new Error('ArenaOnboarding: `open` is required');
  if (steps == null) throw new Error('ArenaOnboarding: `steps` is required');

  const panelRef = useRef<HTMLDivElement | null>(null);
  const onKeyDown = useArenaDialogModal({ open, panelRef, onDismiss: onSkip });
  if (!open || !steps.length) return null;
  const step = steps[index] || {};
  const last = index === steps.length - 1;

  const label = step.title ?? step.eyebrow ?? arenaPhrase(locale.onboardingStep, { current: index + 1, total: steps.length });

  const W = onboardingWidth;
  const EDGE = sp4;

  let pos: React.CSSProperties | undefined;
  if (anchor) {

    const top = Math.min(anchor.bottom + sp3, (typeof window !== 'undefined' ? window.innerHeight : SSR_VIEWPORT_H) - onboardingHeightReserve);
    let left = anchor.left;
    if (typeof window !== 'undefined') left = Math.min(left, window.innerWidth - W - EDGE);
    pos = { top, left: Math.max(EDGE, left) };
  }

  const styles = arenaOnboardingStyles({ placement: anchor ? 'anchored' : 'floating', open: true });
  return (
    <div onClick={onSkip} className={styles.root()} data-arena-part={manifest.parts.root}>
      <div role="dialog" aria-modal="true" aria-label={label}
        ref={panelRef} tabIndex={-1} onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}
        className={styles.panel()} data-arena-part={manifest.parts.panel} style={pos}>
        {step.eyebrow && <div className={styles.eyebrow()} data-arena-part={manifest.parts.eyebrow}>{step.eyebrow}</div>}
        {step.title && <div className={styles.title()} data-arena-part={manifest.parts.title}>{step.title}</div>}
        {step.body && <div className={styles.body()} data-arena-part={manifest.parts.body}>{step.body}</div>}
        <div className={styles.foot()} data-arena-part={manifest.parts.foot}>
          <div className={styles.dots()} data-arena-part={manifest.parts.dots} aria-label={arenaPhrase(locale.onboardingProgress, { current: index + 1, total: steps.length })}>
            {steps.map((_, i) => (
              <span key={i} className={`${styles.dot()} ${i === index ? styles.dotOn() : styles.dotOff()}`}
                data-arena-part={manifest.parts.dot} />
            ))}
          </div>
          {index > 0 && <button onClick={onBack} className={styles.text()} data-arena-part={manifest.parts.text}>{locale.onboardingBack}</button>}
          {!last && <button onClick={onSkip} className={styles.text()} data-arena-part={manifest.parts.text}>{locale.onboardingSkip}</button>}
          <button onClick={last ? onDone : onNext} className={styles.next()} data-arena-part={manifest.parts.next}>
            {last ? locale.onboardingDone : locale.onboardingNext}
          </button>
        </div>
      </div>
    </div>
  );
}
