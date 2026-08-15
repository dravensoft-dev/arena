import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaFigure.classes.generated.ts';

export interface ArenaFigureProps {

  /** The picture itself, as the element you wrote: an img, a video, a canvas. It is clipped to the frame and meets its edges the way the voice says, which is why nothing here takes a source or an alternative text. Those belong to your element, and an image's alternative is editorial in a way nothing can derive. */
  media?: React.ReactNode;

  /** What the frame shows when there is no media, drawn centred and at rest rather than as an error: an icon standing for a category, a monogram, a shape. Absent along with media, the frame is an empty box of the right shape, which is what a loading wall wants. */
  fallback?: React.ReactNode;

  /** Content laid over the media, on the wash the overlay role paints, so a mark or a line of text stays readable against a picture nobody chose. It is inside the frame and the caption is under it, which is the whole difference between the two. */
  overlay?: React.ReactNode;

  /** A line under the frame, rendered as a real figcaption inside a real figure, so the association is the platform's rather than a class name's. Absent, the figure renders no caption element at all rather than an empty one. */
  caption?: string;

  /** The shape of the frame, as a CSS aspect ratio. The default is the role, so a voice answers it for every figure at once and a shop crops portrait where a gallery tiles square. Give it a value outright for the figure whose shape is not the voice's to decide: a video is sixteen by nine whatever the page sounds like. */
  ratio?: string;
}

const arenaFigureStyles = arenaStyles(manifest);

export function ArenaFigure({
  media, fallback, overlay, caption, ratio = 'var(--aspect-media)',
}: ArenaFigureProps) {
  const styles = arenaFigureStyles();

  return (
    <figure className={styles.root()}>
      <div className={styles.frame()} style={{ aspectRatio: ratio }}>
        {media && <div className={styles.media()}>{media}</div>}
        {!media && fallback && <div className={styles.fallback()}>{fallback}</div>}
        {overlay && <div className={styles.overlay()}>{overlay}</div>}
      </div>
      {caption && <figcaption className={styles.caption()}>{caption}</figcaption>}
    </figure>
  );
}
