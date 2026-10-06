import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaAvatar.classes.generated.ts';

import type { ArenaAvatarKind, ArenaAvatarStatus } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaAvatarClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaAvatarInjected {
  face: boolean;
}

export interface ArenaAvatarProps {
  className?: ArenaAvatarClass;

  /** Image URL. Absent renders initials from `name`. */
  src?: string;
  /** The person or entity name. Its first two words' initials render when there is no `src`, and it is the image's alt text. With `nameShown` set, both stay drawn and neither is announced, because what composes the avatar already says the name. */
  name?: string;
  /** Whether the avatar stands for a person or for a team. A person is drawn as a circle and a team as a rounded square, so the two read apart in a list that holds both. */
  kind?: ArenaAvatarKind;
  /** A presence dot in the state's colour. `offline` is a visible muted dot; omit `status` entirely for no dot. Optional: there is no invisible enum value. */
  status?: ArenaAvatarStatus;
  /** Whether what composes this avatar already says its name: a name drawn beside it, or a control named on its own. Set, the image and the initials leave the accessibility tree so the name is announced once, and the presence dot keeps its own name. Leave it unset where the avatar is the only statement of who this is, including when it is a control's whole content, since that is how the control gets its name. */
  nameShown?: boolean;
}

const arenaAvatarStyles = arenaStyles(manifest);
const STATUSES: readonly string[] = manifest.values.status;
type Status = typeof manifest.values.status[number];
const statusOf = (status: string | undefined): Status | undefined =>
  (status && STATUSES.includes(status) ? status as Status : 'offline');

export function ArenaAvatar({ className, src, name = '', kind = 'person', status, nameShown = false, face = false }: ArenaAvatarProps & Partial<ArenaAvatarInjected>) {
  const locale = useArenaLocale();
  const names: Record<string, string> = { online: locale.avatarOnline, busy: locale.avatarBusy, away: locale.avatarAway, offline: locale.avatarOffline };
  const presence = names[statusOf(status) ?? 'offline'] ?? locale.avatarOffline;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
  const styles = arenaAvatarStyles({ kind, status: status ? statusOf(status) : 'none' });
  return (
    <span className={arenaClassName('ArenaAvatar', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}
      style={face ? { '--arena-size-avatar': 'var(--arena-size-face, var(--size-md-face))' } as React.CSSProperties : undefined}>
      <span className={styles.box()} data-arena-part={manifest.parts.box} {...styles.$data.box()} aria-hidden={nameShown ? true : undefined}>
        {src ? <img src={src} alt={name} className={styles.image()} data-arena-part={manifest.parts.image} {...styles.$data.image()} decoding="async" /> : initials}
      </span>
      {status && <span aria-label={presence} title={presence} className={styles.status()} data-arena-part={manifest.parts.status} {...styles.$data.status()} />}
    </span>
  );
}
