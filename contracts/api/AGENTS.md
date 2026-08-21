# Arena API capability contracts

> **For whoever adds or changes a component contract.** Using a component instead? Start at
> [`frameworks/INDEX.md`](../../frameworks/INDEX.md), then your layer's index beside it, and how to use one is its own
> `.prompt.md`, which states every member this directory declares. None of that needs this document.

Arena states three contracts. `contracts/design/` is the normative source for design values.
`contracts/behaviour/` states what a kind of component must do. This directory holds the
third: **the API capability contract**, one neutral statement per
component of the members its API presents, which every layer implementing that
component implements exactly.

It is orthogonal to the other two. A green `check:api` says the surface matches. It says
nothing about what the component does with it, exactly as `check:behaviour` is a
coverage claim and never an accessibility one.

Read this before adding a platform target, the way `contracts/design/AGENTS.md` is read
before adding one to the token layer.

**[`MemberForms.md`](./MemberForms.md) beside it is the other half, and the split is by
audience.** This page decides: whether a member should exist, what required means, what the gate
holds and what it cannot, and the protocol a component is migrated through. That one is what you
consult while writing the JSON: the nine forms, the six derived rules **R1** to **R6** that this
page cites by name throughout, the binding table each layer follows, the settled conventions a
later contract cites rather than re-deriving, and the file format. Neither is a summary of the
other, and a member is decided here and written there.

## The other two contracts are firm; this layer is additive

Arena's other two contracts are settled and **not reopened by this one**.
The **token** contract (`contracts/design/`) is the design-value layer. The **behaviour** contract
(`contracts/behaviour/`) states what each kind of component must do, adopted from the WAI-ARIA
Authoring Practices Guide and, where APG has no page, from the ARIA 1.2 role reference or WCAG.
The API capability layer is **orthogonal and additive**: bringing a
component under contract may not weaken, remove, or contradict its behaviour binding or the
tokens it renders from. Neither of the other two layers changes to accommodate an API contract.

When an API reshape appears to require dropping or changing something a behaviour binding depends
on, **the reshape is what is wrong, not the binding.** `ArenaConfirmDialog` is the worked example:
its `cancel` event is how the (accessible, Angular) dialog reports an Escape-key or Cancel-button
dismissal, which the `dialog-modal` pattern requires. A contract that omitted `cancel` to look
tidier would leave the Escape handler with nothing to emit and silently void that
requirement. The member stays because the behaviour contract is firm. An API decision is correct
only if every behaviour binding it touches, and every design token it renders from, remains
exactly as true afterward as before.

## What the contract governs, and what it does not

The contract governs the **member surface** (its name, its form, its type, its
required-ness) and not the syntax by which a platform expresses it. A slot named `mark`
is one member; React binds it to a node-valued prop, Angular to
`<ng-content select="[mark]">`. That is the same contract in two idioms, and it is not a
divergence. React has no content-projection syntax and Angular has no node-valued input;
demanding identical call-site syntax would demand something neither platform can give.

This is the line that makes "zero API divergences" achievable rather than rhetorical:
identical members, idiomatic binding.

### A member a platform cannot express at all

"Idiomatic binding" answers a platform that spells a member differently. It does not answer one
that cannot spell it, and a platform target arriving here needs that answer before it writes
anything: a hole a reader falls into is worse than a rule they disagree with.

**The neutral contract stays neutral and gains nothing.** A member is not annotated with the
platforms that can take it, because a platform column here would make every contract a list of
targets and would put the question in the one file that exists to be free of them. **A layer that
cannot bind a member declares that in its own binding, with its reason**, which is the shape
`contracts/behaviour/` already found: `absent.json` exists so that a layer lacking a component
records an absence rather than being silently uncovered.

Two guards travel with the rule. **A member is unexpressible only when no idiom in that platform
binds it**, never when binding it is merely inconvenient or unidiomatic; the bar is the one the
`mark` slot sets, where two platforms with nothing in common syntactically both answer. And **a
declaration may not weaken a behaviour binding**, which is this level's additivity rule applied to
its own escape hatch: a member dropped because it is hard to express, whose absence voids a
requirement, is the reshape being wrong rather than the platform being limited.

**The mechanism lands with its first user and not before.** Both layers here express every member
they are given, so `check:api` carries no exception map at all today, and a declaration key with no
declaration would be a gate with no subject, which this repository fails rather than passes.

