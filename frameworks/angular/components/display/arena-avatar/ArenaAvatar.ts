import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { avatarLg, avatarMd, avatarSm, avatarXs } from '../../../Tokens.generated';
import { arenaAvatarStyles } from './ArenaAvatar.variants';
import manifest from './ArenaAvatar.classes.generated';
import type { ArenaAvatarSize, ArenaAvatarShape, ArenaAvatarStatus } from '../../../Api.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaSlotAttributes } from '../../../SlotData';

const AVATAR_DIAMETER: Record<ArenaAvatarSize, number> = {
  xs: avatarXs, sm: avatarSm, md: avatarMd, lg: avatarLg,
};

@Component({
  selector: 'arena-avatar',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-size]': "styles().$data.root()['data-arena-size'] ?? null",
    '[attr.data-arena-part]': 'parts.root',
    '[attr.name]': 'null',
  },
  template: `
    <span [class]="styles().box()" [arenaSlotData]="styles().$data.box()" [attr.data-arena-part]="parts.box" [attr.aria-hidden]="nameShown() ? 'true' : null">
      @if (src(); as source) {
        <img [src]="source" [alt]="name()" [class]="styles().image()" [attr.data-arena-part]="parts.image"
             [attr.width]="diameter()" [attr.height]="diameter()" decoding="async" />
      } @else {
        {{ initials() }}
      }
    </span>
    @if (status(); as presence) {
      <span [class]="styles().status()" [arenaSlotData]="styles().$data.status()" [attr.data-arena-part]="parts.status" [attr.aria-label]="presenceName(presence)" [title]="presenceName(presence)"></span>
    }
  `,
})
export class ArenaAvatar {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);

  protected presenceName(status: ArenaAvatarStatus): string {
    return { online: this.locale.avatarOnline, busy: this.locale.avatarBusy, away: this.locale.avatarAway, offline: this.locale.avatarOffline }[status];
  }

  /** Image URL. Absent renders initials from `name`. */
  readonly src = input<string>();
  /** The person or entity name. Its first two words' initials render when there is no `src`, and it is the image's alt text. With `nameShown` set, both stay drawn and neither is announced, because what composes the avatar already says the name. */
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
  /** Whether what composes this avatar already says its name: a name drawn beside it, or a control named on its own. Set, the image and the initials leave the accessibility tree so the name is announced once, and the presence dot keeps its own name. Leave it unset where the avatar is the only statement of who this is, including when it is a control's whole content, since that is how the control gets its name. */
  readonly nameShown = input(false, { transform: booleanAttribute });

  protected readonly styles = computed(() =>
    arenaAvatarStyles({ size: this.size(), shape: this.shape(), status: this.status() ?? 'none' }));

  protected readonly initials = computed(() =>
    this.name().trim().split(/\s+/).slice(0, 2).map((word) => word[0] ?? '').join('').toUpperCase());

  protected readonly diameter = computed(() => AVATAR_DIAMETER[this.size()]);
}
