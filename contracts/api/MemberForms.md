# What a member may be, and how it is written

> **The reference half of the API contract.** [`AGENTS.md`](./AGENTS.md) beside it is the half
> that decides: what the layer is for, what is required, what the gate holds and what it cannot,
> and the audit protocol a component is migrated through. Read that first; this is what you
> consult while writing one.

The split is by audience, exactly as `contracts/design/` splits `TokenTypes.md` out: a reader
deciding whether a member should exist needs the other document, and a reader writing the JSON
needs this one.

## The vocabulary: nine forms

A member of any Arena component's API is exactly one of nine forms, and nothing else.

| Form | What it is |
|---|---|
| **primitive** | `string`, `number` or `boolean` |
| **enum** | a closed, named set of literals |
| **predefined object** | a record of fields, each field itself a primitive, an enum, or an array of one primitive type |
| **array of primitives** | a homogeneous list of one primitive type |
| **array of predefined objects** | a homogeneous list of one predefined object |
| **consumer data** | a homogeneous list, or a single record, whose element type the contract does not describe |
| **functionInput** | a function the consumer supplies, which the component calls and whose result it uses; **input controls only** |
| **slot** | a space the consumer fills; may declare parameters the component lends it |
| **event** | an outbound member: a name plus a declared payload |

Eight of the nine are inbound; **event** is the only outbound one. The two array forms are
encoded as one `form: "array"` discriminated by `of`, which is a representation choice and
not a narrowing of the vocabulary.

**Consumer data is the one form whose contents the contract deliberately does not state.** It is
a record whose keys the *consumer* names: Arena routes it and never inspects it, which is neither
"Arena draws it" (an object) nor "the consumer draws it" (a slot). A table row is the shape it
names: `row[c.key]` indexes the record by a key the consumer chose. It exists because
the other eight cannot express a record whose keys the consumer names; without it such a member
gets modelled badly rather than modelled at all. The form has zero live instances, which
`grep -rn consumerData contracts/api/components/` re-derives. That is a fact about the
vocabulary and not a reason to retire the form.

The form is **narrow on purpose**, and that narrowness is what stops it being the escape R4
closes. It is exactly one spelling, `Record<string, unknown>`; a record of a *known* type is a
predefined object and must be declared as one, and stays an R4 violation. Two mechanical guards
hold it in place: it may not be a field of a predefined object (R1 below), and a member that
takes it in must also declare a route back out. Everything else about it is an authoring rule,
with the same status R2 and R3 carry.

**An inbound function is none of the eight, and `functionInput` is the ninth, for data-entry
controls only.** `event` is the only *outbound* function-shaped member, and it returns nothing. A
member the component *calls* and whose result it uses, a validator or a parser, is inbound and
returns a value, so it is none of the eight, and `classify()` in `scripts/lib/arena/api-surface.ts`
refuses one rather than reading it as an event with the parameter as its payload. Outside a
data-entry control such a member is replaced by data the component renders itself: the charts
declare `valuePrefix` and `valueSuffix`, primitives Arena draws either side of every number,
and `valueFormat`, a predefined object of four primitive fields saying how the number itself is
written, all of it reaching the axis tick, the tooltip and the accessible data table alike. The
substitution is not a consolation prize: it also settles WHERE the formatting happens, which a
caller-supplied function leaves open and which matters here, because the three places have to
agree. A chart declaring a
formatter still fails the gate: the ninth form is for data-entry controls alone, which
`check:api` enforces by rejecting a `functionInput` in any contract not declaring
`"kind": "input"` at top level.

**The ninth form deliberately reverses that refusal, and only for data-entry controls.** A field
that validates or parses its own value genuinely needs a function it can call, and no other form
expresses one: an event is outbound and returns nothing, and a datum cannot decide anything about a
value it has never seen. Forcing every future input, a `NumberField`, a `Combobox`, a
`PasswordField`,
to re-derive whether its inbound function is an event, a datum, or simply deleted is work the
vocabulary absorbs once. Two mechanical guards keep it narrow, and both are enforced by
`check:api` rather than left as authoring rules with R2 and R3's status:

- **It is legal only in a contract declaring `"kind": "input"`** at top level. A `functionInput`
  member anywhere else fails the gate, by name, a chart declaring a formatter included.
