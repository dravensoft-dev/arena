import React, { useId } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSheet.classes.generated.ts';

import type { ArenaSheetPlacement } from '../../../Api.generated';

export interface ArenaSheetProps {

  /** Whether the panel is on the page at all. The host owns it, the same way it owns a dialog's. Closed renders nothing, which is what distinguishes it from collapsed. */
  open: boolean;

  /** The edge the panel is anchored to. It spans that edge and stands off the device's own inset there, so a bottom sheet on a phone clears the home indicator. */
  placement?: ArenaSheetPlacement;

  /** Names the panel for assistive technology and heads it visually. It is also the accessible name of the fold control, so a reader hears which panel is being folded rather than the word Toggle. Required and **guarded at runtime** rather than defaulted: what this panel is showing is editorial, and a constant fallback would satisfy the pattern mechanically while telling a screen-reader user nothing. */
  title: string;

  /** Whether the body is folded away. The header stays visible either way: a collapsed panel is still on the page and still says what it is, which is why folding is not the same act as closing. The body is hidden rather than removed, so the fold control's reference to it never points at nothing. */
  collapsed?: boolean;

  /** The fold control was pressed, carrying the state it moved to. Arena never folds the panel by itself, so a host that ignores this gets a control that reports and a body that does not move. */
  onCollapsedChange?: (collapsed: boolean) => void;

  /** Whether the close control is shown. Every layer gates it on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. */
  dismissible?: boolean;

  /** The panel was dismissed, by the close control or by Escape. No payload. Escape reports here rather than adding a member of its own, and it is the only key the panel takes: a non-modal panel leaves every other key to the page behind it. */
  onClose?: () => void;

  /** The panel's body, which is what folds away. */
  children?: React.ReactNode;

  /** A row that stays put while the body scrolls: a total and its action, a pair of filters buttons. It is outside the folding body on purpose, so a folded panel can still carry the one action it exists for. */
  footer?: React.ReactNode;
}

const arenaSheetStyles = arenaStyles(manifest);

export function ArenaSheet({
  open, placement = 'bottom', title, collapsed = false, onCollapsedChange,
  dismissible = false, onClose, children, footer,
}: ArenaSheetProps) {

  if (!title || title.trim() === '') throw new Error('ArenaSheet: `title` is required, and names the panel and the control that folds it');

  if (open == null) throw new Error('ArenaSheet: `open` is required');

  const id = useId();
  const triggerId = `${id}-trigger`;
  const bodyId = `${id}-body`;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onClose?.();
  };

  if (!open) return null;
  const styles = arenaSheetStyles({ placement, open: true });
  return (
    <div onKeyDown={onKeyDown} className={styles.root()} data-arena-part={manifest.parts.root}>
      <div className={styles.head()} data-arena-part={manifest.parts.head}>
        <button type="button" id={triggerId} aria-expanded={!collapsed} aria-controls={bodyId}
          onClick={() => onCollapsedChange?.(!collapsed)} className={styles.trigger()} data-arena-part={manifest.parts.trigger}>
          <span>{title}</span>
          <i className={`${collapsed ? 'ph-bold ph-caret-up' : 'ph-bold ph-caret-down'} ${styles.caret()}`} data-arena-part={manifest.parts.caret}
            aria-hidden="true" />
        </button>
        {dismissible && (
          <button type="button" onClick={onClose} aria-label="Close" className={styles.close()} data-arena-part={manifest.parts.close}>
            <i className="ph-bold ph-x" aria-hidden="true" />
          </button>
        )}
      </div>
      <div id={bodyId} role="group" aria-labelledby={triggerId} hidden={collapsed} className={styles.body()} data-arena-part={manifest.parts.body}>
        {children}
      </div>
      {footer && <div className={styles.foot()} data-arena-part={manifest.parts.foot}>{footer}</div>}
    </div>
  );
}
