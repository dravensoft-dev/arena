import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output } from '@angular/core';
import type { ArenaTagTone } from '../../../Api.generated';
import { arenaTagStyles } from './ArenaTag.variants';
import manifest from './ArenaTag.classes.generated';

@Component({
  selector: 'arena-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root', },
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

  /** The tag's emphasis colour. */
  readonly tone = input<ArenaTagTone, ArenaTagTone | undefined>(
    'neutral',
    { transform: (value) => value ?? 'neutral' },
  );
  /** Whether the dismiss × is shown. Every layer gates the × on this member and never on whether anything listens for `remove`, because Arena never derives what it draws from what a consumer listens for. Removability is a declared input, not something inferred from the event. */
  readonly removable = input(false, { transform: booleanAttribute });
  /** Whether removal is unavailable while the tag stays visible: a filter a consumer's permissions lock, not a tag that is merely inert. It reflects through `aria-disabled` rather than the native `disabled` attribute, so the × keeps its place in the tab order and a screen-reader user is told the action is unavailable instead of never finding it. With `removable` false there is no × and nothing to disable. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The dismiss × was activated. Never emitted while `disabled`. */
  readonly remove = output<void>();
  protected readonly styles = computed(() => arenaTagStyles({ tone: this.tone(), disabled: this.disabled() }));

  protected onRemove(): void {
    if (!this.disabled()) this.remove.emit();
  }
}