- **Its signature is modelled, not free TypeScript.** A `functionInput` declares `params` (a map of
  parameter name → type name) and `returns` (a type name), each a primitive or a type `contracts/api/types/`
  declares. **R4 holds inside the signature**: no `React.*` type in a parameter or in the return,
  and the reader surfaces one as a platform type so the gate reports the rule. The reader reduces
  a `string | null | undefined` return to `string`, the message or none.

```json
"validate": {
  "form": "functionInput",
  "params": { "value": "string" },
  "returns": "string",
  "description": "Called on the field's value; returns the error message, or empty for valid."
}
```

**A return of `React.ReactNode` is not a `functionInput`, and it is not a member at all.**
`(item: T) => React.ReactNode` is React's spelling of a **parameterised slot** (R3): it fills the
interior of an element Arena renders rather than producing a value Arena consumes. The reader
throws on it, and that throw is an **enforcement, not a gap**: the per-item convention below
removes such a member rather than modelling it, so no contract should ever declare one and the
reader is right to refuse every one it meets.

**The reason is Angular, not R3.** R3 permits the shape, since a per-item renderer fills the cell or
row Arena renders rather than replacing it. What refuses it is that **per-item projection has no
Angular answer** short of a structural directive and `ngTemplateOutlet`, a binding no row of the
binding table covers and no reader function reads. Teaching the reader R3 would be **a reader for
a shape no contract may declare**, which is speculative work this layer refuses on principle.
Should a member ever genuinely need a parameterised slot, the reader change is small and the
throw's message is where to start.

**Angular's spelling of a `functionInput` is the bare arrow**, which the reader reads directly:

```ts
readonly validate = input<(value: string) => string>();
```

The optional spelling, `input<((value: string) => string) | undefined>()`, is readable too, since
a nullable annotation is the same annotation. Prefer the bare form regardless: **required-ness is
carried by `.required`, never by a `| undefined` arm.** A member the contract marks required is
`input.required<(value: string) => string>()`; one it does not is the bare `input<…>()`, whose value
is already `undefined` until the consumer supplies one, so the arm adds a second way to say what the
call already says.

No Angular primitive declares a `functionInput`, and the signal idiom discourages a function
input. What the first one to declare one must satisfy is the contract's modelled signature, in
the spelling above.

**The word `prop` does not appear in a contract.** It is React's vocabulary, and a neutral
contract that used it would already have chosen a layer. A contract declares *members*;
each layer binds them in its own idiom.

**Nor does a `description` name a layer**, and that one is machine-checked from an unexpected
direction: `generate:api` copies every description into both layers' own source, so a
description saying what React does and what Angular does lands inside each of them and
`check:layer-independence` fails the layer file. The failure is reported where the copy is
rather than where the prose is, so read it as an instruction about the contract. Say what the
member does and let each layer's idiom go unnamed: "each layer reaches it in its own idiom" is
the whole of what the reader needs.

## The six derived rules

**R1. A predefined object is pure data with known fields.** No functions and no slots
inside it. A field that is a function becomes an **event of the component**, carrying the
object in its payload; a field that is a node becomes a **slot of the component**, or a
primitive if Arena draws it. **A field may be an array of primitives, and may not be an array
of objects**: `ArenaSeries.values` is `number[]`, which is pure data with a known element type
and so is exactly what R1 exists to protect, while an array of objects reopens a nesting depth
the reader has no bottom for. The carve-out is that narrow on purpose, and it does not reach
the three things R1 actually refuses. **And no consumer data inside it either**: an object states its
fields, and consumer data is by construction a record whose fields are unknown, so a declared
type cannot carry an undescribed bag. A per-event `meta` bag on a calendar event is the shape
this refuses, and it is **nothing at all** rather than a member of the component. The per-item
convention leaves such an object no per-item render function, which is the only route by which
a consumer's own record could come back out, and the other mechanical guard on the eighth form
is that a consumer-data member must have a consumer. With no route out it is dead API, so
`ArenaCalendarEvent` declares `id`, `title`, `start`, `end` and `colorId` and nothing else. What a
consumer cannot express through those is recorded in `ArenaCalendar.prompt.md`, not hidden.

**R2. Who draws decides data versus slot.** If Arena draws the content, knowing its
fields and owning its markup, it is an object or an array of objects. If the consumer draws
it, it is a slot. This is an objective test, not a preference, and it has a consequence
the repository already pays for: `check:compliance` can only judge DOM that Arena renders,
so content entering by slot is outside the behaviour contract.

