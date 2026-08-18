import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import { avatarLg, avatarMd, avatarSm, avatarXs } from '../../../Tokens.generated.js';
import manifest from './ArenaAvatar.classes.generated.ts';

import type { ArenaAvatarSize, ArenaAvatarShape, ArenaAvatarStatus } from '../../../Api.generated';

const AVATAR_DIAMETER: Record<ArenaAvatarSize, number> = {
  xs: avatarXs, sm: avatarSm, md: avatarMd, lg: avatarLg,
};

export interface ArenaAvatarProps {
  /** Image URL. Absent renders initials from `name`. */
  src?: string;
  /** The person or entity name. Its first two words' initials render when there is no `src`, and it is the image's alt text. */
  name?: string;
  /** The avatar's diameter. */
  size?: ArenaAvatarSize;
  /** Circle for a person, rounded for a team. */
  shape?: ArenaAvatarShape;
  /** A presence dot in the state's colour. `offline` is a visible muted dot; omit `status` entirely for no dot. Optional: there is no invisible enum value. */
  status?: ArenaAvatarStatus;
}

const arenaAvatarStyles = arenaStyles(manifest);
const STATUSES = Object.keys(manifest.variants.status);
type Status = keyof typeof manifest.variants.status;
const statusOf = (status: string | undefined): Status | undefined =>
  (status && STATUSES.includes(status) ? status as Status : 'offline');

export function ArenaAvatar({ src, name = '', size = 'md', shape = 'circle', status }: ArenaAvatarProps) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
  const styles = arenaAvatarStyles({ size, shape, status: status ? statusOf(status) : 'none' });
  return (
    <span className={styles.root()} data-arena-part={manifest.parts.root}>
      <span className={styles.box()} data-arena-part={manifest.parts.box}>
        {src ? <img src={src} alt={name} className={styles.image()} data-arena-part={manifest.parts.image}
          width={AVATAR_DIAMETER[size]} height={AVATAR_DIAMETER[size]} decoding="async" /> : initials}
      </span>
      {status && <span aria-label={status} title={status} className={styles.status()} data-arena-part={manifest.parts.status} />}
    </span>
  );
}
