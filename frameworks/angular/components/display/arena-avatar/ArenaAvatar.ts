import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { avatarLg, avatarMd, avatarSm, avatarXs } from '../../../Tokens.generated';
import { arenaAvatarStyles } from './ArenaAvatar.variants';
import manifest from './ArenaAvatar.classes.generated';
import type { ArenaAvatarSize, ArenaAvatarShape, ArenaAvatarStatus } from '../../../Api.generated';

const AVATAR_DIAMETER: Record<ArenaAvatarSize, number> = {
  xs: avatarXs, sm: avatarSm, md: avatarMd, lg: avatarLg,
};

@Component({
  selector: 'arena-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.name]': 'null',
  },
  template: `
    <span [class]="styles().box()" [attr.data-arena-part]="parts.box">
      @if (src(); as source) {
        <img [src]="source" [alt]="name()" [class]="styles().image()" [attr.data-arena-part]="parts.image"
             [attr.width]="diameter()" [attr.height]="diameter()" decoding="async" />
      } @else {
        {{ initials() }}
      }
    </span>
    @if (status(); as presence) {
      <span [class]="styles().status()" [attr.data-arena-part]="parts.status" [attr.aria-label]="presence" [title]="presence"></span>
    }
  `,
})
export class ArenaAvatar {
  protected readonly parts = manifest.parts;

  /** Image URL. Absent renders initials from `name`. */
  readonly src = input<string>();
  /** The person or entity name. Its first two words' initials render when there is no `src`, and it is the image's alt text. */
  readonly name = input<string, string | undefined>('', { transform: (value) => value ?? '' });
  /** The avatar's diameter. */
  readonly size = input<ArenaAvatarSize, ArenaAvatarSize | undefined>(
    'md',
    { transform: (value) => value ?? 'md' },
  );
  /** Circle for a person, rounded for a team. */
  readonly shape = input<ArenaAvatarShape, ArenaAvatarShape | undefined>(
    'circle',
    { transform: (value) => value ?? 'circle' },
  );
  /** A presence dot in the state's colour. `offline` is a visible muted dot; omit `status` entirely for no dot. Optional: there is no invisible enum value. */
  readonly status = input<ArenaAvatarStatus>();

  protected readonly styles = computed(() =>
    arenaAvatarStyles({ size: this.size(), shape: this.shape(), status: this.status() ?? 'none' }));

  protected readonly initials = computed(() =>
    this.name().trim().split(/\s+/).slice(0, 2).map((word) => word[0] ?? '').join('').toUpperCase());

  protected readonly diameter = computed(() => AVATAR_DIAMETER[this.size()]);
}
