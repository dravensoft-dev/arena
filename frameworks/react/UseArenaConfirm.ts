import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArenaConfirmRequest } from './Api.generated';

export interface ArenaConfirmEntry extends ArenaConfirmRequest {
  id: number;
}

export interface ArenaConfirmQueue {
  current: ArenaConfirmEntry | null;
  ask: (request: ArenaConfirmRequest) => Promise<boolean>;
  settle: (id: number, answer: boolean) => void;
}

type Held = { entry: ArenaConfirmEntry; resolve: (answer: boolean) => void };

export function useArenaConfirm(): ArenaConfirmQueue {
  const [held, setHeld] = useState<readonly Held[]>([]);
  const heldRef = useRef<readonly Held[]>([]);
  const nextId = useRef(0);

  const commit = useCallback((next: readonly Held[]) => { heldRef.current = next; setHeld(next); }, []);

  const ask = useCallback((request: ArenaConfirmRequest) => {
    if (!request.title?.trim()) throw new Error('useArenaConfirm.ask: `title` is required, and names what is being confirmed');
    nextId.current += 1;
    const entry: ArenaConfirmEntry = { ...request, id: nextId.current };
    return new Promise<boolean>((resolve) => { commit([...heldRef.current, { entry, resolve }]); });
  }, [commit]);

  const settle = useCallback((id: number, answer: boolean) => {
    const [head, ...rest] = heldRef.current;
    if (!head || head.entry.id !== id) return;
    head.resolve(answer);
    commit(rest);
  }, [commit]);

  useEffect(() => () => {
    for (const one of heldRef.current) one.resolve(false);
    heldRef.current = [];
  }, []);

  return { current: held[0]?.entry ?? null, ask, settle };
}
