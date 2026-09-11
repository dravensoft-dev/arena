import React, { useEffect, useId, useRef, useState } from 'react';
import { delayOpen, delayClose } from '../../../Tokens.generated.js';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTooltip.classes.generated.ts';
import { arenaAccessibleText, arenaTooltipRedundant } from './TooltipName.ts';

export interface ArenaTooltipProps {

  /** The bubble's text. Arena draws the bubble; the consumer names it. */
  label: string;

  /** The element the tooltip describes and attaches to. */
  children: React.ReactNode;
}


const arenaTooltipStyles = arenaStyles(manifest);

export function ArenaTooltip({ children, label }: ArenaTooltipProps) {
  if (!label) throw new Error('ArenaTooltip: `label` is required');
  if (!React.isValidElement(children) || children.type === React.Fragment) {
    throw new Error(
      'ArenaTooltip: `children` must be a single element that forwards props to its own DOM node. '
      + 'A fragment or a bare string takes aria-describedby nowhere, so the bubble names nothing.',
    );
  }
  const [show, setShow] = useState(false);
  const [quiet, setQuiet] = useState(false);

  const bubbleId = `tooltip-${useId().replace(/:/g, '')}`;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => { if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; } };
  const wrapRef = useRef<HTMLElement | null>(null);
  const reveal = (next: boolean) => {
    const trigger = wrapRef.current?.firstElementChild;
    if (next) setQuiet(trigger ? arenaTooltipRedundant(arenaAccessibleText(trigger), label) : false);
    setShow(next);
  };
  const schedule = (next: boolean, ms: number) => { clear(); timer.current = setTimeout(() => reveal(next), ms); };

  const now = (next: boolean) => { clear(); reveal(next); };
  useEffect(() => () => clear(), []);

  useEffect(() => {
    if (!show || typeof document === 'undefined') return undefined;
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') now(false); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [show]);

  const own = children.props['aria-describedby'];
  const describedBy = show ? [own, bubbleId].filter(Boolean).join(' ') : own;
  const described = React.cloneElement(children, { 'aria-describedby': describedBy });

  useEffect(() => {
    const el = wrapRef.current && wrapRef.current.firstElementChild;
    if (!el) return;
    if (describedBy) el.setAttribute('aria-describedby', describedBy);
    else el.removeAttribute('aria-describedby');
  }, [describedBy]);
  const styles = arenaTooltipStyles();
  return (
    <span ref={wrapRef} className={styles.root()} data-arena-part={manifest.parts.root}
      onMouseEnter={() => schedule(true, delayOpen)}
      onMouseLeave={() => schedule(false, delayClose)}
      onFocus={() => now(true)}
      onBlur={() => now(false)}>
      {described}
      {show && (
        <span role="tooltip" id={bubbleId} className={styles.bubble()} data-arena-part={manifest.parts.bubble}>
          {quiet ? <span aria-hidden="true">{label}</span> : label}
        </span>
      )}
    </span>
  );
}
