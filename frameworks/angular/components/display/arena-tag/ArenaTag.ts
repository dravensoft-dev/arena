import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output } from '@angular/core';
import type { ArenaCatSlot, ArenaTagTone } from '../../../Api.generated';
import { arenaCatColor } from '../../../DataVisuals';
import { arenaTagStyles } from './ArenaTag.variants';
import manifest from './ArenaTag.classes.generated';

@Component({
  selector: 'arena-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[style.--arena-tag-cat]': 'catColour()', },
  template: `
    <span [class]="styles().dot()" [attr.data-arena-part]="parts.dot"></span>
    <ng-content />
    @if (removable()) {
      <button type="button" [class]="styles().close()" [attr.data-arena-part]="parts.close" aria-label="Remove"
              [attr.aria-disabled]="disabled() ? 'true' : null" (click)="onRemove()">
        <i class="ph-bold ph-x" aria-hidden="true"></i>
      </button>
    }
  `,
})
export class ArenaTag {
  protected readonly parts = manifest.parts;

  /** The tag's emphasis colour. Ignored while `colorId` names a ramp slot, because a tag draws one colour and the two mean different things. */
  readonly tone = input<ArenaTagTone, ArenaTagTone | undefined>(
    'neutral',
    { transform: (value) => value ?? 'neutral' },
  );
  /** An identity colour from the categorical ramp, the ramp the charts and the calendar read, so one entity keeps its colour across a chart, a schedule and a label. Colour here means which thing and never what state, which is why it replaces `tone` rather than joining it: a label reading "Backend" is not a warning, and a tag that could say both at once would say neither. Optional, and its absence is the tone tag. The slot's colour also reaches the tag as a custom property, `--arena-tag-cat`, so an appearance that fills the marker rather than outlining it is a style plugin's to write and needs no member here. */
  readonly colorId = input<ArenaCatSlot>();
  /** Whether the dismiss × is shown. Every layer gates the × on this member and never on whether anything listens for `remove`, because Arena never derives what it draws from what a consumer listens for. Removability is a declared input, not something inferred from the event. */
  readonly removable = input(false, { transform: booleanAttribute });
  /** Whether removal is unavailable while the tag stays visible: a filter a consumer's permissions lock, not a tag that is merely inert. It reflects through `aria-disabled` rather than the native `disabled` attribute, so the × keeps its place in the tab order and a screen-reader user is told the action is unavailable instead of never finding it. With `removable` false there is no × and nothing to disable. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The dismiss × was activated. Never emitted while `disabled`. */
  readonly remove = output<void>();
  protected readonly catColour = computed(() => {
    const slot = this.colorId();
    return slot === undefined ? null : arenaCatColor(slot);
  });

  protected readonly styles = computed(() => arenaTagStyles({
    tone: this.colorId() === undefined ? this.tone() : 'identity',
    disabled: this.disabled(),
  }));

  protected onRemove(): void {
    if (!this.disabled()) this.remove.emit();
  }
}
