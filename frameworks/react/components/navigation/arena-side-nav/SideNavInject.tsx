import React from 'react';

export interface ArenaSideNavInjected {
  depth: number;
  activeId?: string;
  onActivate?: (id: string) => void;
  collapsed?: boolean;
}

export function arenaInjectInto(children: React.ReactNode, injected: ArenaSideNavInjected): React.ReactNode[] {
  return React.Children.toArray(children).map((child) => (
    React.isValidElement<Partial<ArenaSideNavInjected>>(child) ? React.cloneElement(child, injected) : child
  ));
}

export function arenaIndentDepth(depth: number): number {
  return depth;
}