**R3. A parameterised slot fills, never replaces.** A slot may receive data from the
component, but it may only fill the interior of an element Arena renders, never
substitute the element that carries the behaviour contract.

**R4. No platform types and no escapes.** `React.CSSProperties`, the `{...rest}` spread,
`React.Key`, `DOMRect`, `React.MouseEvent` and `React.HTMLInputTypeAttribute` are none of the
nine forms. An Arena enum or an Arena predefined object takes their place, and the rule reaches
*inside* a `functionInput`'s signature too: neither a parameter nor the return may name one.
`Record<string,
unknown>` is not on this list: it is **consumer data**, the eighth form, and
that covers one exact spelling and nothing wider. `Record<string, Widget>` is a
record of a known type, which is a predefined object, and it is an R4 violation.

**R5. No unions between forms.** A member is one form. `(string | ArenaSegmentOption)[]` picks one.

**R6. What a component renders is never derived from whether a listener is bound, or from
whether a slot was filled.** A component that draws a dismiss × only when someone is listening
for the dismissal, or an action button only when a slot has content, has made its rendered
shape depend on a question a platform may be unable to ask: an outbound member's subscriber
list is private in at least one of them, and projected content is not inspectable in at least
one of them. A component that asks it anyway is correct in the layer that can and silently
different in the layer that cannot.

So the answer is a **member**, and it is declared and gated on explicitly. `ArenaAlert.dismissible`,
`ArenaToast.dismissible`, `ArenaTag.removable`, `ArenaBulkActionBar.clearable`, `ArenaTableRow.interactive`,
`ArenaCalendarEvent.interactive`, `ArenaCalendarEvent.actionsEnabled` and `ArenaCalendar.dayInteractive` are the
eight that exist for this reason, and each one's description says so. The cost is stated rather than hidden: a consumer who binds the event and
forgets the boolean gets no control, in every layer alike, which is the point, since the
alternative is *one* layer quietly doing something else.

### The binding table

The gate needs the mapping to be mechanical rather than a matter of taste, so it is
written down here and implemented in `bindingName()` in `scripts/check/arena/check-api.ts`.

| Contract member | React binds it as | Angular binds it as |
|---|---|---|
| primitive, enum, object, array, consumer data, functionInput | a prop of the same name | `input()` of the same name |
| slot named `content` | `children` | a bare `<ng-content />` |
| slot named `x` | a node-valued prop `x` | `<ng-content select="[x]" />` |
| event named `x` | a function prop `onX` | `output()` named `x` |

A component's **default slot**, the one a consumer fills by writing content with no
marker, is the member named `content`. Naming it in the contract rather than leaving it
implicit is what lets the agreement assertion see it: a layer that accepts arbitrary
children without the contract declaring a `content` slot is offering a member no contract
governs.

## Settled conventions

R2 decides data-versus-slot by asking who draws the content, and there are shapes where both
answers are true of two different designs. These are the ones already settled, so a later
contract cites the convention rather than re-deriving it, and a reader of the contracts is
never asked to remember which components are which.

**A single icon is a primitive `string` carrying a Phosphor class name, never a slot.** Arena
draws the `<i class="…">`; the consumer names the glyph. This keeps the glyph inside what
`check:compliance` can judge, keeps the icon inside Arena's own iconography, and, the decisive
reason, lets each layer gate the wrapper on the value's presence. Angular cannot
detect a filled slot without a `contentChild` query on a marker directive, so an icon *slot*
either ships an unconditional zero-area wrapper or costs a directive a consumer must remember
to import. `ArenaAlert` renders it this way in both layers.

**A field inside a predefined object is never a node, and inside an *array* of predefined
objects it can only be a primitive.** R1 offers two remedies for a node-valued field, making it
a slot of the component or making it a primitive Arena draws, and the first is unavailable per
item, because a component-level slot cannot vary across a list. So `ArenaBulkAction.icon`,
`ArenaCommand.icon`, `ArenaActivityItem`'s text fields and `ArenaOnboardingStep.body` are all primitives, and
Arena draws them; a per-item icon is a Phosphor class name, the same answer the convention
above gives for a single one. The consequence is stated rather than hidden: a consumer cannot
place their own markup inside one row of a list Arena renders. The convention is why no feed,
calendar or table declares a per-item render function, and the reason is **not** R3. Such a
function fills the `<li>` or `<td>` Arena renders rather than replacing it, so R3 permits the
shape. What has no answer is Angular: per-item projection needs a
structural directive and `ngTemplateOutlet`, a binding no row of the table above covers and no
reader function reads, and that machinery for one member is the wrong trade.

