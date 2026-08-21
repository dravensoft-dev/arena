# Arena behaviour contracts

> **For whoever writes or binds a behaviour pattern.** Using a component instead? What it must do is `contracts/behaviour/<pattern>.json` and
> its own `<Name>.behaviour.json`, both of which read alone.

**Arriving with a bug report rather than a change?** What the gate asserts is Bindings; what a
green run does NOT claim is the section on the four structural limits, and the fourth of them is
the one that answers a keyboard or focus defect that every gate is currently happy with. **When
the pattern and both bindings turn out to be right and one layer alone is wrong**, the defect is
that layer's rather than this level's, and it is answered through
[`frameworks/AGENTS.md`](https://github.com/dravensoft-dev/arena/blob/main/frameworks/AGENTS.md),
named by URL because this page is served on the site and that one is not.

`contracts/design/` answers *what is this value*. This directory answers *what must this
component do*: which roles it carries, which keys it answers, where focus goes,
what dismisses it.

It is a level under `contracts/`, beside `contracts/api/`, rather than a corner of the
design one, and deliberately so. A contract is not a value: DTCG models colours,
dimensions and durations, and does not model "Escape closes this". Putting a
pattern under `contracts/design/` would mean relaxing `scripts/check/core/check-dtcg.ts`, which
is one of the cleanest gates in the repo.

## Patterns

One file per pattern in this directory, each citing the source it was adopted
from. Most cite an actual [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/)
page. Count them rather than trusting a figure here, which moves whenever a
pattern is added (`ls *.json | wc -l` for the total, run from this
directory, and `grep -l 'apg/' *.json | wc -l` for the APG-derived share; note
`navigation` cites an APG *practices* page rather than a *patterns* one, so a
grep on `apg/patterns` alone undercounts by one). The exceptions are not a fixed
list and must not be written as one: `progressbar`, `status` and `textbox` cite
the ARIA 1.2 role reference instead, because APG has no pattern page for any of
those roles; `figure-with-data-table` cites WCAG because APG has no chart
pattern; `none` and `absent` cite nothing, because there is nothing to adopt
from when the claim is that no pattern applies. See below for why those two are
two patterns and not one.

**A pattern requiring `roles.element` also names that role as a field of its own**, `element`,
beside the requires map. The requirement's value is prose a person reads, and six of them wrap
the role in HTML guidance about when `<header>` or `<nav>` cannot be used; a target reading this
directory with no browser behind it has to apply the role and has no way to parse it back out of
that sentence. `validatePattern` holds the field and the prose to each other, so neither moves
alone, and `behaviour-compliance.ts` reads the field rather than restating it.

**That set is machine-checked**, which is what makes it safe to name here at
all: `none aside, exactly the patterns with no APG pattern page cite something
else`, in `scripts/lib/arena/behaviour-contracts.test.ts`, asserts it by literal value.
Adding a pattern that cites anything but an APG *patterns* page fails that test
until the list follows, so the test is the authority and this paragraph is the
explanation.

`none` and `absent` look alike, since both cite nothing and both require nothing, but they
answer different questions, and one pattern for both answers is a defect rather than a
simplification. `none` binds a component that **renders**: it exists, a user can see it, and it
simply offers no interactive affordance, or offers one the platform already names: a bordered
surface with nothing to act on binds it, and so does a case that renders a real `<a href>`,
because there is no link pattern to bind and naming another role would take the anchor's own
away. `absent` binds the fact that **no such component exists in this
layer at all**. Nothing binds it today, because every component exists in both layers, which is
exactly why the pattern has to stay: the next component one layer lands first has somewhere
to record itself. One pattern carrying both facts leaves them
distinguishable only by reading the binding's prose `reason` rather than by anything
a tool can check, which is the same "no entry means either verified-equivalent or nobody
looked" ambiguity this whole layer exists to end, one level down. Use `none` for a
real, inert surface; use `absent` when the other layer has nothing to bind at all.

`requires` is a flat map of dotted keys. That shape is load-bearing: an exception
in a binding names exactly one requirement, so one exception cannot quietly excuse
three.

## Bindings

Every component declares, in every layer, beside its own source:

- React: `frameworks/react/components/<category>/<component-kebab>/<Name>.behaviour.json`
- Angular: `frameworks/angular/components/<category>/<component-kebab>/<Component>.behaviour.json`
- Angular, absent: one entry in `frameworks/angular/BehaviourDelegated.json`,
  because a component the layer does not have has no directory to sit beside. That
  file does not exist today; `check:behaviour` reads it only when present, and names
  any React component the Angular layer lacks and has not recorded there.

A binding names a pattern and lists the requirements the component does not yet
meet, each with a reason. `bun run check:behaviour` asserts that every component
declares, that every named pattern and requirement exists, and that the two layers
agree or the difference is written down.

**An Angular binding carries one more key than a React one, and it is required.** `component`
names the React counterpart, because an Angular directory is kebab and its file is the Angular
class, so nothing in the path says which React component this is the twin of. Three readers
depend on it: `validateBinding` rejects an Angular binding that omits it, `check:behaviour`
rejects one naming a React component that does not exist, which is what catches both a typo and
a React component that was dropped, and the coverage record behind `check:compliance` keys its
Angular half by that name, so the pairing is what makes the two layers comparable at all. A
React binding may carry the key; nothing reads it there, because the React name is the pairing.

### Flat bindings and cased bindings

A binding describes a component; a render suite judges one render of it. A
component that renders differently depending on its own props, as `ArenaAlert` does by
rendering `role="alert"` for a `danger` tone and `role="status"` for any other,
is several renders, and no single flat exception list is correct for all of them.

**Name no component here as a present-tense example of carrying cases.** A component
name written into another file's prose is a claim no gate reads, so it rots while every
gate stays green, and `AGENTS.md` carries the hazard and the change-time grep that finds
it. `ArenaAlert` is the one present-tense name this page keeps, because the
paragraph on `when` below reasons from its `danger` case, so removing it would cost a
worked example and buy nothing. For the live set, run the command at the end of this
section rather than reading any name from this page.

`pattern` and `exceptions` are one shape: `cases` is the other. They are
alternatives, never both, and a binding declaring both is rejected by
`validateBinding`. A flat binding (`pattern` plus `exceptions`) still means
exactly what it always has, and stays the right shape for the common case of a
component with one render worth judging. A cased binding replaces both with a
`cases` array, and each entry carries:

- `name`: a short identifier for the case (`"danger"`, `"circle"`);
- `when`: prose stating the configuration that produces it (`"tone is
  \"danger\""`, `"variant is \"circle\""`);
- `pattern`: the pattern that case binds;
- `exceptions`: that case's own exception list, exactly as a flat binding's;
- `reason`: optional, and required only when `pattern` is `none` or `absent`,
  exactly as a flat binding's, and inherited from the binding's own `reason`
  when the case does not override it.

`when` is prose, and prose is all that is possible: nothing can verify that a
render suite actually rendered the configuration a case names. A DOM
discriminator would be circular in every motivating case anyway: what marks
`ArenaAlert`'s `danger` case is `role="alert"`, which is the very attribute the
requirement under examination is about.

`bindingCases()` in `scripts/lib/arena/behaviour-contracts.ts` is the one place the
two shapes meet: a flat binding normalises to a single anonymous case (`name:
null`), so every consumer (`check:behaviour`, `check:compliance` and both
layers' render-suite wrappers) reads a binding as a list of cases and never
tests for `cases` itself. `reason` rides along on each normalised case too,
inherited from the binding unless the case overrides it, because a case may
bind `none` or `absent`, and those require one exactly as a flat binding does.

The flat shape stays valid and means one case, so the untouched majority is not
churned to say so. Find the bindings that do declare `cases` with
`grep -rl '"cases"' --include='*.behaviour.json' frameworks/`. Read the list
rather than a figure written here, which drifts the first time another binding
is converted.

### Additive patterns

`pattern` and `cases` are the two ways of saying what a component *is*, and they are
alternatives because a render is one thing or the other. `also` is a third key and it is not an
alternative to either: it lists patterns a component owes **as well as**, whichever of those two
shapes it uses.

The distinction that decides where a new pattern goes is whether it answers the question this
directory opens with. A pattern saying which roles a component carries, which keys it answers,
where focus goes or what dismisses it is an answer to *what must this component do*, and there is
exactly one such answer per render: two of them would contradict, with no way to report which of
the two a layer broke. That is why an ordinary pattern may not be added to another, and why an
additive one may require nothing in the `roles` family. `validatePattern` and `validateBinding`
hold both halves.

A pattern declares itself with `"additive": true`, in its own file rather than in a list here,
so the rule travels with the thing it governs. Present and not `true` is a problem rather than a
synonym for absent: it would read as a decision somebody made, and the only decision available
is whether the key is there. An additive pattern must also carry a `description`, because it is
bound alongside another rather than instead of one and nothing else on the page says why a
component owes both.

In a binding, `also` is an array of `{ pattern, exceptions }`, and its exceptions are held to the
additive pattern's own requirements rather than to the primary one's. `crossLayerAgrees` compares
the added set as well as the pattern: an additive pattern one layer ships and the other does not
is the divergence this branch exists to catch, and it is the easier one to introduce by accident,
since nothing a person sees moves when it goes missing.

Find the bindings that add one with
`grep -rl '"also"' --include='*.behaviour.json' frameworks/`. Read the list rather than a figure
written here, which drifts the first time another binding adds one.

### Why a reported defect can survive a green run, and the four limits that let it

Four limits are structural. None is a defect waiting to be fixed; each is a property of what a
binding is, and knowing them is what stops a green run being read as more than it says.

**Cases reach a component's own props and nothing further.** A requirement that holds only for
some *consumer* usage, one that depends on how two components are assembled or on what is
passed in, is a different level, and a case cannot name it: a case describes a render the
component's own API can produce. There is no grep for this class either, because it is a
property of an implementation rather than a string in a binding; finding the next one means
reading an implementation against its binding. `comparePattern`'s stale-exception message has
no vocabulary for it, offering only "delete it or name a subject".

**Nothing proves the declared cases are all the cases, or that a case's suite rendered every
render its `when` admits.** A component with five meaningful renders may declare two and every
gate stays green. `assertPatternCases` enforces one thunk per case *name*, never one render per
configuration the prose names, so a `when` covering several shapes is proved by whichever one
its suite mounts. Deriving cases from source is refused: a scan for prop branches
finds fewer renders than a reader does, which rebuilds the false-negative class the evaluator's
own design exists to avoid.

**A case bound to `none` verifies nothing**, because `none` has no requirements. The verdict can
be correct, since a label or a chip with no click handler has no interactive contract, but the
suite can then only confirm the case was rendered, never that it is correctly inert.

**A BEHAVIOURAL requirement with no suite to pin it is unfalsifiable, not merely unverified.**
Some requirements no single element can decide from the DOM (`focus.*`, `keyboard.*`,
`content.noAutoDismiss`, `alternative.table`); the evaluator returns `null` and the suite
declares the verdict in its `behavioural` map. That verdict is trusted, never re-derived, so an
unpinned one has nothing to compare against and stays green whatever the component does. An
exception of this kind can be false indefinitely with nothing able to see it. Read
the current set with

```bash
grep -rHo '"requirement": "[^"]*"' --include='*.behaviour.json' frameworks/ | sort -u
```

against `BEHAVIOURAL` in `scripts/lib/core/behaviour-compliance.ts`, rather than any list
written here.

### A name that is PRESENT is never checked for being USEFUL

`hasAccessibleName()` asks whether there is a name, through three ordered routes: `aria-label`;
the element's own text, where the pattern is in `LABEL_ACCEPTS_TEXT`; then `aria-labelledby`,
which names the element only when **every** id resolves. So a dangling reference reads as
unnamed, and a requirement in `IDREF` that finds its attribute with no resolver supplied
**throws** rather than degrading to a presence check.

Two things stay beyond it, and both are limits rather than gaps. **A resolved `aria-labelledby`
may name an EMPTY element**: the id resolves, the name reports as present, and the real
accessible name is the empty string. Requiring text at the target is refused, because
`textContent` cannot see a name that legitimately comes from an image's `alt` or a nested
`aria-label`, so the check would report correct components as unnamed, and the cheapest way to
silence a false OVERCLAIM is a fabricated exception written into a binding. **And a resolved
reference is no proof it landed on the RIGHT element**, because a pattern cannot say what *kind*
of element a reference must reach.

The only remedy either has is the one the API layer takes: a member that only a human can supply
is **required and guarded at runtime** rather than defaulted, which moves the judgement to the
consumer instead of removing it. Whether the names that produces are good ones is a question no
assertion answers and no gate can. See the by-hand checklist in each component's `.prompt.md`.

### There is no static text scan, and one is not worth proposing

A scan of component sources is the obvious cheap tier beneath the render suites, and it was
measured against the whole tree. In the "claimed met but no textual evidence"
direction it reports **60 of 118 true claims as unmet**, because of **implicit ARIA**: a native
`<button>` satisfies `roles.element`, `keyboard.Space` and `keyboard.Enter` while leaving nothing
to grep, and `<input type="checkbox">` satisfies `states.checked`. A text scan penalises exactly
the correctly-authored components. In the "exception is now stale" direction it wrongly retires
**18 of 94 live exceptions**, and none of the eighteen is a regex that could be sharpened: each
is a claim about *placement*, *branch*, *conditional value* or *semantic completeness*. A
rendered DOM resolves all four at once, which is why the render suites carry the
stale-exception check alone. A 51% false-unmet rate is worse than an honest hole.

### A claim about code this repository does not own cannot be checked here

A delegation asserts what somebody else's controls do, such as that a control applies one role
rather than another or that a tooltip defaults to no show-delay, and it carries no record of the
version verified against. `check:behaviour` verifies that a declaration names a
pattern and a requirement that exist, never that a claim about another package is still
true, so the suite stays green while the reason strings quietly become false. Pinning the
verified version and gating every delegation path both leave that hole open. **Writing Arena's
own control is what closes it**, and it also brings the component inside `check:dimensions`,
`check:compliance` and the Angular arm of `check:api`. Any delegation reopens this whole
paragraph, which is why a `BehaviourDelegated.json` entry records an absence rather than a
claim about what somebody else's control does.

### Native semantics vs. an absent capability

A requirement met by the element's own native semantics counts as **met, with no
exception**, whether the attribute is explicitly authored by the component
(`disabled={disabled}`, `required={required}`, `checked={checked}`) or is simply
implicit in rendering that native element at all, with no consumer action needed
(a native `<select>`'s combobox role and expanded/controls/activedescendant
state; a native `<input type="checkbox">`'s reflected checked state). The
component asserted nothing; the browser's own accessibility mapping did the
work, and that is exactly what the requirement asks for.

**Off the web the same requirement is an explicit obligation**, and that is the half this rule
does not state on its own. A platform with no implicit mapping has no element whose semantics
could meet anything: what a browser did for free, a target there applies by hand. So a green
`check:behaviour` and a green `check:compliance` are evidence about this tree and about no other,
and the count they rest on says how much: a static scan of these same claims reports 60 of 118 as
unmet, and every one of those 60 is a thing somebody else has to do.

A requirement is an **exception** when the component gives no supported,
documented way to reach it, which is not merely "no explicit prop", since a generic
`...rest` spread can still land an arbitrary attribute on the underlying native
element without the component ever having designed for it. The test is whether
the component's own design acknowledges the capability: is it destructured, does
it drive any of the component's own logic or styling, is it named in the
`*.prompt.md`? `ArenaInput`'s `min`/`max` pass through `...rest` too, but
`ArenaInput.prompt.md` calls them out by name as a supported feature, and that
authorship is what makes them "met", not the passthrough alone. `readOnly`
reaching the native `<input>`/`<textarea>` the same way, with no default, no
effect on any rendered state, and no mention in the prompt, is not a designed
capability, so it is exactly the gap `ArenaTag.behaviour.json` already records for
its remove button's missing `disabled` concept: the component offers no
supported way to make the state true, whether or not a determined consumer
could force it through.

**What it does not assert is whether the component actually behaves as it says.**
A component can bind `dialog-modal` here and trap no focus at all.

`check:behaviour` still proves only that a declaration is well formed. What proves
a declaration is *true* is a render suite: for a component listed in `COVERED`
(`scripts/check/arena/check-compliance.ts`), a suite asserts per requirement that the rendered
DOM either meets it with no exception declared or fails it with one declared. That
is bidirectional on purpose, catching an overclaim and a stale exception with
one statement, and it is why an exception can expire. Coverage is partial:
`check:compliance` guards that the record is accurate, never that it is complete.
Neither gate is an accessibility claim about any component.
