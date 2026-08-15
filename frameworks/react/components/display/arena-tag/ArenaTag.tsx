import React from 'react';

import type { ArenaCatSlot, ArenaTagTone } from '../../../Api.generated';
import { arenaCatColor } from '../../../DataVisuals.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTag.classes.generated.ts';

export interface ArenaTagProps {
  /** The tag's label. */
  children?: React.ReactNode;
  /** The tag's emphasis colour. Ignored while `colorId` names a ramp slot, because a tag draws one colour and the two mean different things. */
  tone?: ArenaTagTone;
  /** An identity colour from the categorical ramp, the ramp the charts and the calendar read, so one entity keeps its colour across a chart, a schedule and a label. Colour here means which thing and never what state, which is why it replaces `tone` rather than joining it: a label reading "Backend" is not a warning, and a tag that could say both at once would say neither. Optional, and its absence is the tone tag. The slot's colour also reaches the tag as a custom property, `--arena-tag-cat`, so an appearance that fills the pill rather than outlining it is a style plugin's to write and needs no member here. */
  colorId?: ArenaCatSlot;
  /** Whether the dismiss × is shown. Every layer gates the × on this member and never on whether anything listens for `remove`, because Arena never derives what it draws from what a consumer listens for. Removability is a declared input, not something inferred from the event. */
  removable?: boolean;
  /** Whether removal is unavailable while the tag stays visible: a filter a consumer's permissions lock, not a tag that is merely inert. It reflects through `aria-disabled` rather than the native `disabled` attribute, so the × keeps its place in the tab order and a screen-reader user is told the action is unavailable instead of never finding it. With `removable` false there is no × and nothing to disable. */
  disabled?: boolean;
  /** The dismiss × was activated. Never emitted while `disabled`. */
  onRemove?: () => void;
}


const arenaTagStyles = arenaStyles(manifest);

export function ArenaTag({ children, tone = 'neutral', colorId, removable = false, disabled = false, onRemove }: ArenaTagProps) {
  const styles = arenaTagStyles({ tone: colorId ? 'identity' : tone, disabled });
  return (
    <span className={styles.root()} data-arena-part={manifest.parts.root}
      style={colorId ? { '--arena-tag-cat': arenaCatColor(colorId) } as React.CSSProperties : undefined}>
      <span aria-hidden="true" className={styles.dot()} data-arena-part={manifest.parts.dot} />
      {children}
      {removable && <button type="button" className={styles.close()} data-arena-part={manifest.parts.close} aria-label="Remove"
        aria-disabled={disabled ? 'true' : undefined}
        onClick={disabled ? undefined : onRemove}><i className="ph-bold ph-x" aria-hidden="true" /></button>}
    </span>
  );
}
