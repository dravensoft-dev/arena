Arena guided tour. A coachmark with progress dots, Skip and Next, floating bottom-right
over an unblurred scrim, a tour that blurs the product it is touring defeats itself.
It is controlled: the host owns `index` and answers `next`, `back`, `skip` and `done`.
Clicking the scrim reports `skip`. It is a real modal, binding `dialog-modal`:
focus moves into the panel when the tour opens and returns to whatever opened it when the
tour closes, Tab and Shift+Tab cycle inside the panel, and Escape reports `skip`.

```html
<arena-onboarding [open]="touring()" [steps]="steps" [index]="step()"
                  [anchor]="target()?.getBoundingClientRect()"
                  (next)="step.set(step() + 1)" (back)="step.set(step() - 1)"
                  (skip)="touring.set(false)" (done)="finish()" />
```

<!-- @api GENERATED from contracts/api/components/ArenaOnboarding.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the tour is shown. Closed renders nothing, scrim included. |
| `steps*` | array | `readonly ArenaOnboardingStep[]` |  | The tour, in order. An empty tour renders nothing. |
| `index` | primitive | `number` | `0` | Which step is current. The host owns it and answers next/back. |
| `anchor` | object | `ArenaOnboardingAnchor` |  | Where to attach the coachmark, as the two viewport coordinates it positions from. Absent floats it bottom-right. |
| `next` | event |  |  | Next was activated on a step that is not the last. |
| `back` | event |  |  | Back was activated on a step that is not the first. |
| `skip` | event |  |  | Skip was activated, or the scrim was clicked. |
| `done` | event |  |  | The final step's confirming control was activated. |

<!-- @api end -->

**Do / Don't**
- Keep a tour to three or four steps. The dots are a promise about how long this will
  take, and a tour that breaks that promise gets skipped.
- Pass `anchor` (an `ArenaOnboardingAnchor`, `{ left, bottom }`; a `getBoundingClientRect()`
  result satisfies it directly) when a step must point at a specific control; the
  coachmark clamps itself inside the viewport. Without it, it floats bottom-right.
- Handle `skip` as a real dismissal: Escape reports it too, on every step including the
  last one, where the Skip button itself is not rendered. Escape is how a user leaves,
  not how they finish, so it never reports `done`.
- Don't put anything in a tour that the interface should have made obvious. A
  coachmark explaining a confusing control is a bug report with a nicer border.
- Don't express a condition as an attribute string. `open` carries the
  `booleanAttribute` transform, so a bare `open` and `[open]="true"` both
  mean true, and the one literal string `"false"` means false. Every *other* string is
  true, `"0"`, `"off"` and `"no"` all leave the tour open. Bind the expression
  (`[open]="touring()"`) rather than relying on the literal.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
