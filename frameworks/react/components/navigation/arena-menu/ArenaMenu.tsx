import React, { useState, useRef, useEffect, useContext, useId } from 'react';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaMenu.classes.generated.ts';
import { delayTypeahead, sp1 } from '../../../Tokens.generated.js';
import { ARENA_PANEL_POPOVER, useArenaAnchoredPanel } from '../../../UseAnchoredPanel.ts';
import { ArenaMenuAnchor } from './MenuAnchor.ts';
import { arenaTypeAheadBuffer, arenaTypeAheadNext } from '../../../TypeAhead.ts';

import type { ArenaMenuItem, ArenaMenuAlign } from '../../../Api.generated';
import type { ArenaMenuClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon.tsx';

export type { ArenaMenuItem };

export interface ArenaMenuProps {
  className?: ArenaMenuClass;


  /** The element that opens the menu. The consumer draws it -- an ArenaIconButton with ph-dots-three-vertical, a secondary ArenaButton -- so it is a slot, and it carries its own accessible name. */
  trigger: React.ReactNode;

  /** The entries, in order: activatable rows, dividers and group headers. */
  items: readonly ArenaMenuItem[];

  /** Which edge of the trigger the panel lines up with. */
  align?: ArenaMenuAlign;

  /** An entry was activated; carries the whole item. A disabled entry reports nothing, and a divider or a header cannot be activated at all. */
  onSelect?: (item: ArenaMenuItem) => void;
}


export type ArenaMenuBlock =
  | { kind: 'divider'; index: number }
  | { kind: 'rows'; header: number | null; rows: number[] };

/** Splits the entries into what the panel draws: rows before the first header form a block with no header, and a divider or a header ends a block. */
export function arenaMenuBlocks(items: readonly ArenaMenuItem[]): ArenaMenuBlock[] {
  const blocks: ArenaMenuBlock[] = [];
  let current: { kind: 'rows'; header: number | null; rows: number[] } | null = null;
  items.forEach((it, index) => {
    if (it.divider) {
      current = null;
      blocks.push({ kind: 'divider', index });
    } else if (it.header) {
      current = { kind: 'rows', header: index, rows: [] };
      blocks.push(current);
    } else {
      if (current === null) {
        current = { kind: 'rows', header: null, rows: [] };
        blocks.push(current);
      }
      current.rows.push(index);
    }
  });
  return blocks.filter((block) => block.kind === 'divider' || block.header !== null || block.rows.length > 0);
}

/** The row a roving key moves to: null for a key the menu does not answer, -1 when no row is enabled. */
function arenaMenuStep(key: string, at: number, total: number): number | null {
  if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return null;
  if (total === 0) return -1;
  if (key === 'ArrowDown') return (at + 1) % total;
  if (key === 'ArrowUp') return at <= 0 ? total - 1 : at - 1;
  return key === 'Home' ? 0 : total - 1;
}

const TRIGGER_SELECTOR =
  'button:not([tabindex="-1"]), a[href]:not([tabindex="-1"]), [role="button"]:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

const arenaMenuStyles = arenaStyles(manifest);

export function ArenaMenu({ className, trigger, items, align = 'start', onSelect }: ArenaMenuProps) {

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
  const composed = useContext(ArenaMenuAnchor);
  const baseId = useId();
  const buffer = useRef('');
  const clock = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (clock.current !== null) clearTimeout(clock.current); }, []);

  const triggerEl = (): HTMLElement | null =>
    (ref.current?.firstElementChild instanceof HTMLElement ? ref.current.firstElementChild : null);
  const close = (restoreFocus: boolean) => {
    setOpen(false);
    const el = triggerEl();
    if (restoreFocus && el) el.focus();
  };

  const present = useArenaAnchoredPanel({
    open, align, anchor: composed ?? ref, panel: panelRef, trigger: triggerEl, offset: sp1 * 1.5,
    focusOnOpen: (panel) => panel.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])'),
    restoreFocus: true, tabOut: true, anchorPressDismisses: composed !== null,
    onDismiss: () => setOpen(false),
  });

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const rows = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
    const at = rows.findIndex((row) => row === document.activeElement);
    if (Array.from(e.key).length === 1 && (e.key !== ' ' || buffer.current !== '')) {
      buffer.current = arenaTypeAheadBuffer(buffer.current, e.key);
      if (clock.current !== null) clearTimeout(clock.current);
      clock.current = setTimeout(() => { buffer.current = ''; clock.current = null; }, delayTypeahead);
      const labels = rows.map((row) => row.querySelector('[data-arena-part="menu.label"]')?.textContent ?? '');
      const found = arenaTypeAheadNext(labels, at, buffer.current);
      if (found >= 0 || e.key === ' ') e.preventDefault();
      if (found >= 0) rows[found]!.focus();
      return;
    }
    const target = arenaMenuStep(e.key, at, rows.length);
    if (target === null) return;
    e.preventDefault();
    if (target >= 0) rows[target]!.focus();
  };

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
    el.setAttribute('aria-expanded', String(present));
  }, [present]);

  useEffect(() => {
    const el = triggerEl();
    if (!el) return;
    const toggle = () => setOpen((v) => !v);
    el.addEventListener('click', toggle);
    return () => el.removeEventListener('click', toggle);
  });

  const decoratedTrigger = React.cloneElement(trigger, {
    'aria-haspopup': 'menu',
    'aria-expanded': present,
  });

  const styles = arenaMenuStyles();

  return (
    <div ref={ref} className={arenaClassName('ArenaMenu', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      {decoratedTrigger}
      {present && (
        <div role="menu" ref={panelRef} onKeyDown={onKeyDown}
          className={styles.panel()}
          data-arena-part={manifest.parts.panel} {...styles.$data.panel()} data-arena-surface="floating" {...ARENA_PANEL_POPOVER}>
          {arenaMenuBlocks(items).map((block) => {
            if (block.kind === 'divider') return <div key={block.index} role="separator" className={styles.divider()} data-arena-part={manifest.parts.divider} {...styles.$data.divider()} />;
            const rows = block.rows.map((i) => <MenuRow key={i} item={items[i]!} onRun={() => run(items[i]!)} />);
            if (block.header === null) return <React.Fragment key={`rows-${block.rows[0]}`}>{rows}</React.Fragment>;
            const headerId = `${baseId}-h${block.header}`;
            return (
              <div key={`h${block.header}`} role="group" aria-labelledby={headerId} className={styles.group()} data-arena-part={manifest.parts.group} {...styles.$data.group()}>
                <div id={headerId} className={styles.header()} data-arena-part={manifest.parts.header} {...styles.$data.header()}>{items[block.header]!.header}</div>
                {rows}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MenuRow({ item, onRun }: { item: ArenaMenuItem; onRun: () => void }) {
  const styles = arenaMenuStyles({ disabled: !!item.disabled, destructive: !!item.destructive });
  return (
    <button type="button" role="menuitem" tabIndex={-1} onClick={onRun} disabled={item.disabled}
      className={styles.item()} data-arena-part={manifest.parts.item} {...styles.$data.item()}>
      {item.icon && <span className={styles.icon()} data-arena-part={manifest.parts.icon} {...styles.$data.icon()} aria-hidden="true"><ArenaIcon icon={item.icon} /></span>}
      <span className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{item.label}</span>
      {item.shortcut && <kbd className={styles.shortcut()} data-arena-part={manifest.parts.shortcut} {...styles.$data.shortcut()}>{item.shortcut}</kbd>}
    </button>
  );
}
