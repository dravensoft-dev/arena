The steps of one process and where it stands: a numbered list whose markers say which steps are done, which one is current and which lie ahead. A wizard's progress strip, an onboarding checklist and an order's checkout are steppers.

```tsx
<ArenaStepper ariaLabel="Checkout" steps={steps} index={at} interactive onValueChange={setAt} />
<ArenaStepper ariaLabel="Account setup" steps={setup} index={2} className="arena-orientation-vertical" />
```

<!-- @api GENERATED from contracts/api/components/ArenaStepper.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `ariaLabel*` | primitive | `string` |  | Names the list: which process this is the progress of, such as Checkout, never Steps. Required, and guarded at runtime after trimming: two steppers on one page are indistinguishable otherwise. |
| `steps*` | array | `readonly ArenaStepperStep[]` |  | The process, in order. Arena draws each step from its fields; an empty list draws nothing. |
| `index` | primitive | `number` | `0` | Which step is current, counted from zero. The steps before it are complete and the ones after it upcoming. A value at or past the number of steps marks every step complete, and a negative or non-finite one reads as 0. |
| `interactive` | primitive | `boolean` | `false` | Whether the steps behind the current one can be chosen. Only those steps become buttons: the current step and every step ahead stay text, so a reader never meets a dead control. |
| `onChange` | event | `number` |  | A step behind the current one was chosen; carries its index, counted from zero. Never fires while `interactive` is false, nor for the current step or a later one. The host owns `index` and moves it. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`orientation`](../../../../VOCABULARY.md#orientation): `arena-orientation-horizontal` (default), `arena-orientation-vertical`. Write one as `className="arena-orientation-vertical"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**The state comes from `index`, and a step only adds `error`.** The steps before `index` are complete, the step at it is current and the rest are upcoming. An `index` at or past the end completes the whole process. A step with `error: true` draws a danger outline and a warning glyph wherever it sits.

**Every state is a word as well as a mark.** A reader hears Completed, Current step or Upcoming before each label, and Error after it on a step that needs attention. The words come from the locale, and the marker is never the only carrier.

**Going back is the only move a press makes.** With `interactive`, each step behind the current one becomes a button whose press reports its index through `onValueChange`. The current step and the steps ahead stay text, so forward travel stays your own Next button.

**Do / Don't**
- Do name the process in `ariaLabel`, such as Checkout. A blank name throws, and Steps tells a reader nothing.
- Do switch to `arena-orientation-vertical` when the steps outgrow a phone's width. The stepper never switches by itself.
- Don't keep the step's content here. The form, the validation and the Next button are yours.
- Don't add a per-step state, and don't colour a marker yourself. The stepper derives both.
- Don't let a user jump ahead. A step ahead is never a button.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/react/components/navigation/arena-stepper/ArenaStepper.demo.generated.html`:
- At 390px, four steps across keep their markers on one line and wrap their labels under them.
- The vertical connector runs from each marker's centre to the next marker.
- Under `arena-comfortable`, a step you can go back to is at least 44px tall.
- A screen reader reads the list's name, then each step's state word before its label.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
