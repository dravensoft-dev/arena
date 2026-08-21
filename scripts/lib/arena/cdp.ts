/* The Chrome DevTools Protocol dispatcher the browser gates drive Chromium with. A CDP
 * frame is a numbered request and a reply carries that number back, so the dispatcher is
 * a map of promises keyed by id, and everything the socket delivers that settles nothing
 * is an event a listener wanted. A command's params and its result are per-method and
 * this models neither: what it types is the envelope, which is the part every caller
 * shares. A session is present only for a command scoped to one target. CdpSend is the
 * half most callers use: the listener and the close belong to whoever opened the socket,
 * which is why a suite can stand in with a send alone. evaluate() is the one method with
 * a reader of its own, because its answer to an expression that threw is a successful
 * reply carrying an empty value, and reading that value alone loses the throw. */

export type CdpFrame = { id: number; method: string; params: unknown; sessionId?: string };

export type CdpMessage = {
  id?: number;
  error?: { code: number; message: string };
  result?: unknown;
  method?: string;
  params?: unknown;
};

export type CdpSend = Pick<Cdp, 'send'>;

export type Cdp = {
  send(method: string, params?: unknown, sessionId?: string): Promise<any>;
  on(handler: (message: CdpMessage) => void): void;
  close(): void;
};

export class PageThrew extends Error {
  constructor(message: string) { super(message); this.name = 'PageThrew'; }
}

export const EVALUATE = 'Runtime.evaluate';

export async function evaluate(cdp: CdpSend, expression: string, sessionId?: string) {
  const answer = await cdp.send(EVALUATE, { expression, awaitPromise: true, returnByValue: true }, sessionId);
  const thrown = answer?.exceptionDetails;
  if (thrown) {
    const said = thrown.exception?.description ?? thrown.text ?? 'the browser gave no description';
    const head = expression.trim().split('\n')[0] ?? '';
    const shown = head.length > 60 ? `${head.slice(0, 60)}...` : head;
    throw new PageThrew(`${String(said).split('\n')[0]} (evaluating ${JSON.stringify(shown)})`);
  }
  return answer?.result?.value;
}

export function createDispatcher() {
  let id = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  return {
    pending,
    next(method: string, params: unknown = {}, sessionId?: string) {
      const frame: CdpFrame = { id: ++id, method, params };
      if (sessionId) frame.sessionId = sessionId;
      const result = new Promise((resolve, reject) => pending.set(frame.id, { resolve, reject }));
      return { frame, result };
    },

    settle(message: CdpMessage) {
      if (typeof message?.id !== 'number') return false;
      const waiter = pending.get(message.id);
      if (!waiter) return false;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(`CDP error ${message.error.code}: ${message.error.message}`));
      else waiter.resolve(message.result);
      return true;
    },

    drain(err: Error) {
      for (const waiter of pending.values()) waiter.reject(err);
      pending.clear();
    },
  };
}

export function connect(wsUrl: string): Promise<Cdp> {
  return new Promise<Cdp>((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const dispatcher = createDispatcher();
    const listeners: ((message: CdpMessage) => void)[] = [];
    let open = false;

    socket.addEventListener('message', (ev) => {
      const message = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
      if (!dispatcher.settle(message)) for (const h of listeners) h(message);
    });

    socket.addEventListener('error', () => {
      if (open) dispatcher.drain(new Error(`CDP: connection to ${wsUrl} errored`));
      else reject(new Error(`CDP: could not connect to ${wsUrl}`));
    });

    socket.addEventListener('close', () => {
      dispatcher.drain(new Error(`CDP: connection to ${wsUrl} closed`));
    });
    socket.addEventListener('open', () => {
      open = true;
      resolve({
        send(method: string, params?: unknown, sessionId?: string) {
          const { frame, result } = dispatcher.next(method, params, sessionId);
          socket.send(JSON.stringify(frame));
          return result;
        },
        on(handler: (message: CdpMessage) => void) { listeners.push(handler); },
        close() { socket.close(); },
      });
    });
  });
}
