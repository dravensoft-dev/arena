import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import { avatarLg, avatarMd, avatarSm, avatarXs } from '../../../Tokens.generated.js';
import manifest from './ArenaAvatar.classes.generated.ts';

import type { ArenaAvatarSize, ArenaAvatarShape, ArenaAvatarStatus } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaAvatarClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

const AVATAR_DIAMETER: Record<ArenaAvatarSize, number> = {
  xs: avatarXs, sm: avatarSm, md: avatarMd, lg: avatarLg,
};

export interface ArenaAvatarProps {
  className?: ArenaAvatarClass;

  /** Image URL. Absent renders initials from `name`. */
  src?: string;
  /** The person or entity name. Its first two words' initials render when there is no `src`, and it is the image's alt text. With `nameShown` set, both stay drawn and neither is announced, because what composes the avatar already says the name. */
  name?: string;
  /** The avatar's diameter. */
  size?: ArenaAvatarSize;
  /** Circle for a person, rounded for a team. */
  shape?: ArenaAvatarShape;
  /** A presence dot in the state's colour. `offline` is a visible muted dot; omit `status` entirely for no dot. Optional: there is no invisible enum value. */
  status?: ArenaAvatarStatus;
  /** Whether what composes this avatar already says its name: a name drawn beside it, or a control named on its own. Set, the image and the initials leave the accessibility tree so the name is announced once, and the presence dot keeps its own name. Leave it unset where the avatar is the only statement of who this is, including when it is a control's whole content, since that is how the control gets its name. */
  nameShown?: boolean;
}

const arenaAvatarStyles = arenaStyles(manifest);
const STATUSES = Object.keys(manifest.variants.status);
type Status = keyof typeof manifest.variants.status;
const statusOf = (status: string | undefined): Status | undefined =>
  (status && STATUSES.includes(status) ? status as Status : 'offline');

export function ArenaAvatar({ className, src, name = '', size = 'md', shape = 'circle', status, nameShown = false }: ArenaAvatarProps) {
  const locale = useArenaLocale();
  const names: Record<string, string> = { online: locale.avatarOnline, busy: locale.avatarBusy, away: locale.avatarAway, offline: locale.avatarOffline };
  const presence = names[statusOf(status) ?? 'offline'] ?? locale.avatarOffline;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
  const styles = arenaAvatarStyles({ size, shape, status: status ? statusOf(status) : 'none' });
  return (
    <span className={arenaClassName('ArenaAvatar', styles.root(), className)} data-arena-part={manifest.parts.root}>
      <span className={styles.box()} data-arena-part={manifest.parts.box} aria-hidden={nameShown ? true : undefined}>
        {src ? <img src={src} alt={name} className={styles.image()} data-arena-part={manifest.parts.image}
          width={AVATAR_DIAMETER[size]} height={AVATAR_DIAMETER[size]} decoding="async" /> : initials}
      </span>
      {status && <span aria-label={presence} title={presence} className={styles.status()} data-arena-part={manifest.parts.status} />}
    </span>
  );
}
