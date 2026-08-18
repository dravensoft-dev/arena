import React from 'react';
import { isArenaOwnActivation, isArenaPrimaryActivation } from '../../../AnchorActivation.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaCard.classes.generated.ts';

import type { ArenaHeadingLevel } from '../../../Api.generated';

export interface ArenaCardProps {

  /** The card's body, below the optional header. */
  children?: React.ReactNode;
  /** Header title. Absent, along with eyebrow and action, renders no header block at all. */
  title?: string;
  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h3` because a card is the bottom rung of the title ladder, under the heading a section draws and two under a page's own, which is where a card lands on a page that says nothing else. `none` draws the title with no heading at all, for a card whose title labels the surface rather than naming a region; with no title there is no heading either way. */
  headingLevel?: ArenaHeadingLevel;
  /** Mono uppercase label above the title, in the accent colour. */
  eyebrow?: string;

  /** Right-aligned in the header, beside the title. Arena draws the header row; the consumer draws what sits in it. */
  action?: React.ReactNode;
  /** Adds the warm shadow. Depth comes from the shadow and the surface scale, never a gradient. */
  floating?: boolean;
  /** Draws the border in the accent colour instead of the surface hairline. */
  accent?: boolean;

  /** Whether the whole card is one activation target, which is the ordinary shape of a list on a phone. A boolean rather than "is `click` bound?", because Arena never derives what it draws from what a consumer listens for, the same reason ArenaTableRow.interactive is one. An interactive card is a role="button" tab stop with an Enter/Space handler and the surface's own hover and focus states; a non-interactive one is inert and adds no tab stop, because a dead stop on every card of every list is worse than the gap it would close. It is a ROLE rather than a <button> element for the same reason ArenaTableRow's card shape is: a card body may hold controls of its own, and a control inside a control is reachable by nobody. */
  interactive?: boolean;
  /** Whether an interactive card is drawn but cannot be activated. It reflects through aria-disabled rather than any native attribute, and the card stays in the tab order rather than leaving it, because a disabled control nobody can reach is a control nobody knows exists. Without `interactive` there is nothing to disable and the card is inert already. */
  disabled?: boolean;

  /** Present => the card renders an <a>; absent, with `interactive`, a role="button". The same split, and the same reason, as ArenaSideNavItem.href: a control that navigates must be a link, openable in a new tab, address copyable, announced as a link, and none of that can be rebuilt on a div. A primary click with no modifier is cancelled and reported through `click`, so a router owns it; ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing. It implies interaction on its own, so `interactive` is not also required, and with `disabled` it refuses activation through aria-disabled the way an item does. The card's own content still holds whatever controls it holds; a control inside the anchor is a control inside a link, which is the price of making the whole surface the target and the reason `interactive` exists as the alternative. */
  href?: string;

  /** An interactive card was activated, by pointer or by Enter or Space. With `href` it is also how the card reports the one activation a router owns, a primary click or Enter with no modifier, and Arena has already cancelled the anchor's own navigation by the time it fires; a modified or middle click is the browser's and does not fire it at all. No payload, because the consumer wrote this element and already holds what it is about. */
  onClick?: () => void;
}

const arenaCardStyles = arenaStyles(manifest);

export function ArenaCard({
  children, title, headingLevel = 'h3', eyebrow, action, floating = false, accent = false,
  interactive = false, disabled = false, href, onClick,
}: ArenaCardProps) {
  const Heading = headingLevel === 'none' ? 'div' : headingLevel;
  const target = href !== undefined;
  const acts = interactive || target;
  const styles = arenaCardStyles({ accent, floating, interactive: acts });

  const activate = () => {
    if (acts && !disabled) onClick?.();
  };

  const own = (event: React.MouseEvent<Element> | React.KeyboardEvent<Element>) =>
    isArenaOwnActivation(event.target, event.currentTarget);

  const onPointer = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!own(event)) return;
    activate();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (!own(event)) return;
    event.preventDefault();
    activate();
  };

  const shared = {
    'aria-disabled': acts && disabled ? true as const : undefined,
    className: styles.root(),
    'data-arena-part': manifest.parts.root,
  };

  const body = (
    <>
      {(title || eyebrow || action) && (
        <div className={styles.head()} data-arena-part={manifest.parts.head}>
          <div>
            {eyebrow && <div className={styles.eyebrow()} data-arena-part={manifest.parts.eyebrow}>{eyebrow}</div>}
            {title && <Heading className={styles.title()} data-arena-part={manifest.parts.title}>{title}</Heading>}
          </div>
          {action}
        </div>
      )}
      <div className={styles.body()} data-arena-part={manifest.parts.body}>{children}</div>
    </>
  );

  if (target) {
    return (
      <a href={href} {...shared}
        onClick={(event) => {
          if (disabled) { event.preventDefault(); return; }
          if (!own(event)) return;
          if (!isArenaPrimaryActivation(event)) return;
          event.preventDefault();
          activate();
        }}>
        {body}
      </a>
    );
  }

  return (
    <div role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onPointer : undefined} onKeyDown={interactive ? onKeyDown : undefined}
      {...shared}>
      {body}
    </div>
  );
}