**The convention holds across the library, and `ArenaTable` is where it charges the most.** The two
commonest things anyone puts in a table cell are an `ArenaBadge` in a status column and an `ArenaButton` in
an actions column, and Arena's own Delivery Console wants both. So the consequence stated above
for a feed row, *a consumer cannot place their own markup inside one row Arena renders*, reads
mildly there and sharply here: **a status column needs a member Arena draws from, and an actions
column has no expression in the contract at all.** That is a real capability loss with a real
user, recorded rather than discovered, and it is the price of one convention holding across the
library instead of `ArenaTable` becoming the exception that reintroduces per-item projection for
everyone.

**Flattening a platform heritage clause enumerates the element, not the platform.** R4 removes
`extends React.ButtonHTMLAttributes<HTMLButtonElement>` and its siblings, and the question that
leaves is which of the members it carried are real API. The answer is the attributes the **HTML
specification defines for that element**: they change what the control is or does, so a contract that
omitted them would be describing a narrower control than the one Arena ships. Global attributes,
ARIA attributes and the generic DOM handlers are not members, because in Angular a consumer writes those on
the host directly, which is the same reason `style` and the `{...rest}` spread are no member
either: a consumer writes them on the `<arena-x>` host, which is the same element the recipe's
`root` classes are bound to, and Angular composes a static attribute with a `[class]` binding
rather than clobbering it. So `<button>` contributes `type`, `disabled`,
`name`, `value`, `autoFocus` and the six `form*` overrides, plus a `click` event; `<span>` and
`<div>` contribute nothing at all, and flattening a component built on one of those adds no member
beyond the `content` slot it already accepted through `children`.

Two consequences are stated rather than hidden. A heritage clause is a **narrower documented claim
sitting on top of a wider real behaviour**, since `{...rest}` forwards any prop the platform will
render, declared or not, so flattening removes capability that is reachable and undocumented, and
the component's `.prompt.md` says which. And there is no type to read it off: `check:react-types`
compiles the layer, but it holds the layer to itself, so the enumeration is transcribed from the
specification and checked by the audit, never resolved by a compiler.

**Two global attributes are members, not one, and both pass the same test.** The rule above
stands for the rest, so `className`, `dir`, `tabIndex`, ARIA and `data-*` are not members, because
in Angular a consumer writes those on the host directly. `id` and `tabStop` each carry a capability
flattening removes rather than a global attribute the host can write elsewhere, and that is
what separates them from every other one.

`id` is a member only where the component generates one. A component that *derives* an id from
another member and wires its own `<label for>` to it has taken that attribute out of the
consumer's hands, and taken with it the only path to an external `<label>`, an
`aria-describedby`, or a form library that needs to address the field by name. `ArenaInput` and
`ArenaTextarea` declare it; the generated value stays the fallback, so the member is `id?: string` and
never required. A component that generates no id has no such gap and adds no such member.

`tabStop` is a member on `ArenaButton` and `ArenaIconButton` because the rule's own justification, that a
consumer writes it on the host directly, does not reach either. Neither has a host a consumer
writes on: both render their own `<button>` inside a host that is `display: contents`, in both
layers, so a `tabindex` written on `<arena-button>` reaches a node that lays nothing out and
takes no focus. The member is how a consumer holds one out of the tab order at all.
And for a component whose focusable element is a **descendant**
of its host rather than the host itself, the justification fails even where a host exists:
`tabindex="-1"` written on `<arena-icon-button>` would land on the custom element, not on the
`<button>` inside it, and the button would stay exactly as reachable as before. That makes
**`tabStop`** a member for exactly these two components, and confirms that `tabIndex` itself
stays off the list above for everyone, these two included, whose member is `tabStop` and never
the attribute. Everywhere else a component's root is its own focusable element and the host
escape genuinely applies. The member is a boolean rather than a raw `tabIndex?: number`: `-1` is the
only value the problem needs, and a numeric member would legalise a positive tab order, which
breaks document order. `true` writes nothing, since a native `<button>` is already reachable;
`false` writes `tabindex="-1"` and leaves the control programmatically focusable.

