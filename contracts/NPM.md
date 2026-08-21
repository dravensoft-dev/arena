# @dravensoft/arena-contracts

**The contracts every Arena platform target implements.** Values in strict
[DTCG 2025.10](https://tr.designtokens.org/format/), one capability statement per component, one
behaviour pattern per file. No code, no stylesheet, no dependency, and nothing that assumes a
browser is reading it.

This package exists so a design system can leave one repository. Arena ships React and Angular
libraries of its own; what is inside here is the part underneath both of them, published on its own
so a target on another platform consumes the same values rather than re-typing them.

If you are building a screen with Arena on the web, this is not the package you want:
`@dravensoft/arena-react` and `@dravensoft/arena-angular` carry the components and the compiled
stylesheet. Install this one when you are writing the layer itself.

## What arrives

```
arena.contracts.json          every path below, sorted, with the version that produced them
contracts/design/*.json       colour, type, spacing, density, effects, layering, motion
contracts/api/components/*    one capability statement per component, in neutral member forms
contracts/api/types/*         the shared enums and objects those members take
contracts/behaviour/*.json    one accessibility pattern per file, cited to its source
```

`arena.contracts.json` is the entry point and the manifest at once. Read it first: it enumerates
what the version you installed actually holds, so a generator iterates the list rather than
globbing a directory and hoping.

## Reading a value

Every design value is a DTCG token. A dimension is `{ "value": 16, "unit": "px" }` and the unit is
present even at zero; a colour is a structured sRGB object and never a hex string; a duration is
milliseconds; an easing is four numbers. Nothing is a CSS string, and there is no CSS in the
package at all.

```json
{
  "$value": { "value": 48, "unit": "px" },
  "$description": "48px clears WCAG 2.5.8's enhanced 44px target, which the 40px base does not"
}
```

Three things a target has to decide for itself, because a value and a unit cannot say them:

- **What the reader's text setting does to a value.** Every dimension declares it, as
  `$extensions["com.dravensoft.arena"].userScale`, from a closed set of three: `scales` grows with
  the platform's text scale, `follows` is a multiplier that scales for free, and `fixed` stays put
  while the box around it grows. A group declares for the leaves under it and a leaf overrides its
  group.
- **How a composed value is composed.** Runtime colour derivations, font loading and the device's
  safe-area insets are held nowhere in this package, because none of them has a value until there
  is a device. What is here is what they compose from.
- **The one type that is not DTCG's.** `keyword` is a single bare word carrying the closed set it
  may take, in the same extension key. It inherits no DTCG transform, so a target maps it by hand.

## Reading a component

An API contract states the members a component presents, under neutral names, in one of nine
forms. It says nothing about the syntax a platform binds them with: a slot is a slot whether the
platform spells it as a child, a projection or a builder.

A behaviour contract states what a kind of component must **do**: which role it carries, which keys
it answers, where focus goes, what dismisses it. Each cites the source it was adopted from, mostly
the [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/). A pattern
requiring a role names that role in an `element` field beside the prose, so a target applies it
without parsing a sentence.

**A requirement a browser meets through an element's own semantics is an explicit obligation
everywhere else.** A native `<button>` answers a role, two keys and a disabled state while the
component asserts nothing; a platform with no such mapping owes every one of them by hand. That
asymmetry is the single most important thing to know before implementing a pattern from this
package.

Two patterns carry no requirements and exist to be declared rather than implemented: `none`, for a
component a user cannot act on, and `absent`, for a component a layer does not ship at all.

## Versioning

The version is Arena's own, and the three contract levels move with the libraries built on them. A
change to what a member is called, or to what a pattern requires, is a breaking change and arrives
in a major. Pin an exact version and raise it deliberately: a generator that follows a range will
emit a different surface without anybody asking it to.

## Licence

MIT. Arena is built by [Dravensoft](https://dravensoft.com).
