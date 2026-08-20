# When it has to be found

Arena writes the document `<head>` in Angular, and whether your product needs that is a decision
about the product rather than about a screen.

Read this once per project, before the first screen. The rules of the language are in
[`../SKILL.md`](../SKILL.md) and hold whichever way this one is answered.

## The question, and no is a real answer

Ask whether somebody who is not already using this product has to arrive at it from outside. A
console, an admin tool and anything behind a login are a legitimate no, and it is because no is so
often the true answer that Arena publishes nothing until it is told to. A catalogue, a landing
page, a public listing and a documentation site are a yes, and a yes has consequences before the
first component.

## Arena writes the head in one layer, and the router is why

`@dravensoft/arena-angular/metadata` is a second entry point of the Angular package, apart from the
one every component comes from. It is apart because reaching it means reaching `@angular/router`,
declared as an optional peer for exactly this reason: a project that reaches only for components
never installs a router it does not use.

**`@dravensoft/arena-react` has no counterpart.** It writes no `<head>` at all, so a React project
carries that itself, through whatever its own framework offers, and a React framework picked to be
found generally offers one already. **What this decides is one piece rather than the stack**: on
Angular Arena supplies it and on React your own framework does, so a yes here costs a dependency on
one side and a wiring you were going to have anyway on the other. How the application is assembled
stays the project's answer, in the ninth node of [`cold-start.md`](./cold-start.md), which is also
where the asymmetry this page's reader is most exposed to is written down: a product that has to be
found is a product that server-renders, and the two layers do not hold that claim with the same kind
of evidence. Read it on the day the choice is still cheap.

## Three properties to know before you write a route

**Every route is private until one of them says otherwise.** A screen that should be found says so
itself, and the rest stay out of an index without anybody remembering to keep them out. Nothing
announces the default, so the first evidence of forgetting it is a page missing from a result nobody
thought to check.

**A canonical needs an address you supply.** Arena refuses to derive one from the document, because
such a value disagrees between a server render and the client that hydrates it, and a disagreement
there is invisible to whoever introduced it. Say where the application lives, once, and the
canonical and the `og:url` beside it both appear.

**A title composes rather than competes.** Angular's own `title` on a route keeps meaning what it
means and gains the suffix and the description beside it, so nothing already written gets rewritten
to suit Arena.

The exports carrying all three, with what each one takes, are on your package's own page:
[`../../../frameworks/angular/PACKAGE.md`](../../../frameworks/angular/PACKAGE.md), under the
heading about the `<head>`. Open it when the answer is yes.

## What both layers publish

`ArenaBreadcrumbs` describes the trail it draws in `schema.org` terms beside the markup, under both
frameworks, and it changes nothing a person sees. Pass it `origin` and every crumb is published at
an absolute address; without one the addresses go out as written, which readers support less well.
Its own prompt is where that member is documented.

`contracts/behaviour/structured-data.json` is that pattern stated on its own, and it is what markup
of yours binds when it describes a structure worth handing to a reader rather than only to a
person: a script of type `application/ld+json` next to the markup, the same structure in
`schema.org` terms, and `<` escaped in the serialisation so no value you supply can close the tag.
It is the one pattern in `contracts/behaviour/` that is not an accessibility requirement.

## What Arena does not decide

Arena renders no page and lists none. It writes the `<head>` of whatever page your application
renders and describes the structures it draws; how that page reaches a reader, and what a
crawler is handed when it asks for one, stay yours to answer. Which architecture produces it,
and the evidence behind each, is the ninth node of [`cold-start.md`](./cold-start.md). The three
properties above are the part Arena holds, and they are not the whole of the job.
