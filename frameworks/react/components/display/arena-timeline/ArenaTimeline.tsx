import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTimeline.classes.generated.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaTimelineItem } from '../../../Api.generated';
import type { ArenaTimelineClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaTimelineGlyph, arenaTimelineState, arenaTimelineTone } from './TimelineGlyphs.ts';

export interface ArenaTimelineProps {
  className?: ArenaTimelineClass;

  /** Names the list: what this is the history or the progress of, such as Order 4821, never Timeline. Required, and guarded at runtime after trimming: nothing can derive it. */
  label: string;

  /** The milestones, in the order they are drawn. Arena draws each row from its fields; an empty list draws nothing. */
  items: readonly ArenaTimelineItem[];

  /** Which milestone is current, counted from zero, for a timeline still in motion. The milestones before it are complete and the ones after it upcoming. Absent, or at or past the end, every milestone is complete, which is a history. A negative or non-finite value reads as 0. */
  index?: number;
}

const timelineStyles = arenaStyles(manifest);

export function ArenaTimeline({ className, label, items, index }: ArenaTimelineProps) {
  if (!label?.trim()) throw new Error('ArenaTimeline: `label` is required, and names what the milestones belong to');
  const locale = useArenaLocale();
  if (items.length === 0) return null;
  const words = { complete: undefined, current: locale.timelineCurrent, upcoming: locale.timelineUpcoming };
  const root = timelineStyles();
  return (
    <ol role="list" aria-label={label} className={arenaClassName('ArenaTimeline', root.root(), className)} data-arena-part={manifest.parts.root} {...root.$data.root()}>
      {items.map((item, i) => {
        const state = arenaTimelineState(i, index, items.length);
        const tone = arenaTimelineTone(item.tone);
        const glyph = arenaTimelineGlyph(tone, item.icon);
        const word = words[state];
        const styles = timelineStyles({ state, tone });
        return (
          <li key={item.id ?? i} aria-current={state === 'current' ? 'step' : undefined}
            className={styles.item()} data-arena-part={manifest.parts.item} {...styles.$data.item()}>
            <span aria-hidden="true" className={styles.rail()} data-arena-part={manifest.parts.rail} {...styles.$data.rail()}>
              <span className={styles.dot()} data-arena-part={manifest.parts.dot} {...styles.$data.dot()}>
                {glyph && <i className={`${glyph} ${styles.icon()}`} data-arena-part={manifest.parts.icon} {...styles.$data.icon()} />}
              </span>
              {i < items.length - 1 && <span className={styles.connector()} data-arena-part={manifest.parts.connector} {...styles.$data.connector()} />}
            </span>
            <div className={styles.content()} data-arena-part={manifest.parts.content} {...styles.$data.content()}>
              {word && <span className={styles.name()} data-arena-part={manifest.parts.name} {...styles.$data.name()}>{word}</span>}
              <span className={styles.title()} data-arena-part={manifest.parts.title} {...styles.$data.title()}>{item.title}</span>
              {item.description && <span className={styles.description()} data-arena-part={manifest.parts.description} {...styles.$data.description()}>{item.description}</span>}
              {item.time && (item.dateTime
                ? <time dateTime={item.dateTime} className={styles.time()} data-arena-part={manifest.parts.time} {...styles.$data.time()}>{item.time}</time>
                : <span className={styles.time()} data-arena-part={manifest.parts.time} {...styles.$data.time()}>{item.time}</span>)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
