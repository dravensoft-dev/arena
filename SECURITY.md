# Security

## Reporting a vulnerability

**Report privately, through GitHub's private vulnerability reporting on this
repository**, under Security, Report a vulnerability. That channel is private
between you and Dravensoft until there is something to publish.

Do not open a public issue for a vulnerability, and do not send an ordinary pull
request that fixes one, because both describe the problem in the open before
anyone can act on it. There is a private route for a fix, and it is the section
below.

A report is easier to act on when it names the version, the layer, and the path
from a consumer's code to the effect. A proof of concept is welcome and is not
required.

## Writing the fix

**Say in the report that you want to write it.** Dravensoft then opens a draft
advisory, which carries a temporary private fork of this repository, and that fork
is where the patch is written, reviewed and run against the gates. It is the one
place work on an unpublished vulnerability happens without describing the problem
to everybody first, and what lands there merges and ships with the advisory that
names you.

Nothing obliges you to. A report alone is the whole of what is asked for, and it
is acted on either way.

## What is supported

**The current release.** Arena moves in majors and does not carry deprecation
windows, so a fix lands on the current version rather than being backported.
`.claude-plugin/plugin.json` names which version that is, and the registry is
the authority on what each package published.

## Scope

Arena ships components, design token contracts, and the `arena-to-prod` command
that turns a consumer's `arena.config.json` into the stylesheet a package cannot
carry. That command reads a project's configuration and its source tree and
writes CSS, so anything it can be made to read or write outside its output is in
scope.

Two dependencies are part of the adoption contract and are not Arena's to fix:
Phosphor Icons and Tailwind. A vulnerability in either belongs upstream, and a
report here is still worth sending if Arena's use of it is what exposes you.
