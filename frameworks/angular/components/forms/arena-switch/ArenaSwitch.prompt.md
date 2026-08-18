Arena switch, an on/off setting that takes effect immediately, not a pending form value.
Standalone, `OnPush`, signal I/O. The host binds the root slot, so `<arena-switch>` is itself
the flex row its parent lays out. The control
is a real `<button type="button" role="switch">`: the platform supplies activation, the role
supplies the state.

```html
<arena-switch label="Auto-deploy on merge" [state]="auto()"
              (funcOn)="auto.set(true)" (funcOff)="auto.set(false)" />

<arena-switch label="Dark theme" [state]="dark()" iconOn="ph-bold ph-moon" iconOff="ph-bold ph-sun"
              (funcOn)="dark.set(true)" (funcOff)="dark.set(false)" />

<arena-switch label="Allow force pushes" confirm [state]="force()"
              (requestChange)="askThenApply()" />

<arena-switch label="Managed by policy" state disabled />
<arena-switch label="Compact rows" size="sm" orientation="vertical" [state]="compact()" />
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
| `funcOn` | event |  |  | The switch was turned on. |
| `funcOff` | event |  |  | The switch was turned off. |
| `requestChange` | event |  |  | A change was requested while `confirm` is set: the host opens an ArenaConfirmDialog and, on confirmation, flips `state` (the requested value is always the negation of the current one). |

<!-- @api end -->

**Do / Don't**
- It is **controlled**. `state` is what the consumer owns; the component holds no copy, so a
  `funcOn` you ignore is a switch that visibly does not move.
- **`label` is required** and is the accessible name, the `aria-label` on the control and the
  text beside it. There is no unlabelled shape, which is why the input has no default.
- The events are three, and they are directional rather than a single toggle: `funcOn` and
  `funcOff` say which way it went, so a handler needs no copy of the old value to read.
- `confirm` **replaces** the two: nothing is applied, `requestChange` fires instead, and the host
  opens an `ArenaConfirmDialog` and sets `state` itself on confirmation. The requested value is always
  the negation of the current one, so the event carries no payload.
- **`confirm` alone diverts the activation**, never whether anything is listening.
  `confirm` set with no `(requestChange)` binding is a switch that
  does nothing at all. That is the accepted cost of that rule and the one worth paying, because what
  it replaced applied a guarded change silently. **No runtime guard can catch it**: "is anything
  subscribed?" is precisely the question Arena never asks, because at least one framework cannot answer it. The behaviour is
  pinned, so the fallback cannot come back unnoticed.
- `iconOn` and `iconOff` are Phosphor class-name strings drawn inside the knob, and only the
  current state's glyph is in the DOM. They are decoration; the knob is `aria-hidden`, and
  `aria-checked` is what carries the state.
- Use a switch for an immediate effect and `<arena-checkbox>` for a pending form value. A switch
  inside a form that only applies on submit is the wrong control.
- `orientation="vertical"` transposes the track. It exists for a dense sidebar; in a form row it
  reads as a mistake.
- Don't disable a switch to mean "you may not change this yet". A disabled switch is unreachable
  by Tab and announces no reason; `confirm` is the affordance for a change that needs a gate.

**By hand, in real Chromium**: none of these is provable in happy-dom. Run `bun run demos` and
open `/frameworks/angular/components/forms/arena-switch/ArenaSwitch.demo.generated.html`:
- The knob **slides** across the track over `--dur-state`/`--ease-state` rather than jumping, and
  the track's
  colour crossfades with it.
- Under `prefers-reduced-motion: reduce`, forced in DevTools' Rendering pane, **the knob stops
  travelling and the track colour still crossfades**. That is the intended answer for a state
  change: the travel is decorative and the colour is the report. `motion-reduce:transition-none`
  on the `knob` slot is what does it.
- At every size the knob clears the track's padding on both ends, and the vertical transpose
  travels down rather than across.
- The glyph is legible inside the knob at `sm`, which is the size that decides whether per-state
  icons are usable at all.
- Clicking the label toggles; clicking the label of a disabled switch does not.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