What the audit already settles, so the first target does not re-derive it: `href` is expressible
everywhere, because a native layer binds it to a navigation intent and only the modifier-key
affordances centralised in `AnchorActivation` are about an address bar and browser tabs.
`ArenaInputType`'s date and time steps are expressible and better, since both platforms ship a
picker where the web borrows one. The genuinely unexpressible set is the form-association members
on the two buttons, `type`, `form`, `name`, `value` and `autoFocus`, which exist because an HTML
form submits itself and nothing native does.

### An imperative handle is not a member, and the gate is what keeps it rare

**None of the nine forms is imperative**, and that is a property of what a contract can state
rather than an omission: every form is a value that flows in or a report that flows out, and a
method the consumer calls at a moment of their own choosing is neither. So a component that
needs one exposes it on the class in each layer, documented in that layer's `AGENTS.md`, and it
appears in no contract.

It is not free. `check:api` reads a layer's class and refuses any public member it cannot
recognise, so an imperative handle exists only by being named in `IMPERATIVE_HANDLES`
(`scripts/lib/arena/api-surface.ts`), keyed by component and method, with its reason as the
value, and asserted by literal value in that file's own suite. Any other public method on any
component fails the gate as an undeclared surface.

**Ask first whether the answer is a member.** `ArenaInput.focus()` earns its place because returning
focus to a field after the transaction it belongs to is settled is a gesture no declarative
member expresses: `autoFocus` fires once at mount and the caller needs it again on every
completion. A handle that could have been a boolean is a boolean.

### Required-ness is contracted too, with a carve-out

`required` is not only wording for a missing-member message: the contract's `required`
value is compared against each layer's, and a layer that implements a member as more or
less required than the contract says is reported like any other divergence. This holds
for the six inbound non-slot forms: **primitive**, **enum**, **object**, **array**,
**consumer data** and **functionInput**.

It does not hold for **slot** or **event**, and that is a statement about what the two
platforms can express, not an exception written to excuse a divergence. A **slot's**
required-ness is not comparable because React can express one (a `children` prop with no
`?`) but Angular cannot: `<ng-content>` has no syntax to declare projected content
mandatory, so the reader always reports a template slot as `required: false`. Comparing it
would fail every contract that declares a required slot against Angular forever, for a
platform syntax limit rather than a real divergence. An **event's** required-ness is not
comparable because the concept does not apply to either platform: an outbound member is
never "required", since a consumer is always free not to listen, and neither React's optional
function prop nor Angular's `output()` has a notion of a mandatory listener.

**A required name is refused when it is blank after trimming.** `ArenaTable.label`,
`ArenaSegmentedControl.ariaLabel` and the rest of the members only a human can supply are guarded at
runtime, and the value the guard exists to catch is not `undefined`, which the type already
catches, but a present-and-useless one. A name of nothing but spaces satisfies a
falsiness test and names nothing, so the guard trims before it decides, in every layer.

**Required-ness governs the implementation and the runtime.** `check:api` proves both layers
*declare* a member identically required, which is the implementation half. The
contract's `required` also governs **runtime**: the implementing component must enforce it,
failing hard when a required member is absent rather than rendering with a missing value.
Angular's `input.required` throws by construction; React throws from its render for the same
reason (`ArenaAppLogo`, `ArenaStatCard` and `ArenaBreadcrumbs` all do), so an absent required member fails
identically on both layers, and a consumer honouring the declared type reaches neither path.
Like R2 and R3, the runtime half is an **authoring rule the audit applies, not a gate check**:
`check:api` reads only the declared surface (React's `.tsx` interface, Angular's `input.required`), never
the render, so it cannot see whether a component actually throws. The audit protocol is what
enforces that it does.

### Affordances are contracted, and they are not members

Every component contract carries an `affordances` array beside `api`, from the closed set
`hover`, `focus` and `press`. It names the pointer, focus and activation states **the
component's own render reacts to**: a button that tints under the pointer declares `hover`; a
field that shows a ring when focus lands in it declares `focus`; a control that compresses under
the press, or a chart that reveals a reading on a tap, declares `press`. An empty array is the
answer for a component that presents none of them, and the key is **mandatory** so that an
absence can never be read as "not stated yet".

