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

export function arenaIndentFor(indentStep: number, depth: number): string {
  const steps = indentStep * depth;
  return steps === 0
    ? 'calc(var(--sp-1) * 3)'
    : `calc(var(--sp-1) * 3 + var(--sp-1) * ${steps})`;
}
