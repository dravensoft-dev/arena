import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ARENA_MAIN_ID } from '../arena-main/ArenaMain';
import { arenaSkipLinkStyles } from './ArenaSkipLink.variants';
import manifest from './ArenaSkipLink.classes.generated';

@Component({
  selector: 'arena-skip-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <a [href]="target" [class]="styles().root()" [attr.data-arena-part]="parts.root">{{ words() }}</a>
  `,
})
export class ArenaSkipLink {
  protected readonly parts = manifest.parts;
  protected readonly target = `#${ARENA_MAIN_ID}`;

  /** The words a reader reads when the link appears. Required, and guarded at runtime after trimming, the shape ArenaSideNav.ariaLabel carries for the same reason: this is text a person reads and nothing can derive it, and the guard trims first because the value it exists to catch is a present and useless one rather than an absent one, which the type already refuses. There is a defensible default in English and it is deliberately not given, because a default in one language is a wrong answer everywhere else and it is wrong silently. */
  readonly label = input.required<string>();

  protected readonly words = computed(() => {
    const text = this.label();
    if (text.trim() === '') {
      throw new Error('ArenaSkipLink: `label` is required, and is the words a reader reads when the link appears');
    }
    return text;
  });

  protected readonly styles = computed(() => arenaSkipLinkStyles());
}
