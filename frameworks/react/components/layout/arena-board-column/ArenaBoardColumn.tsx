import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import { arenaCatColor } from '../../../DataVisuals.ts';
import manifest from '../arena-board/ArenaBoard.classes.generated.ts';

import type { ArenaCatSlot, ArenaHeadingLevel } from '../../../Api.generated';

export interface ArenaBoardColumnProps {

  /** What this column is: a status, a stage, a person, a day. It is the head's text and the column's accessible name at once. Required and guarded at runtime rather than defaulted, because a column of a board is only ever read by what it groups, and an unnamed one is a pile. */
  title: string;

  /** Which rung of the document outline the head's text takes. Only the element changes: its class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h3`, the card rung of the title ladder, because a board sits inside the region a section names and a column sits inside the board. The column's accessible name is separate and is unaffected, since it is the group's own and is carried whatever the head is drawn as. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. */
  headingLevel?: ArenaHeadingLevel;

  /** How many things are in the column, drawn beside the title in the numeric register. It is passed rather than counted, because Arena never derives what it draws from what a consumer projected: the column holds the consumer's own elements, one of which may be a placeholder and none of which Arena can read. */
  count?: number;

  /** One line under the head: the total the column adds up to, an estimate, a limit. A string rather than a number because the unit travels with it, and a column reading "19 pts" is one value and not two. */
  summary?: string;

  /** An identity colour for the column, from the same categorical ramp ArenaTag and the charts read, so a status keeps its colour between a board, a table and a chart. It inks the head's mark and reaches the column as a custom property, `--arena-board-column-cat`, so an appearance that fills the whole head with it is a style plugin's to write and needs no member here. */
  colorId?: ArenaCatSlot;

  /** One control in the head: a menu, a filter, an add. It sits after the count, and the column draws nothing for it beyond the space it takes. */
  action?: React.ReactNode;

  /** The cards, stacked in order. Arena draws none of them: a board's card carries the product's own fields, so what is left once they are removed is the stack, which is what this draws. */
  children?: React.ReactNode;

  /** The action that adds to this column, under the stack, where a board puts it because a new card lands at the bottom. Optional, and a column with none simply ends at its last card. */
  footer?: React.ReactNode;
}


const boardStyles = arenaStyles(manifest);

export function ArenaBoardColumn({ title, headingLevel = 'h3', count, summary, colorId, action, children, footer }: ArenaBoardColumnProps) {
  if (!title?.trim()) throw new Error('ArenaBoardColumn: `title` is required (it is the head and the column\'s accessible name at once)');
  if (headingLevel === 'none') {
    throw new Error('ArenaBoardColumn: `headingLevel` cannot be none, because `title` is required and names the column it heads');
  }
  const styles = boardStyles({ identity: colorId !== undefined });
  const Heading = headingLevel;
  return (
    <section role="group" aria-label={title} className={styles.column()} data-arena-part={manifest.parts.column}
      style={colorId ? { '--arena-board-column-cat': arenaCatColor(colorId) } as React.CSSProperties : undefined}>
      <div className={styles.head()} data-arena-part={manifest.parts.head}>
        {colorId !== undefined && <span aria-hidden="true" className={styles.dot()} data-arena-part={manifest.parts.dot} />}
        <Heading className={styles.title()} data-arena-part={manifest.parts.title}>{title}</Heading>
        {count !== undefined && <span className={styles.count()} data-arena-part={manifest.parts.count}>{count}</span>}
        <span className={styles.action()} data-arena-part={manifest.parts.action}>{action}</span>
      </div>
      {summary && <span className={styles.summary()} data-arena-part={manifest.parts.summary}>{summary}</span>}
      <div className={styles.stack()} data-arena-part={manifest.parts.stack}>{children}</div>
      <div className={styles.foot()} data-arena-part={manifest.parts.foot}>{footer}</div>
    </section>
  );
}
