import { createContext, createElement, useContext, type ReactNode } from 'react';

const ArenaIconsContext = createContext<string | null>(null);

export interface ArenaIconsProviderProps {
  href: string;
  children?: ReactNode;
}

export function ArenaIconsProvider({ href, children }: ArenaIconsProviderProps) {
  return createElement(ArenaIconsContext.Provider, { value: href }, children);
}

export function useArenaIcons(): string | null {
  return useContext(ArenaIconsContext);
}
