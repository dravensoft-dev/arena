import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-calendar/ArenaCalendar.classes.generated.ts';
import React from 'react';
import { ArenaIconButton } from '../../forms/arena-icon-button/ArenaIconButton.tsx';
import { arenaCatColor, arenaCatTint } from '../../../DataVisuals.ts';

import type { ArenaCatSlot } from '../../../Api.generated';

export interface ArenaCalendarEventProps {

  /** Stable identity, so a host can switch on it rather than on the title. */
  id: string;

  /** What the chip reads. */
  title: string;

  /** ISO datetime the event begins. */
  start: string;

  /** ISO datetime the event ends. */
  end: string;

  /** Identity colour. Give the same entity the same slot everywhere and it keeps its colour across views. */
  colorId?: ArenaCatSlot;

  /** Whether the chip can be activated. A boolean rather than "is `click` bound?", because Arena never derives what it draws from what a consumer listens for, and the same member `ArenaTableRow.interactive` is for the same reason. An interactive chip is a <button> a keyboard user reaches with Enter from the hour cell it overlaps; a non-interactive one draws the same chip with no role and no activation, so a read-only schedule announces events rather than a screenful of buttons that do nothing. */
  interactive?: boolean;

  /** Whether the chip is drawn but cannot be activated: an event a consumer's rules lock, such as one already past or owned by someone else. It reflects through `aria-disabled` rather than the native `disabled` attribute, so the chip keeps its place in the grid's roving Tab sequence and is announced as unavailable instead of disappearing from it. With `interactive` false there is nothing to activate and the chip is inert already. */
  disabled?: boolean;

  /** Whether the chip shows its action button. A boolean rather than "is the actions slot filled?": Arena never derives what it draws from what a consumer listens for, because projected content is not inspectable in at least one platform, so gating the drawing on it is a divergence waiting to happen. */
  actionsEnabled?: boolean;

  /** The action panel's content, revealed by the chip's action button. Rendered only while the panel is open, so a consumer's own controls never sit permanently in the grid's Tab sequence. */
  actions?: React.ReactNode;

  /** The chip was activated. No payload: the consumer wrote this element, so they already hold the event this is about. Never emitted while `disabled`. */
  onClick?: () => void;
}


export interface ArenaCalendarEventInjected {
  box: React.CSSProperties;
  domId: string;
  color: string;
  timeLabel: string;
  dateLabel: string;
  showTime: boolean;
  actionsBelow: boolean;
  tabIndex: number;
  defaultPanelOpen: boolean;
}

const chipStyles = arenaStyles(manifest);

export const ArenaCalendarEvent = React.forwardRef<
HTMLElement, ArenaCalendarEventProps & Partial<ArenaCalendarEventInjected>
>(function ArenaCalendarEvent({
  id, title, start, end, colorId, onClick, interactive = false, disabled = false,
  actionsEnabled = false, actions,
  box, domId, color, timeLabel, dateLabel, showTime, actionsBelow, tabIndex, defaultPanelOpen,
}, ref) {

  const ink = color ?? arenaCatColor(colorId ?? 1);

  if (!id) throw new Error('ArenaCalendarEvent: `id` is required');
  if (!title) throw new Error('ArenaCalendarEvent: `title` is required');
  if (!start) throw new Error('ArenaCalendarEvent: `start` is required');
  if (!end) throw new Error('ArenaCalendarEvent: `end` is required');

  const hasPanel = actionsEnabled;
  const ArenaTag = interactive && !hasPanel ? 'button' : 'div';

  const [panelOpen, setPanelOpen] = React.useState(Boolean(defaultPanelOpen));
  const styles = chipStyles({
    reserve: hasPanel && !actionsBelow,
    panelOpen,
    clickable: interactive,
    disabled: interactive && disabled,
    actionsBelow,
  });


  const bodyIsButton = interactive && hasPanel;

  const activate = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (interactive && !disabled && onClick) onClick();
  };

  const focusableRef = React.useRef<HTMLElement | null>(null);
  const kebabWrapRef = React.useRef<HTMLElement | null>(null);
  const panelRef = React.useRef<HTMLElement | null>(null);
  const setFocusable = (node: HTMLElement | null) => {
    focusableRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const kebabEl = (): HTMLElement | null =>
    (kebabWrapRef.current?.firstElementChild instanceof HTMLElement ? kebabWrapRef.current.firstElementChild : null);

  const openedByUser = React.useRef(false);
  React.useEffect(() => {
    if (!panelOpen || !openedByUser.current) return;
    openedByUser.current = false;
    const panel = panelRef.current;
    if (!panel) return;

    const first = panel.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (first) first.focus();
  }, [panelOpen]);

  const body = (
    <>
      <span className={styles.title()} data-arena-part={manifest.parts.title}>{title}</span>
      {showTime && (
        <span className={styles.time()} data-arena-part={manifest.parts.time}>{timeLabel}</span>
      )}
    </>
  );

  return (
    <ArenaTag ref={bodyIsButton ? undefined : setFocusable}

      type={interactive && !hasPanel ? 'button' : undefined}
      tabIndex={bodyIsButton ? undefined : tabIndex}
      onClick={hasPanel ? undefined : activate}
      aria-label={interactive && !hasPanel ? `${title}, ${dateLabel}, ${timeLabel}` : undefined}
      aria-disabled={interactive && !hasPanel && disabled ? 'true' : undefined}
      onKeyDown={hasPanel ? (e) => {

        if (e.key === 'Escape' && panelOpen) {
          e.stopPropagation();
          setPanelOpen(false);
          const kebab = kebabEl();
          if (kebab) kebab.focus();
          return;
        }
        const kebab = kebabEl();
        if (!kebab) return;
        if (e.key === 'ArrowRight' && e.target !== kebab) {
          e.preventDefault(); e.stopPropagation(); kebab.focus();
        } else if (e.key === 'ArrowLeft' && e.target === kebab && focusableRef.current) {
          e.preventDefault(); e.stopPropagation(); focusableRef.current.focus();
        }
      } : undefined}
      id={domId}
      className={styles.chip()} data-arena-part={manifest.parts.chip}
      style={{ ...box,
        background: arenaCatTint(ink),
        borderLeftColor: ink }}>
      {hasPanel ? (
        <>
          {interactive ? (
            <button type="button" ref={setFocusable} tabIndex={tabIndex}
              onClick={activate}
              aria-label={`${title}, ${dateLabel}, ${timeLabel}`}
              aria-disabled={disabled ? 'true' : undefined}

              className={styles.chipBody()} data-arena-part={manifest.parts.chipBody}>
              {body}
            </button>
          ) : (
            <span ref={setFocusable} tabIndex={tabIndex} onClick={activate}
              className={styles.chipBody()} data-arena-part={manifest.parts.chipBody}>
              {body}
            </span>
          )}
          <span ref={kebabWrapRef} className={styles.kebabWrap()} data-arena-part={manifest.parts.kebabWrap}>
            <ArenaIconButton icon="ph-bold ph-dots-three-vertical" label="Actions" size="sm"
              tabStop={false}
              onClick={() => { openedByUser.current = !panelOpen; setPanelOpen((o) => !o); }} />
            {panelOpen && (
              <span ref={panelRef} className={styles.panel()} data-arena-part={manifest.parts.panel}>
                {actions}
              </span>
            )}
          </span>
        </>
      ) : body}
    </ArenaTag>
  );
});