**`press` is the one of the three that a touch device has**, which is why it is named rather than
folded into `hover`. A phone never hovers, so a component declaring `hover` alone declares that it
reacts to nothing a thumb can do, and that is a statement about the component rather than about
the browser reading it. The value tier answered the press before the contract did:
`contracts/design/roles.json` carries `press-scale` and `lift-control`, and argues under
`fill-hover` that a press "reads as the control's own motion" while a hover "is the surface
answering".

It is not a member, and it is here anyway, because the question is neutral and every layer
needs the same answer to it. Neither of the other two contracts can hold it: `behaviour/` is
one file per **pattern** rather than per component, and a hover state is not an ARIA
requirement; `design/` holds values. A component's affordances are a decision about the
component, which is what this directory states.

**What a layer may not do is invent one.** `check:states` reads this declaration and nothing
else, in two one-way halves: a Tailwind manifest slot carrying a `hover:`, `focus:` or
`active:` modifier no covered contract declares is invented, and a React component implementing
a state its contract does not declare is invented. Neither half reads the other layer. Neither runs the
other way, because a declared affordance a layer does not implement itself may be the child it
composes: `ArenaConfirmDialog` declares `focus` for its own input and renders Arena `ArenaButton`s for
the rest, and a manifest, which has no composition and types those buttons out as its own
slots, is licensed for `hover` by `ArenaButton`'s declaration through the gate's `MANIFEST_COVERS`.

**Angular is structurally unaskable here**, and that is worth stating so nobody adds a third
half: an Angular primitive realises an affordance by rendering the class the manifest compiles to, so
asking the layer would be asking the manifest.

### Re-exporting a shared type from React's source

