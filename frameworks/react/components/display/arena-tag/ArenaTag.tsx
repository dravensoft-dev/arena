import React, { useId } from 'react';

import type { ArenaCatSlot, ArenaTagTone } from '../../../Api.generated';
import { arenaCatIndex } from '../../../DataVisuals.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTag.classes.generated.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaTagClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaTagProps {
  className?: ArenaTagClass;

  /** The tag's label. */
  children?: React.ReactNode;
  /** What state the tag reports; neutral reports none. Ignored while `colorId` names a ramp slot, because a tag draws one colour and the two mean different things. */
  tone?: ArenaTagTone;
  /** An identity colour from the categorical ramp, the ramp the charts and the calendar read, so one entity keeps its colour across a chart, a schedule and a label. Colour here means which thing and never what state, which is why it replaces `tone` rather than joining it. A label reading "Backend" is not a warning, and a tag that could say both at once would say neither. Optional, and its absence is the tone tag. The slot reaches the tag as `data-arena-color-id` and its colour through the hue channels (`--arena-hue-ink`, `--arena-hue-edge`, `--arena-hue-fill-strong`, `--arena-hue-fill-soft`). An appearance that fills the marker rather than outlining it is therefore a style plugin's to write and needs no member here. */
  colorId?: ArenaCatSlot;
  /** Whether the dismiss × is shown. Every layer gates the × on this member and never on whether anything listens for `onRemove`, because Arena never derives what it draws from what a consumer listens for. Removability is a declared input, not something inferred from the event. */
  removable?: boolean;
  /** Whether removal is unavailable while the tag stays visible: a filter a consumer's permissions lock, not a tag that is merely inert. The × carries `aria-disabled` rather than the native `disabled` attribute. A screen-reader user finds it where `tabStop` puts it and is told the action is unavailable. With `removable` false there is no × and nothing to disable. */
  disabled?: boolean;
  /** Whether the remove button is reached from the page's Tab sequence. Set false when the tag lives inside a composite that manages its own focus. A field holding its chosen values as chips, with one tab stop and arrow keys between them, is one such composite. Reaching the button by Tab there would be a second way in. Arena writes tabindex="-1" and the button stays programmatically focusable; a positive tab order is not expressible and never should be. With `removable` false there is no button and nothing to hold out. */
  tabStop?: boolean;
  /** The dismiss × was activated. Never emitted while `disabled`. */
  onRemove?: () => void;
}


const arenaTagStyles = arenaStyles(manifest);

export function ArenaTag({ className, children, tone = 'neutral', colorId, removable = false, disabled = false, tabStop = true, onRemove }: ArenaTagProps) {
  const locale = useArenaLocale();
  const textId = `tag-${useId().replace(/:/g, '')}`;
  const closeId = `${textId}-remove`;
  const styles = arenaTagStyles({ tone: colorId === undefined ? tone : undefined, colorId: colorId === undefined ? undefined : String(arenaCatIndex(colorId)), disabled });
  return (
    <span className={arenaClassName('ArenaTag', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()} data-arena-boundary="">
      <span aria-hidden="true" className={styles.dot()} data-arena-part={manifest.parts.dot} {...styles.$data.dot()} />
      <span id={textId} data-arena-boundary="">{children}</span>
      {removable && <button type="button" id={closeId} className={styles.close()} data-arena-part={manifest.parts.close} {...styles.$data.close()}
        aria-labelledby={`${closeId} ${textId}`} aria-disabled={disabled ? 'true' : undefined} tabIndex={tabStop ? undefined : -1}
        onClick={disabled ? undefined : onRemove}><i className="ph-bold ph-x" aria-hidden="true" /><span className={styles.closeLabel()} data-arena-part={manifest.parts.closeLabel} {...styles.$data.closeLabel()}>{locale.tagRemove}</span></button>}
    </span>
  );
}
