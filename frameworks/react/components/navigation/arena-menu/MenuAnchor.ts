import { createContext } from 'react';
import type { RefObject } from 'react';

export const ArenaMenuAnchor = createContext<RefObject<HTMLElement | null> | null>(null);