A React component's `.tsx` imports its enum and object types from
`../../api.generated`, and **re-exports exactly the names a consumer can already
import from that component**, no more and no less. A type a component's own file
names and exports (`ArenaStatCard`'s `ArenaStatDelta`, `ArenaBreadcrumbs`'s `ArenaCrumb`) keeps a
consumer's `import type { ArenaStatDelta } from '.../ArenaStatCard'` resolving only while the
file re-exports it, so it does (`export type { ArenaStatDelta };`). A type spelled inline
as a literal union at its use site (`ArenaAppLogo`'s `size?: 'sm' | 'md' | 'lg' | 'xl'`,
`ArenaStatCard`'s `tone?: 'neutral' | 'accent' | …'`) offers a consumer no name to import,
so nothing is re-exported for it, and `ArenaLogoSize` and `ArenaTone` stay un-re-exported for
exactly that reason. This is a compatibility rule rather than a design principle: it
exists only so a consumer's import keeps resolving, and it is mechanical, since what a
file re-exports is decided by what it names. Angular has no equivalent question,
because a component's own file imports straight from `../../api.generated` and
declares nothing locally to preserve.

**One deliberate exception: the rule drops when the name is not a type at all.**
`ArenaSideNavItem` is a component, not a predefined object type, and a file
cannot both import a type called `ArenaSideNavItem` and export a component called
`ArenaSideNavItem`, since one name cannot mean both. `ArenaSideNav.tsx` therefore carries no
re-export rather than resolving the collision.

## What the gate asserts, and what it cannot

`bun run check:api` makes six assertions: coverage, form, agreement, the derived rules,
generated drift, and that every member's description reached both layers' own source. See `scripts/check/arena/check-api.ts`.

**Three of the six derived rules are authoring rules the audit applies, and no gate asserts
them.** R2, "who draws it", is a fact about intent and markup ownership rather than about
a declaration, so a contract naming a slot for content Arena draws passes. R3, whether a
parameterised slot fills a cell or replaces a row, is a fact about the rendered tree;
`check:compliance` is the only layer that sees a rendered tree, and it does not read
contracts. R6, whether a render is derived from a bound listener, is a fact about the
implementation's control flow, and a declared boolean looks identical to a gate whether or
not the component actually gates on it.

**One thing sits outside the gate's reach rather than outside machine-checking:** `default` is
part of the contract format and is read by nothing on its own. The comparison also refuses one
direction on purpose, since a contract default with no destructuring default is **not** reported,
because the default may legitimately be applied downstream, and a source-reading gate cannot see
that. React's surface is read from both files, so a restored `{...rest}` spread in the `.tsx`
fails and a `spec.default` the implementation contradicts fails with it.

R1, R4 and R5 *are* asserted: R1 by the type schema (a field may only be a primitive or an
enum), R4 by the reader recognising platform types by name and reporting them, R5 by a
member carrying exactly one `form` and by the reader classifying a mixed union as a union
rather than as any single form.

**An event's `payload` resolves as one of exactly four things, and stating it as four
rather than as "a declared type" is the point.** `validateContract` accepts a payload that
is (1) a primitive type name, `"string"`, `"number"` or `"boolean"`; (2) the form name
`"consumerData"`; (3) the name of an **object** `contracts/api/types/` declares; or (4) the name of an
**enum** `contracts/api/types/` declares. Anything else is reported: a name `contracts/api/types/` does not
declare at all, and an object name used where the fourth arm does not apply. The four exist
because `classify()` produces all four from a real signature. It reduces
`(v: string) => void`, `(v: ArenaCrumb) => void` and `(v: ArenaLogoSize) => void` alike, so a contract
stating only some of them would be a gap between what the reader reads and what the
contract can say, rather than a rule the contract enforces.

### What is mechanical about the ninth form

All three of its guarantees are, which is what separates it from R2 and R3 and from the eighth
form's authoring rules:

- **The `kind: "input"` guard.** `validateContract` rejects a `functionInput` in a contract that
  does not declare itself an input control, naming the member. "Input controls only" is a checked
  restriction, not a convention.
- **The signature's types.** Every name in `params` and the `returns` name must be a primitive or
  a type `contracts/api/types/` declares, resolved exactly as an object member's enum type is, so **R4
  holds inside the signature**, and a `functionInput` with no `returns` at all is reported rather
  than admitted as half a model.
- **The signature is compared, not only declared.** `compareSurface` matches each layer's
  parameter map and return against the contract's, key by key and in both directions. A layer
  whose validator takes a `number` where the contract says `string` is a divergence like any
  other; matching on form alone would leave the modelled signature as documentation nothing
  reads, which is exactly the hole `default` has.

What stays outside: the reader refuses a return of `React.ReactNode` rather than classifying it,
because that shape is a **parameterised slot (R3)** and not a value the component consumes. So a
render prop cannot reach a contract through this form, and R3's own unverifiability is not widened
by it.

### What is mechanical about consumer data, and what is not

Exactly two things are checked, and they are the two that keep the eighth form from becoming
the escape R4 closed:

- **The R1 style plugin.** A predefined object may not carry a consumer-data field.
  `validateTypes` reports one by type and field name.
- **A consumer-data member must have a consumer.** A contract that takes consumer data in and
  declares no route back out, with no slot parameter and no event payload of `consumerData`, is
  holding data Arena may never inspect and can never hand back, which is dead API.
  `validateContract` reports each held member by name.

Everything else about the form is an **authoring rule with the same status R2 and R3 carry**.
Nothing checks that a member spelled as consumer data is genuinely the consumer's data rather
than a shape someone declined to model. The reader's narrowness, one exact spelling and a
record of a known type reported under R4, is what makes that judgement hard to reach by
accident, rather than a gate that catches it.

And the form is a **deliberate blind spot, which is worth naming rather than discovering.** The
value of this layer is that a member's type is knowable; this one's is not, by construction. So
content derived from consumer data reaches the DOM through a slot, and R2's consequence applies
to it in full: `check:compliance` judges only the DOM Arena renders, so whatever a consumer
draws from their own row is outside the behaviour contract as well as outside this one. A
component contracted with consumer data is contracted with a hole in it, on purpose, and both
gates are silent about the same hole.

## The audit protocol

A component is not migrated by inference. For each one, the following is presented in a
single exchange, and the decision is the maintainer's:

1. its current API in every layer that implements it;
2. which member breaks which rule, cited to the rule;
3. two or three concrete reshapes, each with its cost.

This is the explicit remedy for a failure this repository has already paid for:
`ArenaStatCard` became an object in React and three flat inputs in Angular because each layer
answered the question separately and each answer was defensible on its own terms. A
contract written by whoever migrates the component reproduces exactly that.

Only after the decision: write the contract, migrate every layer, update the tests,
manifests and demos that follow, and run the gates.

### What happens to a divergence the contract settles

A difference between the layers that is **entirely** an API difference stops existing the moment
the component comes under contract: the contract is the single statement of the members, and there
is nowhere for a second opinion to live. Nothing is migrated: the record is deleted, because there
is no divergence left to record.

What survives a contract is the rest: which element a layer renders, how a compound family
coordinates, what an idiom forces. That belongs in the component's own `.prompt.md` in each layer,
beside the source it describes, where a reader of that component meets it.
