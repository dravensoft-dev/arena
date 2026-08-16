Arena toast, an ephemeral notice with a tone-coloured side bar and one optional action.
Standalone, `OnPush`, signal I/O. The host **is** the card, so `<arena-toast>` is the
element you place.

It positions nothing and owns no clock. The host decides where the stack sits and when each
notice goes: `arena-toast-host` is the box that places it, and the clock belongs to the queue that
raised the notice. `ArenaToastQueue`, provided in root, is that queue: inject it, call
`raise(notice)`, render `toasts()` into the host, and the dismissal rule is already inside it. `ARENA_TOAST_DISMISS`, exported beside the component, carries the two intervals to run
it off: `.default` for a notice that only has to be read, `.actionable` for one carrying a button,
which asks the reader to decide rather than only to read. They are tokens, so a host that reads
them stays in step with a release that moves one; a host that retypes 4200 does not. The
component's only say in the matter is `data-persist`, which it sets when the notice must not be
taken away on a timer.

```html
@for (notice of notices(); track notice.id) {
  <arena-toast [title]="notice.title" [message]="notice.message" [tone]="notice.tone"
               actionLabel="Retry" dismissible
               (action)="retry(notice)" (close)="drop(notice)" />
}
```

<!-- @api GENERATED from contracts/api/components/ArenaToast.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `title` | primitive | `string` |  | The bold lead line. |
| `message` | primitive | `string` |  | The body. |
| `tone` | enum | `ArenaToastTone` | `"neutral"` | The side bar's colour, and whether the toast announces assertively. |
| `actionLabel` | primitive | `string` |  | The label of the single inline action: Undo, Retry, View logs. Absent renders no action. |
| `action` | event |  |  | The inline action was activated. |
| `persist` | primitive | `boolean` | `false` | Disables the host's auto-dismiss and shows the Pinned marker. **Implied by `tone: "danger"`, which ignores `false`**: a critical message that vanishes on a timer is one a user can miss entirely, and this was documented as mandatory in an error state while nothing enforced it. Set it explicitly for any other tone that must not disappear on its own. |
| `dismissible` | primitive | `boolean` | `false` | Whether the × is shown. Every layer gates the × on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. |
| `close` | event |  |  | The × was activated. |

<!-- @api end -->

**Tone decides how the message is announced, and that is the whole reason this primitive
exists.** `tone="danger"` renders `role="alert"` with `aria-live="assertive"`, so a critical
message interrupts whatever a screen reader is already saying; every other tone renders
`role="status"` with `aria-live="polite"` and queues behind it. `persist` is **implied by
danger and ignores an explicit `false`**: a critical message that vanishes on a timer is one a
user can miss entirely, and a pinned toast says so visibly with the `Pinned` marker as well as
in `data-persist`.

`dismissible` gates the ×. It exists because Angular cannot ask whether an output has
subscribers, so the host has to say whether the notice is closeable rather than have Arena infer
it from a `close` listener.

**Do / Don't**
- **Do** read `data-persist` in the host's own clock and skip the timer for any toast that
  carries it. Danger sets it for you; anything else sets it through `persist`.
- **Do** keep `message` to one line of consequence. The title is the lead; a toast is not where
  a paragraph goes.
- **Don't** put more than one action on it. `actionLabel` is singular on purpose: Undo, Retry,
  View logs. A notice with two choices is a dialog.
- **Don't** reach for `tone="danger"` for anything a user can ignore. Assertive announcement cuts
  a screen reader off mid-sentence, and a tone that always interrupts stops meaning anything.
- **Don't** give it a `position` of its own. It carries `--z-toast`, the one slot above every
  other overlay including the CDK layer, but a statically-positioned element ignores `z-index`,
  the stack's own container is what places it.

**By hand, in real Chromium**: the announcement is a screen reader's, not a browser's, so what
this page shows is the rest. Run `bun run demos` and open
`/frameworks/angular/components/feedback/arena-toast/ArenaToast.demo.generated.html`:
- Each tone's left bar takes its own colour and the card surface never does; danger is
  **outline**, never a filled red panel.
- A danger toast shows `Pinned` even when the host passed `persist="false"`, and the demo's
  clock leaves it alone while every other toast expires.
- The action and the × are two separate controls, both reachable by Tab, and the × sits outside
  the body column rather than inside it.
- Stacked against an open dialog, a toast paints above it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
