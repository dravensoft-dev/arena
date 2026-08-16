import React, { useId, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaConfirmDialog.classes.generated.ts';
import { ArenaButton } from '../../forms/arena-button/ArenaButton.tsx';
import { useArenaDialogModal } from '../../../UseDialogModal.ts';

export interface ArenaConfirmDialogProps {
  /** Whether the dialog is shown. The host owns it, as in the other three modals: defaulting it would let an ArenaConfirmDialog whose open was never wired render nothing forever and look like a working closed dialog. */
  open: boolean;
  /** The dialog was dismissed -- by the Cancel action or by the Escape key, in both layers. A scrim click is deliberately NOT one of them: this component never closes on click-outside. No payload. */
  onCancel?: () => void;
  /** The action was confirmed. */
  onConfirm?: () => void;

  /** The dialog heading, and the name the panel's aria-labelledby points at. Required: nothing can derive a name for a confirmation, because its subject is editorial, and a modal announcing only its role is worse than none at all. Required whatever open is, since a required member absent is a caller bug rather than a state to render: render the component when there is something to confirm, and hold on to the subject across a cancel so it still has a name while it closes. */
  title: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** The dialog body: the question and any detail. */
  children?: React.ReactNode;
  /** The confirm button's label. */
  confirmLabel?: string;
  /** The cancel button's label. */
  cancelLabel?: string;
  /** Gives the confirm button Arena's only filled danger surface. */
  destructive?: boolean;
  /** Locks the confirm button until this exact word is typed. */
  requireText?: string;
}


const confirmStyles = arenaStyles(manifest);

export function ArenaConfirmDialog({ open, onCancel, onConfirm, title, eyebrow = 'Confirm', children,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, requireText }: ArenaConfirmDialogProps) {

  if (!title) throw new Error('ArenaConfirmDialog: `title` is required');
  if (open == null) throw new Error('ArenaConfirmDialog: `open` is required');
  const [typed, setTyped] = useState('');

  const panelRef = useRef<HTMLDivElement | null>(null);
  const onKeyDown = useArenaDialogModal({ open, panelRef, onDismiss: onCancel });

  const titleId = useId();
  if (!open) return null;
  const locked = requireText ? typed.trim() !== requireText : false;
  const styles = confirmStyles({ destructive, invalid: locked && typed !== '', open: true });
  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      <div role="alertdialog" aria-modal="true"
        ref={panelRef} tabIndex={-1} onKeyDown={onKeyDown} aria-labelledby={titleId}
        className={styles.panel()} data-arena-part={manifest.parts.panel}>
        <div className={styles.head()} data-arena-part={manifest.parts.head}>
          <div className={styles.eyebrow()} data-arena-part={manifest.parts.eyebrow}>{eyebrow}</div>
          <div id={titleId} className={styles.title()} data-arena-part={manifest.parts.title}>{title}</div>
        </div>
        <div className={styles.body()} data-arena-part={manifest.parts.body}>
          {children}
          {requireText && (
            <div className={styles.requireBlock()} data-arena-part={manifest.parts.requireBlock}>
              <div className={styles.requireLabel()} data-arena-part={manifest.parts.requireLabel}>Type "{requireText}" to confirm</div>
              <input value={typed} onChange={(e) => setTyped(e.target.value)}
                className={styles.input()} data-arena-part={manifest.parts.input} />
            </div>
          )}
        </div>
        <div className={styles.foot()} data-arena-part={manifest.parts.foot}>
          <ArenaButton variant="ghost" onClick={onCancel}>{cancelLabel}</ArenaButton>
          <button type="button" onClick={onConfirm} disabled={locked} className={styles.confirm()} data-arena-part={manifest.parts.confirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
