import React, { useState, useRef, useEffect } from 'react';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaMenu.classes.generated.ts';

import type { ArenaMenuItem, ArenaMenuAlign } from '../../../Api.generated';

export type { ArenaMenuItem };

export interface ArenaMenuProps {

  /** The element that opens the menu. The consumer draws it -- an ArenaIconButton with ph-dots-three-vertical, a secondary ArenaButton -- so it is a slot, and it carries its own accessible name. */
  trigger: React.ReactNode;

  /** The entries, in order: activatable rows, dividers and group headers. */
  items: readonly ArenaMenuItem[];

  /** Which edge of the trigger the panel lines up with. */
  align?: ArenaMenuAlign;

  /** An entry was activated; carries the whole item. A disabled entry reports nothing, and a divider or a header cannot be activated at all. */
  onSelect?: (item: ArenaMenuItem) => void;
}


const TRIGGER_SELECTOR =
  'button:not([tabindex="-1"]), a[href]:not([tabindex="-1"]), [role="button"]:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

const arenaMenuStyles = arenaStyles(manifest);

export function ArenaMenu({ trigger, items, align = 'start', onSelect }: ArenaMenuProps) {

  if (items == null) throw new Error('ArenaMenu: `items` is required');
  if (!React.isValidElement(trigger) || trigger.type === React.Fragment) {
    throw new Error(
      'ArenaMenu: `trigger` must be a single element that forwards props to its focusable control. '
      + 'A fragment or a bare string takes aria-haspopup and aria-expanded nowhere.',
    );
  }
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const triggerEl = (): HTMLElement | null =>
    (ref.current?.firstElementChild instanceof HTMLElement ? ref.current.firstElementChild : null);
  const close = (restoreFocus: boolean) => {
    setOpen(false);
    const el = triggerEl();
    if (restoreFocus && el) el.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(true); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const first = panelRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    if (first) first.focus();
  }, [open]);

  const run = (it: ArenaMenuItem) => { if (it.disabled) return; close(true); onSelect && onSelect(it); };

  useEffect(() => {
    const el = triggerEl();
    if (!el) return;
    if (!el.matches(TRIGGER_SELECTOR) && !el.querySelector(TRIGGER_SELECTOR)) {
      arenaWarnOnce(
        `ArenaMenu's trigger renders a <${el.tagName.toLowerCase()}>, which takes no focus and `
        + 'answers no key. The menu opens on a pointer and on nothing else, and a reader on a '
        + 'keyboard cannot reach it. Pass a control: an ArenaIconButton or an ArenaButton, or your '
        + 'own element carrying a button role and a tabindex.',
      );
    }
    el.setAttribute('aria-haspopup', 'menu');
    el.setAttribute('aria-expanded', String(open));
  }, [open]);

  const decoratedTrigger = React.cloneElement(trigger, {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    onClick: (e: React.MouseEvent) => {
      const own = (trigger.props as { onClick?: (event: React.MouseEvent) => void }).onClick;
      if (own) own(e);
      setOpen((v) => !v);
    },
  });

  const styles = arenaMenuStyles();

  return (
    <div ref={ref} className={styles.root()} data-arena-part={manifest.parts.root}>
      {decoratedTrigger}
      {open && (
        <div role="menu" ref={panelRef}
          className={align === 'end' ? `${styles.panel()} ${styles.panelEnd()}` : styles.panel()}
          data-arena-part={manifest.parts.panel}>
          {items.map((it, i) => {
            if (it.divider) return <div key={i} className={styles.divider()} data-arena-part={manifest.parts.divider} />;
            if (it.header) return <div key={i} className={styles.header()} data-arena-part={manifest.parts.header}>{it.header}</div>;
            return (
              <MenuRow key={i} item={it} onRun={() => run(it)} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function MenuRow({ item, onRun }: { item: ArenaMenuItem; onRun: () => void }) {
  const styles = arenaMenuStyles();
  const state = item.disabled
    ? styles.itemDisabled()
    : item.destructive ? styles.itemDestructive() : styles.itemDefault();
  return (
    <button role="menuitem" onClick={onRun} disabled={item.disabled}
      className={`${styles.item()} ${state}`} data-arena-part={manifest.parts.item}>
      {item.icon && <i className={`${item.icon} ${styles.icon()}`} data-arena-part={manifest.parts.icon} aria-hidden="true" />}
      <span className={styles.label()} data-arena-part={manifest.parts.label}>{item.label}</span>
      {item.shortcut && <span className={styles.shortcut()} data-arena-part={manifest.parts.shortcut}>{item.shortcut}</span>}
    </button>
  );
}
