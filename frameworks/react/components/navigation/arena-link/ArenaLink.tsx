import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import { isArenaPrimaryActivation } from '../../../AnchorActivation.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import manifest from './ArenaLink.classes.generated.ts';
import type { ArenaLinkClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaLinkRel, arenaLinkRoutes, arenaLinkTarget } from './LinkRules.ts';

export interface ArenaLinkProps {
  className?: ArenaLinkClass;

  /** The link text. Required, and guarded at runtime: a link with no text has no name, so an empty one, or one holding only spaces, throws. */
  children?: React.ReactNode;

  /** Where the link goes. Required, and guarded at runtime after trimming: an <a> without an address is not a link and takes no focus. */
  href: string;

  /** Opens the address in a new tab. Arena writes target="_blank", adds noopener and noreferrer to rel, and says the locale's linkExternal word after the text without drawing it. It is the one route to a new tab, and nothing is cancelled: a router cannot own a tab it did not open, so navigate does not fire. */
  external?: boolean;

  /** Saves the address instead of navigating to it, under the name the browser chooses. Nothing is cancelled and navigate does not fire, because a router cannot own a download. */
  download?: boolean;

  /** Link types the consumer adds to rel, such as nofollow or ugc. Arena merges them with its own: it adds noopener whenever the link opens another browsing context, through external or a target that names one, and drops an opener token, so no list written here hands the new page this one. */
  rel?: readonly string[];

  /** A named browsing context the link opens in, such as a help window reused across links, or a keyword such as _top. _blank is not taken here: a new tab is external, so a _blank target is ignored and warned once. A target it writes other than _self cancels nothing and fires no navigate. The navigation happens in a context a router does not own. */
  target?: string;

  /** The link was activated by the one activation a router owns, a primary click with no modifier, or Enter on the focused link, and Arena has already cancelled the anchor's own navigation by the time it fires. A modified click, a middle click and a context menu are the browser's and fire nothing, and so does a link that is external, a download or targeted elsewhere. No payload, because the consumer wrote this element and already holds what it is about. */
  onNavigate?: () => void;
}

const arenaLinkStyles = arenaStyles(manifest);

const hasText = (children: React.ReactNode) => React.Children.toArray(children)
  .some((one) => typeof one !== 'string' || one.trim() !== '');

export function ArenaLink({ className, children, href, external = false, download = false, rel, target, onNavigate }: ArenaLinkProps) {
  if (!href?.trim()) throw new Error('ArenaLink: `href` is required, and is where the link goes: an anchor with no address is not a link');
  if (!hasText(children)) throw new Error('ArenaLink: `content` is required, and is the link text: a link with no text has no name');
  const locale = useArenaLocale();
  const styles = arenaLinkStyles();
  const routed = arenaLinkRoutes(external, download, target);
  return (
    <a href={href} target={arenaLinkTarget(external, target)} rel={arenaLinkRel(rel, external, target)} download={download ? '' : undefined}
      onClick={routed ? (event) => {
        if (!isArenaPrimaryActivation(event)) return;
        event.preventDefault();
        onNavigate?.();
      } : undefined}
      className={arenaClassName('ArenaLink', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()} data-arena-boundary="">
      {children}
      {external && <span className={styles.external()} data-arena-part={manifest.parts.external} {...styles.$data.external()}>{` ${locale.linkExternal}`}</span>}
    </a>
  );
}
