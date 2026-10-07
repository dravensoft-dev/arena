import React, { useEffect, useId, useRef } from 'react';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaDialog.classes.generated.ts';
import { useArenaDialogModal } from '../../../UseDialogModal.ts';
import { arenaReadBreakpoint, useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import type { ArenaBreakpoint } from '../../../Api.generated';
import type { ArenaDialogClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaDialogProps {
  className?: ArenaDialogClass;


  /** Whether the dialog is shown. The host owns it. */
  open: boolean;

  /** Names the dialog for assistive technology and heads it visually. Required: aria-labelledby points at it, and a modal with no name is worse than none at all. */
  title: string;

  /** A short kicker above the title. */
  eyebrow?: string;

  /** The dialog's body. */
  children?: React.ReactNode;

  /** The action row, right-aligned. */
  footer?: React.ReactNode;

  /** Below this breakpoint the panel fills the screen: full width and height, no radius and no shadow, the title bar pinned to the top and the footer to the bottom, the body scrolling between them, and every edge inset by the device's safe area. The measurement is the dialog's own box, which covers the viewport while open. Absent, the dialog never fills. The width is ignored while filling. */
  fillBelow?: ArenaBreakpoint;

  /** The dialog was dismissed -- by Escape or by a scrim click. No payload. */
  onClose?: () => void;
}


const arenaDialogStyles = arenaStyles(manifest);

function arenaIsCssWidth(value: string): boolean {
  if (value.includes('(') || typeof document === 'undefined') return true;
  const probe = document.createElement('div');
  probe.style.width = value;
  return probe.style.width !== '';
}

export function ArenaDialog({ className, open, onClose, title, eyebrow, children, footer, fillBelow }: ArenaDialogProps) {
  if (!title) throw new Error('ArenaDialog: `title` is required');

  if (open == null) throw new Error('ArenaDialog: `open` is required');

  const panelRef = useRef<HTMLDivElement | null>(null);
  const onKeyDown = useArenaDialogModal({ open, panelRef, onDismiss: onClose });

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const value = getComputedStyle(panel).getPropertyValue('--arena-dialog-width').trim();
    if (value === '' || arenaIsCssWidth(value)) return;
    arenaWarnOnce(`ArenaDialog: --arena-dialog-width is "${value}", which is not a CSS width, so the browser `
      + 'drops it and the panel keeps the width its class or its default gives it. Set a length, or a derivation '
      + 'of tokens such as calc(var(--sp-1) * 160).');
  }, [open]);

  const titleId = useId();
  if (!open) return null;
  return (
    <DialogFrame onClose={onClose} onKeyDown={onKeyDown} panelRef={panelRef} titleId={titleId} title={title}
      eyebrow={eyebrow} footer={footer} fillBelow={fillBelow} className={className}>
      {children}
    </DialogFrame>
  );
}

interface DialogFrameProps {
  onClose?: () => void;
  onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
  panelRef: React.MutableRefObject<HTMLDivElement | null>;
  titleId: string;
  title: string;
  eyebrow?: string;
  footer?: React.ReactNode;
  fillBelow?: ArenaBreakpoint;
  className?: ArenaDialogClass;
  children?: React.ReactNode;
}

function DialogFrame({ className, onClose, onKeyDown, panelRef, titleId, title, eyebrow, footer, fillBelow, children }: DialogFrameProps) {
  const [scrimRef, measured] = useArenaContainerWidth<HTMLDivElement>();
  const fill = fillBelow !== undefined && measured !== null && measured < arenaReadBreakpoint(fillBelow);
  const styles = arenaDialogStyles({ open: true, fill });
  return (
    <div ref={scrimRef} onClick={onClose} className={arenaClassName('ArenaDialog', styles.scrim(), className)} data-arena-part={manifest.parts.scrim} {...styles.$data.scrim()} data-arena-surface="floating">
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        ref={panelRef} tabIndex={-1} onKeyDown={onKeyDown} aria-labelledby={titleId}
        className={styles.panel()} data-arena-part={manifest.parts.panel} {...styles.$data.panel()}>
        <div className={styles.head()} data-arena-part={manifest.parts.head} {...styles.$data.head()}>
          {eyebrow && <div className={styles.eyebrow()} data-arena-part={manifest.parts.eyebrow} {...styles.$data.eyebrow()}>{eyebrow}</div>}
          <div id={titleId} className={styles.title()} data-arena-part={manifest.parts.title} {...styles.$data.title()}>{title}</div>
        </div>
        <div className={styles.body()} data-arena-part={manifest.parts.body} {...styles.$data.body()} data-arena-boundary="">{children}</div>
        {footer && <div className={styles.foot()} data-arena-part={manifest.parts.foot} {...styles.$data.foot()} data-arena-boundary="">{footer}</div>}
      </div>
    </div>
  );
}