**A tooltip's bubble is a primitive, not a slot.** The same R2 reasoning the single-icon convention
uses: Arena draws the bubble, the consumer names the text. It also resolves a collision the binding
table creates: a component that declares both a `content` member and children has two candidates for
one default slot, and the trigger is the one that is genuinely projected. The cost is that markup
inside a tooltip stops being possible.

**An event carries exactly one payload, and a platform event is never it.** A handler declaring two
parameters, the item and the DOM event that produced it, is not readable as an event, and
`classify()` refuses it. The resolution holds generally: **the platform
event leaves the payload and the item alone travels**, because a platform event type is an R4
violation inside a payload just as it is anywhere else. What leaves with it is `preventDefault()`,
and the convention below is what hands that back without putting an event in a payload.

**An anchor Arena draws cancels a primary click with no modifier and reports through its own
navigation event.** A click carrying ctrl, meta, shift or alt, a middle click and a context menu
stay the browser's, and nothing is emitted for any of them: the reader asked for a new tab or for
the address, and answering with an in-app route would be the defect the convention exists to
avoid. So a handler that routes fires for exactly the activation it should answer, and the keyboard
agrees with the mouse, because Enter on such a row takes the same path a primary click does. This is
the rule `RouterLink` applies, and it is here for the same reason. Four members carry it:
`ArenaCard.href`, `ArenaCommand.route`, `ArenaCrumb.href` and `ArenaSideNavItem.href`.

**Leaving it to the router instead is not available, and the reason is mechanical rather than
doctrinal.** `RouterLink` decides whether it sits on an anchor by `tagName` and by
`customElements`, so a component that draws its anchor **inside** itself is neither: composed onto
such a host, it ignores every modifier key and lands a second tab stop on the host, over the anchor
already within. That leaves a single-page consumer with no way to use `href` at all, which is the
member unusable in the one kind of application it exists for. A component that renders an anchor is
therefore the one place where Arena's own render, rather than the consumer's composition, has to
answer the question.

**A member offering "a bare value or a described one" picks the described one.** `(string | X)[]` is
an R5 violation and a convenience: the bare string means *value and label are the same*. The array of
predefined objects wins, because it carries strictly more information and the convenience is
expressible at the call site as `{ value: x, label: x }`, while the reverse is not: a stable value
with a translatable label cannot be said at all in the string form. Every call site passes the
object form, and that is the price.

## Contract format

`contracts/api/components/<Component>.json`:

```json
{
  "component": "ArenaBreadcrumbs",
  "description": "A trail of ancestor locations ending at the current one.",
  "api": {
    "items":     { "form": "array",     "of": "ArenaCrumb",  "required": true,
                   "description": "The trail, root first. The last entry is the current location." },
    "separator": { "form": "primitive", "type": "string", "default": "/",
                   "description": "Drawn between crumbs, never before the first." },
    "navigate":  { "form": "event",     "payload": "ArenaCrumb",
                   "description": "A non-current crumb was activated." }
  }
}
```

`form` takes eight values (`primitive`, `enum`, `object`, `array`, `consumerData`,
`functionInput`, `slot`, `event`) and `array` is discriminated by `of`: a primitive type name
(`"string"`) makes it an array of primitives, a declared type name (`"ArenaCrumb"`) makes it an array
of predefined objects, and the form name `"consumerData"` makes it a list of consumer data.

A slot declares its parameters, or none:

```json
"mark":  { "form": "slot" },
"cell":  { "form": "slot", "params": { "value": "string", "row": "consumerData" } }
```

A `functionInput` declares its whole signature, and the contract carrying it declares
`"kind": "input"` at top level, or the gate rejects the member:

```json
{ "component": "ArenaInput", "kind": "input",
  "api": { "validate": { "form": "functionInput", "params": { "value": "string" }, "returns": "string" } } }
```

**Consumer data is spelled by form name in every position, because there is nothing to
declare.** `{"form": "array", "of": "consumerData"}` for a row list, `{"form": "consumerData"}`
for a single record, `"params": { "row": "consumerData" }` for a slot parameter and
`"payload": "consumerData"` for an event. **Nothing is declared in `contracts/api/types/` for it**:
a type there states its fields, and this form's whole content is that its fields are the
consumer's. That is what keeps the directory from filling with fieldless types, and it is why
the `cell` example above names no `ArenaTableRow`. A `ArenaTableRow` cannot be declared, so a
contract naming one is rejected by the very gate this document specifies.

