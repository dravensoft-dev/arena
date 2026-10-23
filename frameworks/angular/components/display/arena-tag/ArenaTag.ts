import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { ArenaCatSlot, ArenaTagTone } from '../../../Api.generated';
import { arenaCatIndex } from '../../../DataVisuals';
import { arenaTagStyles } from './ArenaTag.variants';
import manifest from './ArenaTag.classes.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaSlotAttributes } from '../../../SlotData';
import { ArenaIcon } from '../arena-icon/ArenaIcon';

@Component({
  selector: 'arena-tag',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-arena-boundary': '', '[class]': 'styles().root()',
    '[attr.data-arena-tone]': "styles().$data.root()['data-arena-tone'] ?? null",
    '[attr.data-arena-color-id]': "styles().$data.root()['data-arena-color-id'] ?? null",
    '[attr.data-arena-part]': 'parts.root',
  },
  template: `
    <span [class]="styles().dot()" [attr.data-arena-part]="parts.dot" aria-hidden="true"></span>
    <span [id]="textId" data-arena-boundary=""><ng-content /></span>
    @if (removable()) {
      <button type="button" [id]="closeId" [class]="styles().close()" [arenaSlotData]="styles().$data.close()" [attr.data-arena-part]="parts.close"
              [attr.aria-labelledby]="closeId + ' ' + textId" [attr.aria-disabled]="disabled() ? 'true' : null"
              [attr.tabindex]="tabStop() ? null : -1" (click)="onRemove()">
        <arena-icon icon="ph-bold ph-x" /><span [class]="styles().closeLabel()" [attr.data-arena-part]="parts.closeLabel">{{ locale.tagRemove }}</span>
      </button>
    }
  `,
})
export class ArenaTag {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);
  protected readonly textId = inject(ArenaIdGenerator).next('arena-tag');
  protected readonly closeId = `${this.textId}-remove`;

  /** What state the tag reports; neutral reports none. Ignored while `colorId` names a ramp slot, because a tag draws one colour and the two mean different things. */
  readonly tone = input<ArenaTagTone, ArenaTagTone | undefined>(
    'neutral',
    { transform: (value) => value ?? 'neutral' },
  );
  /** An identity colour from the categorical ramp, the ramp the charts and the calendar read, so one entity keeps its colour across a chart, a schedule and a label. Colour here means which thing and never what state, which is why it replaces `tone` rather than joining it. A label reading "Backend" is not a warning, and a tag that could say both at once would say neither. Optional, and its absence is the tone tag. The slot reaches the tag as `data-arena-color-id` and its colour through the hue channels (`--arena-hue-ink`, `--arena-hue-edge`, `--arena-hue-fill-strong`, `--arena-hue-fill-soft`). An appearance that fills the marker rather than outlining it is therefore a style plugin's to write and needs no member here. */
  readonly colorId = input<ArenaCatSlot>();
  /** Whether the dismiss × is shown. Every layer gates the × on this member and never on whether anything listens for `remove`, because Arena never derives what it draws from what a consumer listens for. Removability is a declared input, not something inferred from the event. */
  readonly removable = input(false, { transform: booleanAttribute });
  /** Whether removal is unavailable while the tag stays visible: a filter a consumer's permissions lock, not a tag that is merely inert. The × carries `aria-disabled` rather than the native `disabled` attribute. A screen-reader user finds it where `tabStop` puts it and is told the action is unavailable. With `removable` false there is no × and nothing to disable. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Whether the remove button is reached from the page's Tab sequence. Set false when the tag lives inside a composite that manages its own focus. A field holding its chosen values as chips, with one tab stop and arrow keys between them, is one such composite. Reaching the button by Tab there would be a second way in. Arena writes tabindex="-1" and the button stays programmatically focusable; a positive tab order is not expressible and never should be. With `removable` false there is no button and nothing to hold out. */
  readonly tabStop = input(true, { transform: booleanAttribute });
  /** The dismiss × was activated. Never emitted while `disabled`. */
  readonly remove = output<void>();
  protected readonly styles = computed(() => {
    const slot = this.colorId();
    return arenaTagStyles({
      tone: slot === undefined ? this.tone() : undefined,
      colorId: slot === undefined ? undefined : String(arenaCatIndex(slot)),
      disabled: this.disabled(),
    });
  });

  protected onRemove(): void {
    if (!this.disabled()) this.remove.emit();
  }
}
