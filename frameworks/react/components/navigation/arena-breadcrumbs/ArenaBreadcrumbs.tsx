import React from 'react';

import { isArenaPrimaryActivation } from '../../../AnchorActivation.ts';
import { arenaBreadcrumbList } from '../../../StructuredData.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaBreadcrumbs.classes.generated.ts';
import type { ArenaCrumb } from '../../../Api.generated';

export type { ArenaCrumb };
export interface ArenaBreadcrumbsProps {

  /** Names this navigation landmark. Required, and guarded at runtime: nothing can derive it, and the constant "Breadcrumb" it used to hardcode made two trails on one page indistinguishable as landmarks while satisfying the requirement mechanically. Say which hierarchy this is a trail through: "Project navigation", never "Breadcrumb". */
  ariaLabel: string;

  /** The trail, root first. The last entry is the current location and is never a link. */
  items: readonly ArenaCrumb[];

  /** Drawn between crumbs, never before the first. Arena draws it, in its own aria-hidden span. */
  separator?: string;

  /** The scheme and host each crumb's href is resolved against in the structured data the component emits, as in "https://example.com". Absent, the relative href is published as it stands, which is valid and less well supported. It is a member rather than something read off the document because location.origin does not exist on a server, and a value that differs between the server render and the client one is the hydration hazard ArenaCalendar.timeZone already documents; a value the consumer passes cannot differ. One line per application, not per screen. It changes nothing a person sees. */
  origin?: string;

  /** A non-current crumb was activated, carrying that crumb alone. The native MouseEvent is not forwarded, because a platform's own event type never travels in a payload; what the listener needs from it, the chance to route instead of navigating, arrives as behaviour rather than as data. Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate. It fires for a primary click with no modifier and for Enter; ctrl-click, middle-click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a working trail of real links. */
  onNavigate?: (crumb: ArenaCrumb) => void;
}


const breadcrumbStyles = arenaStyles(manifest);

export function ArenaBreadcrumbs({ items, ariaLabel, separator = '/', origin, onNavigate }: ArenaBreadcrumbsProps) {
  if (!ariaLabel?.trim()) throw new Error('ArenaBreadcrumbs: `ariaLabel` is required');
  if (!items) throw new Error('ArenaBreadcrumbs: `items` is required');
  const styles = breadcrumbStyles();
  const linked = breadcrumbStyles({ linked: true });
  const unlinked = breadcrumbStyles({ linked: false });
  return (
    <nav aria-label={ariaLabel} className={styles.root()} data-arena-part={manifest.parts.root}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {last ? (
              <span aria-current="page" className={styles.current()} data-arena-part={manifest.parts.current}>{it.label}</span>
            ) : it.href ? (
              <a href={it.href}
                onClick={(e) => {
                  if (!isArenaPrimaryActivation(e)) return;
                  e.preventDefault();
                  onNavigate?.(it);
                }}
                className={linked.crumb()} data-arena-part={manifest.parts.crumb}>
                {it.label}
              </a>
            ) : (
              <span className={unlinked.crumb()} data-arena-part={manifest.parts.crumb}>{it.label}</span>
            )}
            {!last && <span aria-hidden="true" className={styles.separator()} data-arena-part={manifest.parts.separator}>{separator}</span>}
          </React.Fragment>
        );
      })}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: arenaBreadcrumbList(items, origin) }} />
    </nav>
  );
}
