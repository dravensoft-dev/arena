import { useCallback, useEffect, useRef, useState } from 'react';
import { ARENA_TOAST_DISMISS } from './components/feedback/arena-toast/ArenaToast.tsx';
import { arenaToastDelay, type ArenaToastNotice } from './ToastClock.ts';

export type { ArenaToastNotice };

export interface ArenaToastEntry extends ArenaToastNotice {
  id: number;
}

export interface ArenaToastQueue {
  toasts: readonly ArenaToastEntry[];
  raise: (notice: ArenaToastNotice) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

export function useArenaToasts(): ArenaToastQueue {
  const [toasts, setToasts] = useState<readonly ArenaToastEntry[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((held) => held.filter((one) => one.id !== id));
  }, []);

  const raise = useCallback((notice: ArenaToastNotice) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((held) => [...held, { ...notice, id }]);
    const delay = arenaToastDelay(notice, ARENA_TOAST_DISMISS);
    if (delay !== null) timers.current.set(id, setTimeout(() => dismiss(id), delay));
    return id;
  }, [dismiss]);

  const clear = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
  }, []);

  return { toasts, raise, dismiss, clear };
}
