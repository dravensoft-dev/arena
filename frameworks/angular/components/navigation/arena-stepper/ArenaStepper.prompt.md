Arena stepper, the steps of one process and where it stands. Standalone, `OnPush`, signal I/O. The host stays out of layout, and the real `<ol>` inside it carries the list. Each marker shows whether its step is done, current or still ahead.

```html
<arena-stepper ariaLabel="Checkout" [steps]="steps" [index]="at()" interactive (valueChange)="at.set($event)" />
<arena-stepper ariaLabel="Account setup" [steps]="setup" [index]="2" class="arena-orientation-vertical" />
```

<!-- @api GENERATED from contracts/api/components/ArenaStepper.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `ariaLabel*` | primitive | `string` |  | Names the list: which process this is the progress of, such as Checkout, never Steps. Required, and guarded at runtime after trimming: two steppers on one page are indistinguishable otherwise. |
| `steps*` | array | `readonly ArenaStepperStep[]` |  | The process, in order. Arena draws each step from its fields; an empty list draws nothing. |
| `index` | primitive | `number` | `0` | Which step is current, counted from zero. The steps before it are complete and the ones after it upcoming. A value at or past the number of steps marks every step complete, and a negative or non-finite one reads as 0. |
| `interactive` | primitive | `boolean` | `false` | Whether the steps behind the current one can be chosen. Only those steps become buttons: the current step and every step ahead stay text, so a reader never meets a dead control. |
| `valueChange` | event | `number` |  | A step behind the current one was chosen; carries its index, counted from zero. Never fires while `interactive` is false, nor for the current step or a later one. The host owns `index` and moves it. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`orientation`](../../../../VOCABULARY.md#orientation): `arena-orientation-horizontal` (default), `arena-orientation-vertical`. Write one as `class="arena-orientation-vertical"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**`index` decides every state, and `error` is the one fact a step adds.** Steps before the index read as complete, the step at the index is current, and later steps are upcoming. An index past the last step means the process is finished. A step marked `error: true` keeps its position and gains a danger outline and a warning glyph.

**No state rides on colour alone.** Each step speaks Completed, Current step or Upcoming ahead of its label, and a step in error adds Error. All four words come from `ARENA_LOCALE`.

**A press can only go back.** Set `interactive` and the steps behind the current one become buttons, each emitting its own index through `valueChange`. Moving forward stays with your own Next button, since the current step and the later ones are plain text.

**Do / Don't**
- Do pass `ariaLabel` naming the process, such as Account setup. A blank value throws, and Steps names nothing.
- Do write `class="arena-orientation-vertical"` once a phone cannot hold the steps across. The orientation never flips by itself.
- Don't host the step's form inside the stepper. The content, its checks and the Next button stay in your page.
- Don't hand the stepper a state per step or a colour per marker. The stepper works out both from `index`.
- Don't make the later steps reachable. A step ahead never becomes a button.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/navigation/arena-stepper/ArenaStepper.demo.generated.html`:
- At 390px, four steps across keep their markers in one row while the labels wrap below.
- Down the side, each connector leaves one marker's centre and stops short of the next.
- Under `arena-comfortable`, a step you can return to measures 44px or more.
- A screen reader announces the list name, and then each state word ahead of its label.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
