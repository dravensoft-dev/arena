import React, { useId, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTabs.classes.generated.ts';

export interface ArenaTabsProps {

  /** The tabs. Which one is selected, which is the strip's tab stop, the ids wiring each to its panel and how the choice is reported are the strip's to settle, and none of it is a member here. EVERY tab's content mounts: one panel per tab is rendered and the inactive ones are hidden, because each tab's aria-controls must reference a tabpanel that exists. So a panel's side effects run immediately rather than on first selection. */
  children?: React.ReactNode;

  /** The selected tab's value. Omit and pass `defaultValue` to let it govern itself. */
  value?: string;

  /** The initially selected value when uncontrolled. Defaults to the first tab. */
  defaultValue?: string;

  /** A different tab was chosen; carries its value. */
  onChange?: (value: string) => void;
}


interface ArenaTabInjected {
  /** The selected tab's value. Omit and pass `defaultValue` to let it govern itself. */
  value?: string;
  /** The tabs. Which one is selected, which is the strip's tab stop, the ids wiring each to its panel and how the choice is reported are the strip's to settle, and none of it is a member here. EVERY tab's content mounts: one panel per tab is rendered and the inactive ones are hidden, because each tab's aria-controls must reference a tabpanel that exists. So a panel's side effects run immediately rather than on first selection. */
  children?: React.ReactNode;
  selected: boolean;
  tabStop: boolean;
  tabId: string;
  panelId: string;
  onSelect: (value: string) => void;
}

const arenaTabsStyles = arenaStyles(manifest);

export function ArenaTabs({ children, value, defaultValue, onChange }: ArenaTabsProps) {

  const base = `tabs-${useId().replace(/:/g, '')}`;

  const items = React.Children.toArray(children)
    .filter((c): c is React.ReactElement<Partial<ArenaTabInjected>> => React.isValidElement(c));
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.props.value);
  const active = value ?? internal;

  const at = items.findIndex((c) => c.props.value === active);
  const stop = at === -1 ? 0 : at;
  const listRef = useRef<HTMLDivElement | null>(null);
  const select = (v: string) => { setInternal(v); onChange && onChange(v); };

  const tabId = (i: number) => `${base}-tab-${i}`;
  const panelId = (i: number) => `${base}-panel-${i}`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    if (items.length === 0) return;
    e.preventDefault();
    const next = (stop + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    const target = items[next];
    if (target?.props.value !== undefined) select(target.props.value);
    const buttons = listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [];
    buttons[next]?.focus();
  };

  return (
    <>
      <div role="tablist" ref={listRef} onKeyDown={onKeyDown} className={arenaTabsStyles().root()} data-arena-part={manifest.parts.root}>
        {items.map((child, i) => React.cloneElement(child, {
          selected: i === at,

          tabStop: i === stop,
          tabId: tabId(i),
          panelId: panelId(i),
          onSelect: select,
        }))}
      </div>
      {

}
      {items.map((child, i) => (

        <div key={child.key} role="tabpanel" tabIndex={i === at ? 0 : -1}
          id={panelId(i)} aria-labelledby={tabId(i)} hidden={i !== at}
          className={arenaTabsStyles({ selected: i === at }).panel()} data-arena-part={manifest.parts.panel}>
          {child.props.children}
        </div>
      ))}
    </>
  );
}
