# Contributing

**Arena takes issues, and it does not take external pull requests.** Dravensoft
decides what Arena is.

That is a smaller restriction than it sounds, and the reason is worth stating,
because it is the same reason the rest of the repository is shaped the way it
is. Almost nothing here is local. A component's API is a contract file, the
accessibility pattern it binds is another, and the values it renders resolve
through design tokens that every other component reads too. A change that looks
like one component's improvement is usually a change to a rule that binds all of
them. A patch arrives with the change and without the argument, and the argument
is the part that has to be made.

So the useful thing you can send is the argument. That is an issue.

## What an issue is for

Anything that would make Arena wrong, unclear, or unusable:

- a component that renders or behaves differently from what its contract says;
- an accessibility failure, which is the category that gets read first;
- a gate that passes something it should refuse, or refuses something correct;
- a document that sends a reader somewhere empty;
- a package that does not install, build, or run as its page describes;
- a rule you can show is inconsistent with another rule.

A question counts too. If the documentation did not answer something, that is a
defect in the documentation, and the question is the report.

## What makes a report usable

Name the version, name the layer, and say what you expected against what
happened. If it renders, the fastest thing you can send is the smallest markup
that shows it. If a gate is involved, its output says more than a description of
its output.

The two entry points are the issue forms. They ask for those fields because a
report missing them usually costs a round trip before anything can start.

## What you can do without us

Arena is MIT, and that is not a formality. Fork it, cut it apart, ship a
derivative, take the token contracts and leave the components. The license is
the whole of the permission, and nothing here asks you to come back and ask.

What a fork does not get is the guarantee, because the guarantee is the gates,
and those run against this tree.

## If you work on Arena

[`AGENTS.md`](./AGENTS.md) roots that branch and everything below is reached
through it. Read it before anything else, and read
[`skills/design/SKILL.md`](./skills/design/SKILL.md) instead if what you are doing is building
something
*with* Arena rather than changing it.

## Security

A vulnerability does not go in an issue. [`SECURITY.md`](./SECURITY.md) says
where it goes.
