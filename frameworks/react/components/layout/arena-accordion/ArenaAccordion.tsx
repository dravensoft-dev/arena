import React, { useId, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaAccordion.classes.generated.ts';
import type { ArenaHeadingLevel, ArenaValueSet } from '../../../Api.generated';
import type { ArenaAccordionClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import type { ArenaAccordionItemInjected } from '../arena-accordion-item/ArenaAccordionItem.tsx';

export interface ArenaAccordionProps {
  className?: ArenaAccordionClass;

  /** The items. Which ones are open, the ids wiring each header to its panel and how a press is reported are the accordion's to settle. None of it is a member of an item. EVERY panel mounts: a closed one is hidden and keeps its content, so a panel's side effects run at first render. */
  children?: React.ReactNode;

  /** Whether several panels may be open at once. False reads `value`, `defaultValue` and `onValueChange`; true reads `values`, `defaultValues` and `onValuesChange`. The pair of the other mode is ignored, and a set one is warned about once. */
  multiple?: boolean;

  /** Without `multiple`, whether the open panel may be closed again. False keeps it open once one is open, and its header writes aria-disabled. Nothing opens by itself: seed `defaultValue` to start with one open. Ignored with `multiple`, where every press toggles. */
  collapsible?: boolean;

  /** The rung each header's heading takes. The rung defaults to `h3`, the card's rung under a section's `h2`. `none` is refused at runtime, because each label names its panel and a header is a heading. */
  headingLevel?: ArenaHeadingLevel;

  /** Without `multiple`, the open item's value, controlled. The empty string, or a value no item has, opens nothing. Omit it and pass `defaultValue` to let the accordion govern itself. */
  value?: string;

  /** Without `multiple`, the item open at first render when uncontrolled. Absent, every panel starts closed. */
  defaultValue?: string;

  /** Without `multiple`, a header was pressed; carries the value of the item now open, or the empty string when the open one closed. Fired on a press only, never when a controlled `value` merely changes. */
  onValueChange?: (value: string) => void;

  /** With `multiple`, the open items' values, controlled. A value no item has opens nothing. Omit it and pass `defaultValues` to let the accordion govern itself. */
  values?: readonly string[];

  /** With `multiple`, the items open at first render when uncontrolled. Absent, every panel starts closed. */
  defaultValues?: readonly string[];

  /** With `multiple`, a header was pressed; carries the whole set of open values that results, never a delta. Fired on a press only, never when controlled `values` merely change. */
  onValuesChange?: (set: ArenaValueSet) => void;
}

const arenaAccordionStyles = arenaStyles(manifest);

const NEXT: Record<string, (at: number, count: number) => number> = {
  ArrowDown: (at, count) => (at + 1) % count,
  ArrowUp: (at, count) => (at - 1 + count) % count,
  Home: () => 0,
  End: (_, count) => count - 1,
};

export function ArenaAccordion({
  className, children, multiple = false, collapsible = true, headingLevel = 'h3',
  value, defaultValue, onValueChange, values, defaultValues, onValuesChange,
}: ArenaAccordionProps) {
  if (headingLevel === 'none') {
    throw new Error('ArenaAccordion: `headingLevel` cannot be none, because each header is a heading whose label names its panel');
  }
  if (multiple && (value !== undefined || defaultValue !== undefined)) {
    arenaWarnOnce('ArenaAccordion: `value` and `defaultValue` are read only without `multiple`, so this accordion ignores them; pass `values` instead');
  }
  if (!multiple && (values !== undefined || defaultValues !== undefined)) {
    arenaWarnOnce('ArenaAccordion: `values` and `defaultValues` are read only with `multiple`, so this accordion ignores them; pass `value` instead');
  }
  const base = `accordion-${useId().replace(/:/g, '')}`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [single, setSingle] = useState(defaultValue ?? '');
  const [many, setMany] = useState<readonly string[]>(defaultValues ?? []);
  const open: readonly string[] = multiple ? (values ?? many) : [value ?? single];

  const items = React.Children.toArray(children)
    .filter((c): c is React.ReactElement<Partial<ArenaAccordionItemInjected> & { value?: string }> => React.isValidElement(c));

  const toggle = (pressed: string) => {
    if (multiple) {
      const next = open.includes(pressed) ? open.filter((v) => v !== pressed) : [...open, pressed];
      setMany(next);
      onValuesChange?.({ values: [...next] });
      return;
    }
    const active = value ?? single;
    if (pressed === active && !collapsible) return;
    const next = pressed === active ? '' : pressed;
    setSingle(next);
    onValueChange?.(next);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const move = NEXT[event.key];
    const root = rootRef.current;
    if (!move || !root) return;
    const own = [...root.querySelectorAll<HTMLElement>(`[data-arena-part="${manifest.parts.trigger}"]`)]
      .filter((trigger) => trigger.closest(`[data-arena-part="${manifest.parts.root}"]`) === root);
    const at = own.indexOf(event.target as HTMLElement);
    if (at === -1) return;
    event.preventDefault();
    own[move(at, own.length)]?.focus();
  };

  const styles = arenaAccordionStyles();
  return (
    <div ref={rootRef} onKeyDown={onKeyDown}
      className={arenaClassName('ArenaAccordion', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()} data-arena-boundary="">
      {items.map((child, i) => {
        const itemValue = child.props.value ?? '';
        const isOpen = itemValue !== '' && open.includes(itemValue);
        return React.cloneElement(child, {
          open: isOpen,
          locked: isOpen && !multiple && !collapsible,
          headingLevel,
          triggerId: `${base}-trigger-${i}`,
          panelId: `${base}-panel-${i}`,
          onToggle: toggle,
        });
      })}
    </div>
  );
}
