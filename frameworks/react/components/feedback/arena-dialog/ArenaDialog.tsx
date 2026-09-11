import React, { useEffect, useId, useRef } from 'react';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaDialog.classes.generated.ts';
import { useArenaDialogModal } from '../../../UseDialogModal.ts';
import { arenaReadBreakpoint, useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import type { ArenaBreakpoint } from '../../../Api.generated';

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

  /** Below this breakpoint the panel fills the screen: full width and height, no radius and no shadow, the title bar pinned to the top and the footer to the bottom, the body scrolling between them, and every edge inset by the device's safe area. The measurement is the dialog's own box, which covers the viewport while open. Absent, the dialog never fills. The width member is ignored while filling. */
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

export function ArenaDialog({ open, onClose, title, eyebrow, children, footer, width, fillBelow }: ArenaDialogProps) {
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
  return (
    <DialogFrame onClose={onClose} onKeyDown={onKeyDown} panelRef={panelRef} titleId={titleId} title={title}
      eyebrow={eyebrow} footer={footer} width={width} fillBelow={fillBelow}>
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
  width?: string;
  fillBelow?: ArenaBreakpoint;
  children?: React.ReactNode;
}

function DialogFrame({ onClose, onKeyDown, panelRef, titleId, title, eyebrow, footer, width, fillBelow, children }: DialogFrameProps) {
  const [scrimRef, measured] = useArenaContainerWidth<HTMLDivElement>();
  const fill = fillBelow !== undefined && measured !== null && measured < arenaReadBreakpoint(fillBelow);
  const styles = arenaDialogStyles({ open: true, fill });
  return (
    <div ref={scrimRef} onClick={onClose} className={styles.scrim()} data-arena-part={manifest.parts.scrim}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        ref={panelRef} tabIndex={-1} onKeyDown={onKeyDown} aria-labelledby={titleId}
        className={styles.panel()} data-arena-part={manifest.parts.panel} style={{ width: fill ? undefined : width }}>
        <div className={styles.head()} data-arena-part={manifest.parts.head}>
          {eyebrow && <div className={styles.eyebrow()} data-arena-part={manifest.parts.eyebrow}>{eyebrow}</div>}
          <div id={titleId} className={styles.title()} data-arena-part={manifest.parts.title}>{title}</div>
        </div>
        <div className={styles.body()} data-arena-part={manifest.parts.body}>{children}</div>
        {footer && <div className={styles.foot()} data-arena-part={manifest.parts.foot}>{footer}</div>}
      </div>
    </div>
  );
}