An **optional** member is still a declared member. `required: false` governs whether a
consumer must supply it, never whether a layer must offer it: a layer omitting an optional
member fails the agreement assertion like any other. **There is no exception map.** An API
divergence is a defect; that is the point of this layer.

## Types

Declared once, in `contracts/api/types/`, one file per type:

```json
{ "name": "ArenaCrumb", "kind": "object",
  "description": "One entry in a breadcrumb trail.",
  "fields": { "label": { "form": "primitive", "type": "string", "required": true },
              "href":  { "form": "primitive", "type": "string" } } }
```

```json
{ "name": "ArenaTone", "kind": "enum",
  "description": "What state a value IS in right now.",
  "values": ["neutral", "accent", "gold", "success", "warning", "danger", "info"] }
```

**A closed set of values is not always an enum.** An enum is right when the closed set is
authored in the contract and owned by it, as `ArenaTone` above is, and it is not automatically right
when the set merely restates a value the token layer already derives. The charts' categorical
ramp slot is the case the rule is written from. It is a bounded 1..N whose
bound lives in exactly one authoritative place, `contracts/design/palette.dark.json`'s
`--color-cat-*` ramp, reaching the components as the derived `catSlots` constant in
`Tokens.generated.*`, where `arenaCatColor()`'s `Math.min(ARENA_CAT_SLOTS, …)` clamp enforces it at
runtime on both layers and re-derives itself the day the ramp gains or loses a colour. Modelling
such a set as an enum hand-copies that derived N into a contract as a literal set, and a copy
with **nothing tying it back to the palette** is a stale-assertion surface of exactly the kind
this layer exists to remove.

**So it may be an enum only while something machine-checks the restatement.**
`contracts/api/types/arena-cat-slot.json` declares `ArenaCatSlot = 1 | … | 8`, and `check:script-tokens`
(`catSlotEnumProblems()` in `scripts/check/arena/check-script-tokens.ts`) asserts that set is exactly
1..`catSlots` **in order**: add a ninth colour to the ramp and the gate fails until the
contract type follows. `enumLiteral()` in `generate-api-types.ts` renders a numeric set unquoted,
which is what lets the type render at all.

So the rule survives with its test attached: a closed set that restates a token-derived value
may be an enum **only** while something machine-checks the restatement. `ArenaCatSlot` is the only
type in `contracts/api/types/` that does this, and the assertion is written as that one named case
rather than as a mechanism: a second such type would need its own tie, and whether a general
mechanism is worth building is a question for whoever brings the second one, not a facility
already waiting for it.

A `description` on a type or on one of its fields is carried into the generated modules
as a doc comment, and `generate-api-types.ts` reads `contracts/api/types/` only. Group-level prose is
lost in `contracts/design/`'s generator and that is recorded as debt in `AGENTS.md`; this generator
carries descriptions on every node it emits from `contracts/api/types/`, including type-level ones,
so that hole is not reopened here.

**A member's own `description`, the one written on a contract member in
`contracts/api/components/<Component>.json` as `separator`'s is in the example above, is not one
of those nodes: it is emitted a second way.** `bun run generate:api` writes it into each layer's
own source, as a `/** … */` block above the member it describes, so `tsc` and `ng-packagr` carry
it into what a consumer's editor shows on hover. **That is the only route it has.** A published
package ships no `contracts/` and no `.prompt.md`, by the decision `frameworks/PACKAGING.md`
records, so a description left in the contract alone reaches nobody who installs Arena, and the
member is discoverable only by whoever reads this repository.

`check:api` then holds every block equal to its contract, in both directions: a contracted member
with no doc fails, a doc whose text has drifted fails, and a `/** … */` on something no contract
names fails too. So the copy cannot rot, which is what earns it the one carve-out in the comment
rule `AGENTS.md` states. **Two shapes cannot carry one and are exempt rather than missing:** a
member the contract leaves undescribed, and an Angular slot, which is an `<ng-content>` in a
template with no declaration for a doc to sit above. **The component's `.prompt.md` is still a
third statement and is still held by nobody**: it is prose about how to use a component rather
than a copy of a member's description, which is why it is left to a reader instead of gated.

`bun run generate:api` also emits `frameworks/react/Api.generated.ts` and
`frameworks/angular/Api.generated.ts` from these files. Both carry
the same body; emission is **per layer** so a component's import never crosses the
`contracts/api/` ↔ `frameworks/` boundary, which is the same rule the script-readable token
target holds to, for the same reason.


