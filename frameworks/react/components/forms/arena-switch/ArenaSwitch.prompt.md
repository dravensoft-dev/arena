Controlled on/off switch showing an icon per state (`iconOn`/`iconOff`, Phosphor class
strings, Arena draws the `<i>`). `state` is the CURRENT value; the host owns it and
pushes it back on every render.

```tsx
const [dark, setDark] = useState(false);

<ArenaSwitch state={dark} onFuncOn={() => setDark(true)} onFuncOff={() => setDark(false)}
  iconOn="ph-bold ph-moon" iconOff="ph-bold ph-sun" label="Dark theme" />
```

<!-- @api GENERATED from contracts/api/components/ArenaSwitch.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `state` | primitive | `boolean` | `false` | The current on/off value. Controlled: the consumer owns it and pushes it each render. |
| `orientation` | enum | `ArenaOrientation` | `"horizontal"` | Whether the switch lies horizontally or stands vertically. |
| `size` | enum | `ArenaSwitchSize` | `"md"` | The switch's overall size. |
| `iconOn` | primitive | `string` |  | A Phosphor class name for the glyph shown while on. Arena draws the aria-hidden `<i>`. |
| `iconOff` | primitive | `string` |  | A Phosphor class name for the glyph shown while off. |
| `label*` | primitive | `string` |  | The accessible name for the switch, also drawn beside it. |
| `disabled` | primitive | `boolean` | `false` | Whether the switch is inoperable. |
| `confirm` | primitive | `boolean` | `false` | When set, a change is not applied on the fly; it is requested through `requestChange` so the host can confirm it first. |
| `onFuncOn` | event |  |  | The switch was turned on. |
| `onFuncOff` | event |  |  | The switch was turned off. |
| `onRequestChange` | event |  |  | A change was requested while `confirm` is set: the host opens an ArenaConfirmDialog and, on confirmation, flips `state` (the requested value is always the negation of the current one). |

<!-- @api end -->

`onFuncOn`/`onFuncOff` are transition events rather than a value; each fires with no payload,
once, for the direction the activation moved. There is no `onChange`: read the direction
from which handler fired, not from an event argument.

For **high-impact** toggles (H5) add `confirm`: an activate no longer fires
`onFuncOn`/`onFuncOff` at all, it calls `onRequestChange()` instead (also payload-less;
the requested value is always `!state`), so the host can open an ArenaConfirmDialog and push
`state` itself once the user confirms. **`confirm` alone is what diverts the activation**,
never whether a handler was passed: `confirm` set with no `onRequestChange` is a switch that
does nothing at all. That is the accepted cost of the rule that no render or behaviour follows
from whether a listener is bound, and it is the one worth paying, because what it replaced
applied a guarded change silently. **No runtime guard can catch it**: "is anything listening?"
is precisely the question a component may not ask. The behaviour is pinned, so the fallback
cannot come back unnoticed.

```tsx
const [armed, setArmed] = useState(false);
const [pending, setPending] = useState(false);

<ArenaSwitch label="Automatic deployment to production" state={armed} confirm
  onRequestChange={() => setPending(true)} />

<ArenaConfirmDialog open={pending} title="Enable automatic deployment"
  confirmLabel="Enable" onCancel={() => setPending(false)}
  onConfirm={() => { setArmed(!armed); setPending(false); }}>
  Every approved commit will be deployed to production without manual review.
</ArenaConfirmDialog>
```

`orientation` (`'horizontal'` default | `'vertical'`) lays the track along the other axis,
reach for `vertical` only where the surrounding layout is itself vertical (a narrow
settings rail), never as a decorative variant. `size` (`'sm' | 'md' | 'lg' | 'xl' | '2xl'`,
default `'md'`) scales the track and knob together; `'md'` matches the pre-redesign
component's only size exactly, so an existing call site that names no `size` renders
unchanged.

**Do** own `state` in the parent and push it back from `onFuncOn`/`onFuncOff` (or from
`ArenaConfirmDialog`'s `onConfirm` when `confirm` is set), ArenaSwitch never changes its own value.

```tsx
<ArenaSwitch state={notify} onFuncOn={() => setNotify(true)} onFuncOff={() => setNotify(false)} label="Notify on approval" />
```

**Don't** treat `onFuncOn`/`onFuncOff` as a replacement `onChange(next)`: there is no
payload, and reaching for `e.target.checked` or a boolean argument is reaching for a
member this API does not have.

```tsx
{/* Wrong: there is no event object and no boolean argument to read. */}
<ArenaSwitch state={notify} onFuncOn={(e) => setNotify(e.target.checked)} label="Notify on approval" />
```

**Don't** wire both `confirm` and `onFuncOn`/`onFuncOff` expecting the transition events
to still fire once confirmed, they never do. While `confirm` is set, activation always
routes through `onRequestChange()` alone; flip `state` from wherever the confirmation
resolves (typically `ArenaConfirmDialog`'s `onConfirm`), not from a transition event that
`confirm` suppresses.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
