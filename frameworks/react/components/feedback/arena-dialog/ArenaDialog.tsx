import React, { useEffect, useId, useRef } from 'react';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaDialog.classes.generated.ts';
import { useArenaDialogModal } from '../../../UseDialogModal.ts';

export interface ArenaDialogProps {

  /** Whether the dialog is shown. The host owns it. */
  open: boolean;

  /** Names the dialog for assistive technology and heads it visually. Required: aria-labelledby points at it, and a modal with no name is worse than none at all. */
  title: string;

  /** A short kicker above the title. */
  eyebrow?: string;

  /** A CSS width for the panel. It defaults to 480px, which each layer reaches in its own idiom, and the input overrides whichever. */
  width?: string;

  /** The dialog's body. */
  children?: React.ReactNode;

  /** The action row, right-aligned. */
  footer?: React.ReactNode;

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

export function ArenaDialog({ open, onClose, title, eyebrow, children, footer, width }: ArenaDialogProps) {
  useEffect(() => {
    if (width === undefined || arenaIsCssWidth(width)) return;
      arenaWarnOnce(
        `ArenaDialog: width takes a CSS width and "${width}" is not one, so the browser drops the `
        + 'declaration and the panel keeps its default. Pass a length, or the spacing scale '
        + 'arithmetic the default itself uses: calc(var(--sp-1) * 160).',
      );
  }, [width]);


  if (!title) throw new Error('ArenaDialog: `title` is required');

  if (open == null) throw new Error('ArenaDialog: `open` is required');

  const panelRef = useRef<HTMLDivElement | null>(null);
  const onKeyDown = useArenaDialogModal({ open, panelRef, onDismiss: onClose });

  const titleId = useId();
  if (!open) return null;
  const styles = arenaDialogStyles({ open: true });
  return (
    <div onClick={onClose} className={styles.scrim()}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        ref={panelRef} tabIndex={-1} onKeyDown={onKeyDown} aria-labelledby={titleId}
        className={styles.panel()} style={{ width }}>
        <div className={styles.head()}>
          {eyebrow && <div className={styles.eyebrow()}>{eyebrow}</div>}
          <div id={titleId} className={styles.title()}>{title}</div>
        </div>
        <div className={styles.body()}>{children}</div>
        {footer && <div className={styles.foot()}>{footer}</div>}
      </div>
    </div>
  );
}
