import React from 'react';

export interface ArenaSideNavInjected {
  depth: number;
  indentStep: number;
  activeId?: string;
  onActivate?: (id: string) => void;
  collapsed?: boolean;
}

export function arenaInjectInto(children: React.ReactNode, injected: ArenaSideNavInjected): React.ReactNode[] {
  return React.Children.toArray(children).map((child) => (
    React.isValidElement<Partial<ArenaSideNavInjected>>(child) ? React.cloneElement(child, injected) : child
  ));
}

export function arenaIndentDepth(indentStep: number, depth: number): number {
  return indentStep * depth;
}
