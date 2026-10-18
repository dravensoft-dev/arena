import React, { useEffect, useRef, useState } from 'react';
import type { ArenaTreeExpansion, ArenaTreeNode, ArenaTreeSelection } from '../../../Api.generated';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTreeView.classes.generated.ts';
import { delayTypeahead, limitWindowInitial, limitWindowOverscan } from '../../../Tokens.generated.js';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import { arenaTypeAheadBuffer, arenaTypeAheadNext } from '../../../TypeAhead.ts';
import {
  arenaTreeCarry, arenaTreeIsBranch, arenaTreeLevel, arenaTreePosInSet, arenaTreeProblemMessage, arenaTreeSetSize,
  arenaTreeShape, arenaTreeStep, arenaTreeStop, arenaTreeToggled, arenaTreeVisible,
} from '../TreeModel.ts';
import type { ArenaTreeKey } from '../TreeModel.ts';
import {
  arenaAnchoredScroll, arenaRowEstimate, arenaRowStarts, arenaWindowPad, arenaWindowRange, arenaWindowView,
} from '../../display/arena-table/TableWindow.ts';
import {
  aimAt, newKept, watchRowBox,
  type RowWindowKept, type RowWindowLatest, type RowWindowMath, type RowWindowParts, type RowWindowReading,
  type RowWindowWatch,
} from '../../../RowWindowMeasure.ts';
import type { ArenaTreeViewClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaTreeViewProps {
  className?: ArenaTreeViewClass;

  /** Names the tree for assistive technology. Required and guarded at runtime: nothing can derive what the tree is of, and two trees on one page must not announce alike. Say what the nodes are, never "ArenaTreeView". */
  label: string;

  /** The whole tree, flat. Each node names its parent, and sibling order is array order. */
  nodes: readonly ArenaTreeNode[];

  /** Which branches are open. Controlled: ArenaTreeView draws the caret and `aria-expanded`, and the consumer holds the open set and writes it back from `onExpandedChange`. A tree with no handler does not open. Absent, every branch is closed. */
  expanded?: ArenaTreeExpansion;

  /** A branch was opened or closed by the keyboard or the pointer, carrying the whole new open set. Write it back to `expanded` in the handler. The tree draws only the set it is given, and a tree with no handler never opens. */
  onExpandedChange?: (expanded: ArenaTreeExpansion) => void;

  /** Which nodes are selected. Controlled: the consumer holds the set and writes it back from `onSelectionChange`. Absent, no item carries `aria-selected`, and the tree reports `onActivate` only, as a navigation tree does. */
  selection?: ArenaTreeSelection;

  /** The selection changed, carrying the whole new set. The event fires only when the set changes, and never when `selection` is absent. Write it back to `selection` in the handler. */
  onSelectionChange?: (selection: ArenaTreeSelection) => void;

  /** Whether more than one node can be selected. With it a press on a selected node unselects it, and the root carries `aria-multiselectable`. Without it a press replaces the selection. */
  multiple?: boolean;

  /** Whether the root scrolls inside the height its container gives it and draws only the rows near its viewport. The keyboard still reaches every visible node. Without it every visible node is drawn and the root does not scroll. */
  windowed?: boolean;

  /** A node was activated by Enter or by a press on its row, carrying its `id`. A disabled node is never activated. The caret's press opens or closes a branch and does not activate. */
  onActivate?: (id: string) => void;
}

const arenaTreeViewStyles = arenaStyles(manifest);

const TREE_KEYS = new Set<string>(['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End']);

const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const MATH: RowWindowMath = {
  estimate: arenaRowEstimate, starts: arenaRowStarts, range: arenaWindowRange, pad: arenaWindowPad,
  view: arenaWindowView, anchored: arenaAnchoredScroll, initial: limitWindowInitial,
};

const PARTS: RowWindowParts = {
  rows: `[data-arena-part="${manifest.parts.item}"]`,
  frame: `[data-arena-part="${manifest.parts.rows}"]`,
  head: null,
  headRow: null,
};

const sameReading = (a: RowWindowReading, b: RowWindowReading) => a.offset === b.offset && a.count === b.count
  && a.padTop === b.padTop && a.padBottom === b.padBottom;

export function ArenaTreeView({
  className, label, nodes, expanded, onExpandedChange, selection, onSelectionChange, multiple = false, windowed = false,
  onActivate,
}: ArenaTreeViewProps) {
  if (!label?.trim()) throw new Error('ArenaTreeView: `label` is required');
  if (nodes == null) throw new Error('ArenaTreeView: `nodes` is required');

  const { shape, problems } = arenaTreeShape(nodes);
  const open = expanded?.ids ?? [];
  const chosen = selection?.ids ?? [];
  const visible = arenaTreeVisible(shape, open);

  const [focused, setFocused] = useState<string | undefined>(undefined);
  const stop = arenaTreeStop(shape, visible, focused, chosen);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [reading, setReading] = useState<RowWindowReading | null>(null);
  const latest = useRef<RowWindowLatest>({ rows: 0, rowHeight: undefined, overscan: limitWindowOverscan, first: 0 });
  const kept = useRef<RowWindowKept>(newKept());
  const watch = useRef<RowWindowWatch | null>(null);
  const seen = useRef<readonly string[]>(visible);
  const pending = useRef<string | null>(null);
  const total = visible.length;
  const measured = windowed && reading !== null ? reading : null;
  const offset = measured ? Math.min(measured.offset, total) : 0;
  const count = !windowed ? total
    : measured ? Math.max(0, Math.min(measured.count, total - offset)) : Math.min(total, limitWindowInitial);
  Object.assign(latest.current, { rows: total, first: offset });
  const stopAt = stop === undefined ? -1 : visible.indexOf(stop);
  const standIn = count === 0 ? -1 : Math.min(Math.max(stopAt, offset), offset + count - 1);

  const items = useRef(new Map<string, HTMLElement>());
  const buffer = useRef('');
  const clock = useRef<ReturnType<typeof setTimeout> | null>(null);

  const warnings = problems.map(arenaTreeProblemMessage);
  useEffect(() => { warnings.forEach(arenaWarnOnce); }, [warnings.join('\n')]);

  useEffect(() => () => {
    if (clock.current !== null) clearTimeout(clock.current);
    watch.current?.stop();
    watch.current = null;
  }, []);

  const held = useRef(false);
  const before = rootRef.current;
  held.current = before !== null && before.contains(before.ownerDocument.activeElement);

  const attach = (root: HTMLDivElement | null) => {
    rootRef.current = root;
    if (!root) return;
    const was = seen.current;
    seen.current = visible;
    if (!windowed || !watch.current || sameIds(was, visible)) return;
    const top = arenaTreeCarry(kept.current, root.scrollTop, was, visible, MATH);
    if (top !== null) root.scrollTop = top;
    watch.current.run();
  };

  useEffect(() => {
    const root = rootRef.current;
    const box = windowed && root && typeof ResizeObserver !== 'undefined' ? root : null;
    if (!box) {
      if (watch.current) {
        watch.current.stop();
        watch.current = null;
        kept.current = newKept();
      }
      if (reading !== null) setReading(null);
      return;
    }
    if (watch.current) watch.current.run();
    else {
      watch.current = watchRowBox(box, PARTS, MATH, latest.current, kept.current,
        (next) => setReading((prev) => (prev && sameReading(prev, next) ? prev : next)));
    }
  });

  useEffect(() => {
    const root = rootRef.current;
    const awaited = pending.current !== null && pending.current === stop;
    if (!root || stop === undefined || !(held.current || awaited)) return;
    const doc = root.ownerDocument;
    const active = doc.activeElement;
    const kept = active === null || active === doc.body || !active.isConnected || active.contains(root) || root.contains(active);
    if (!kept) { pending.current = null; return; }
    const target = items.current.get(stop);
    if (!target) {
      if (stop !== focused) moveTo(stop);
      return;
    }
    pending.current = null;
    if (target !== active) target.focus();
  });

  const moveTo = (id: string) => {
    setFocused(id);
    const index = visible.indexOf(id);
    const root = rootRef.current;
    if (!windowed || !root || (index >= offset && index < offset + count)) { pending.current = null; return; }
    pending.current = id;
    aimAt(kept.current, root, { row: index, near: true });
  };

  const toggle = (id: string, next: boolean) => {
    onExpandedChange?.({ ids: arenaTreeToggled(open, id, next) });
  };

  const select = (id: string) => {
    if (!selection) return;
    const next = multiple
      ? (chosen.includes(id) ? chosen.filter((kept) => kept !== id) : [...chosen, id])
      : [id];
    if (!sameIds(next, chosen)) onSelectionChange?.({ ids: next });
  };

  const press = (id: string) => {
    if (shape.byId.get(id)?.disabled) return;
    select(id);
    onActivate?.(id);
  };

  const typeAhead = (at: string, key: string) => {
    buffer.current = arenaTypeAheadBuffer(buffer.current, key);
    if (clock.current !== null) clearTimeout(clock.current);
    clock.current = setTimeout(() => { buffer.current = ''; clock.current = null; }, delayTypeahead);
    const labels = visible.map((id) => shape.byId.get(id)?.label ?? '');
    const found = arenaTypeAheadNext(labels, visible.indexOf(at), buffer.current);
    const target = visible[found];
    if (target !== undefined) moveTo(target);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || stop === undefined) return;
    if (TREE_KEYS.has(e.key)) {
      e.preventDefault();
      const move = arenaTreeStep(shape, visible, open, stop, e.key as ArenaTreeKey);
      if (move === null) return;
      if ('focus' in move) moveTo(move.focus);
      else if ('open' in move) toggle(move.open, true);
      else toggle(move.close, false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      press(stop);
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (!shape.byId.get(stop)?.disabled) select(stop);
      return;
    }
    if (Array.from(e.key).length === 1) {
      e.preventDefault();
      typeAhead(stop, e.key);
    }
  };

  const styles = arenaTreeViewStyles({ windowed });

  const list = (windowed ? visible.slice(offset, offset + count) : visible).map((id, index) => {
    const node = shape.byId.get(id);
    if (!node) return null;
    const branch = arenaTreeIsBranch(shape, id);
    const isOpen = open.includes(id);
    const disabled = node.disabled === true;
    const row = arenaTreeViewStyles({ selected: chosen.includes(id), disabled });
    const level = arenaTreeLevel(shape, id);
    return (
      <div key={id} role="treeitem"
        ref={(el) => { if (el) items.current.set(id, el); else items.current.delete(id); }}
        tabIndex={offset + index === standIn ? 0 : -1}
        aria-level={level} aria-setsize={arenaTreeSetSize(shape, id)} aria-posinset={arenaTreePosInSet(shape, id)}
        aria-expanded={branch ? isOpen : undefined}
        aria-selected={selection ? chosen.includes(id) : undefined}
        aria-disabled={disabled ? true : undefined}
        onFocus={() => { pending.current = null; setFocused(id); }}
        onClick={() => press(id)}
        className={row.item()} data-arena-part={manifest.parts.item} {...row.$data.item()}
        style={{ '--arena-tree-depth': level - 1 } as React.CSSProperties}>
        <span aria-hidden="true"
          onClick={branch ? (e) => { e.stopPropagation(); toggle(id, !isOpen); } : undefined}
          className={styles.caret()} data-arena-part={manifest.parts.caret} {...styles.$data.caret()}>
          {branch ? <i className={isOpen ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'} /> : null}
        </span>
        {node.icon
          ? <i aria-hidden="true" className={`${node.icon} ${styles.icon()}`} data-arena-part={manifest.parts.icon} {...styles.$data.icon()} />
          : null}
        <span className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{node.label}</span>
      </div>
    );
  });

  return (
    <div ref={attach} role="tree" aria-label={label}
      aria-multiselectable={multiple && selection ? true : undefined}
      onKeyDown={onKeyDown}
      style={windowed ? { overflowAnchor: 'none' } : undefined}
      className={arenaClassName('ArenaTreeView', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      {windowed
        ? (
          <div style={{ paddingBlockStart: measured ? measured.padTop : 0, paddingBlockEnd: measured ? measured.padBottom : 0 }}>
            <div className={styles.rows()} data-arena-part={manifest.parts.rows} {...styles.$data.rows()}>{list}</div>
          </div>
        )
        : list}
    </div>
  );
}
