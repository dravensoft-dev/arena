/* Holds what a reading route costs. Both branches route rather than explain, so a document grows
 * by a paragraph that reads as an improvement while the cost lands on every agent taking that
 * route, once per build, with every other gate green. ROUTES declares a route as its ordered stops
 * and a budget carrying the reason for its number; a stop is a pathspec and the LARGEST file it
 * reaches is what the route is charged, so the figure is the worst case a reader can meet rather
 * than an average nobody experiences. A budget the tree has fallen far under fails as a stale
 * allowance, the shape SIZE_ALLOWANCE has in check-docs.ts, so decomposing a document returns the
 * pressure instead of ending it. The stops are this gate's declared reads, derived rather than
 * written a second time. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { resolveSpecs } from '../../graph/pathspecs.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const BUDGET_SLACK = 0.85;

export type Entry = {
  name: string;
  router: string;
  budget: number;
  reason: string;
};

export type Branch = {
  name?: string;
  stops: string[];
};

export type Route = {
  name: string;
  who: string;
  entry: string;
  stops?: string[];
  branches?: Branch[];
  budget: number;
  reason: string;
};

export const ENTRIES: Entry[] = [
  {
    name: 'consumer',
    router: 'skills/design/SKILL.md',
    budget: 17_400,
    reason:
      'the page every consumer route opens with, and the reason it is declared here rather than as '
      + 'the first stop of each of them: a paragraph added to a router that seven routes shared was '
      + 'charged seven times and argued seven times, and moving one out reported seven stale '
      + 'allowances. Neither number was about the reader. What a route pays past this is its own, '
      + 'so the two move independently and each is argued where it is spent. The number is what the '
      + 'router costs today with room for one question, and a question earns its place here only if '
      + 'it is asked before a builder knows which situation they are in; everything asked after that '
      + 'belongs to the node that asks it. Raised from 15,700 when the cold start tree gained '
      + 'the two questions that decide an install rather than a screen, and the router had to '
      + 'say so: a row a reader matches on is how they learn a node exists at all, and a tree '
      + 'whose last nodes are unreachable from the page every route opens with is one only '
      + 'somebody who already knew about it can walk. Raised again to 16,300 when the table '
      + 'stopped asking one question twice. Two rows asked whether a component exists and both '
      + 'answered a no with the media register, so a builder whose component is merely missing '
      + 'was routed to a page about photo walls and feeds. One row asks it now and names the '
      + 'three shapes a no has: a different register, a decision the surface page states, and a '
      + 'component nobody has added, which is the other branch. Dropping the second row also '
      + 'puts the kernel row back beside the one that answers with the same document. Raised '
      + 'again to 17,100 for the two rows a consumer holding a defect needs. The accessibility '
      + 'row named the per-component behaviour file beside the pattern, and that file is in '
      + 'EXCLUDED_PATTERNS in scripts/lib/arena/package-assembly.ts, so the row sent a reader '
      + 'holding only the package to something the package does not carry; the pattern files '
      + 'themselves are exported by both builds and stay. The second row is the branch exit: '
      + 'CONTRIBUTING.md takes a document that sends a reader somewhere empty and a question the '
      + 'documentation did not answer, and no page on this branch named it, so a consumer who '
      + 'proved the defect was Arena\'s had nowhere to put it. Raised again to 17,400 for the '
      + 'row naming the repertoire. Arena is built with bun, React 18 and Angular 22, and every '
      + 'command on this branch was written in the runner Arena happens to use, so a reader with '
      + 'no row to match on learned a toolchain by copying one: what the row names is the page '
      + 'that separates what Arena supports from what Arena is made of, and it is asked before a '
      + 'builder knows which situation they are in, which is what earns a row here rather than '
      + 'in the node that would otherwise own it.',
  },
  {
    name: 'contributor',
    router: 'AGENTS.md',
    budget: 23_400,
    reason:
      'the same argument on the other branch, and it is allowed to cost more because it is paid by '
      + 'whoever changes Arena and never by whoever uses it. It carries a routing table rather than '
      + 'a tour, so it grows by a row when a level appears and not by a paragraph when a level '
      + 'grows. Raised to 21,400 for a row that is not a level: what a consumer may build Arena '
      + 'into is a promise the sources keep rather than a directory anybody edits, so a '
      + 'contributor reaches it by the change they are making and never by the file they are '
      + 'opening. It is the one subject where the page a reader would look for does not exist, '
      + 'which is what the row buys. Raised to 22,400 for the two rows that are not indexed the '
      + 'way the rest of the table is. Every other row asks what you are changing, which a reader '
      + 'arriving with a symptom cannot answer yet: nine cold walks of this branch produced one '
      + 'that had two equally correct rows for a keyboard defect and picked by luck, and one that '
      + 'planned a component that already shipped in three layers, because no row asks whether it '
      + 'exists and the page that answers belongs to the other branch. A router indexed only by '
      + 'intent serves the reader who already has one, and that reader is not the expensive case. '
      + 'Raised to 23,000 for the fifth declared departure. The corpus a package carries is the '
      + 'reference tree shipped where the tree it is generated from already sits, so the '
      + 'departure above it reads as contradicted by the one below unless both are written '
      + 'down: a contributor who finds a prompt inside a tarball, and a page saying a copy '
      + 'inside the skill directory is refused, has two rules and no way to tell which one '
      + 'governs the change they are making. Raised again to 23,400 when the artefact list stopped '
      + 'saying three. It had named two npm packages since a third shipped, and a fourth landed '
      + 'beside it: a contributor reading which of them a change moves was reading a list that '
      + 'answered for half of them, and what a release moves is the one thing on this branch that '
      + 'fails in silence when it is forgotten.',
  },
];

export const ROUTES: Route[] = [
  {
    name: 'consumer-component',
    who: 'an agent writing a screen: the router, where it takes the rules, then its layer\'s '
      + 'directory, then the index of the one category it reaches into, then the prompt of the one '
      + 'component it writes',
    entry: 'consumer',
    stops: [
      'frameworks/*/INDEX.md',
      'frameworks/*/components/*/INDEX.md',
      'frameworks/*/components/**/*.prompt.md',
    ],
    budget: 32_700,
    reason:
      'the route every build takes, and the only one paid per screen rather than per project. The '
      + 'layer-neutral index is deliberately NOT a stop: it answers whether a component exists at '
      + 'all, which is a question a builder who knows what they are reaching for never asks, and '
      + 'charging every build for it cost half again what the route costs now. The layer stop is a '
      + 'directory naming every component under its category rather than one index describing all '
      + 'fifty-nine, so a build is charged the one category it reaches into: splitting it took a '
      + 'quarter off this number, and naming the components in the directory is what keeps the '
      + 'extra stop from costing a guess. The number is what the stops measure today with room for '
      + 'one component to grow, and it is the ceiling a new rule on the consumer branch is argued '
      + 'against. Raised to 44,600 when the router gained the third decision a project takes before '
      + 'its first screen, whether anybody outside the product has to find it. The router is a stop '
      + 'on five consumer routes now, so a question added to it is charged five times and this is '
      + 'the one that pays per screen; what makes it worth the build route is that the answer is a '
      + 'peer dependency and a layer rather than a component, and a build that starts before it is '
      + 'settled is a build that has already chosen. Raised again to 45,400 when the router started '
      + 'naming the pieces a page is composed from. It said the shape of a screen is the project\'s '
      + 'and the silence about the shape had spread to the inventory: Arena ships css/page.css, '
      + 'css/rhythm.css and a fill-page role, documents all three on each layer\'s npm page, and '
      + 'named none of them where a builder decides how a screen goes together. What that costs is '
      + 'measured on a consumer bench, where a page carries a shell written by hand and a floor '
      + 'nobody paints, so a dark palette leaves the canvas the browser\'s own below the first '
      + 'viewport. This is the route that pays per screen and the one where it bites, because a '
      + 'screen is composed before a component is chosen, and a build that starts without the '
      + 'pieces writes them again. Raised again to 45,600 by three cold walks of the consumer '
      + 'branch, one per entry point. The two that reached this router painted the floor through '
      + 'the role and the one that never did took a palette step instead, so the row carries what '
      + 'separates them: a role is what a style plugin re-answers, and a page painted through one '
      + 'follows the skin it is handed. It stops there rather than forbidding a step, because the '
      + 'manifests spend both and a rule stricter than the tree is one the tree refutes. Raised '
      + 'again to 46,000 when the router gained the question that comes before the other three, '
      + 'what Arena ships at all and how much of it a project takes. This is the route that pays '
      + 'per screen and it is where not knowing bites: a builder who has never been told that '
      + 'rhythm-group, rhythm-component and rhythm-section exist writes a margin instead, and the '
      + 'branch named those three nowhere while spelling the classes that read them. The same '
      + 'silence covered the two density classes, which appeared once on the whole branch inside a '
      + 'rules bullet and never as something a product can offer. Two of the table\'s longest rows '
      + 'became pointers to pay part of it, which is the trade this budget is for: the router names '
      + 'the question and the document carries the answer. Raised again to 46,200 when the router '
      + 'started naming the contributor branch by its URL. A relative path to it resolves in a '
      + 'clone and nowhere else, and this router is served on the site and read inside a package, '
      + 'so the one sentence sending a reader to the other branch was a 404 for everybody who did '
      + 'not already have the tree. Raised again to 32,700 when a grid showing part of a list '
      + 'started saying how big the list is. ArenaTable is the largest prompt this route can '
      + 'reach and every screen that takes a table pays for it, which argues for keeping the '
      + 'rest of that page short rather than for leaving the member out: a paged table is '
      + 'already a subset of a grid, the source page its binding cites applies aria-rowcount '
      + 'and aria-rowindex to exactly that condition, and a consumer nobody tells carries the '
      + 'defect into every table they build. The arithmetic is the half that cannot live in a '
      + 'member description: the header row takes index 1, so an offset counted from 1 is off '
      + 'by one in a way no gate of ours and no gate of theirs reports.',
  },
  {
    name: 'consumer-install',
    who: 'a consumer putting Arena into a project: the router, then the npm page of their package',
    entry: 'consumer',
    stops: ['frameworks/*/PACKAGE.md'],
    budget: 51_400,
    reason:
      'paid once per project rather than per screen, so it carries what the build route may not: '
      + 'the config file, the command, the theme surface and the two measurements. It shares the '
      + 'router with the build route, so the two move together whenever that page does. The number '
      + 'is argued up rather than held down when a correction lands on the npm page: a pre-paint '
      + 'script that answers the device as well as storage is longer than one that does not, and '
      + 'being right is what the page is for. It is what the stops measure once the appearance a '
      + 'project adopts stopped being picked from a page rather than written in a directory. '
      + 'Raised from 36,000 when the audit gained a scope: a consumer has to be told which rule '
      + 'relaxes inside a style plugin directory and which does not, and a report that is silent '
      + 'about where it stops applying is one nobody can act on. Raised again when the third '
      + 'generated file gained a name on the page: a file nobody is told to import is a plugin '
      + 'whose CSS reaches no page, and the failure is silent, so naming it is worth more than the '
      + 'lines it costs. Raised again when the page stated which register the library is for: what '
      + 'this route decides is whether to adopt Arena at all, and a consumer whose product is a '
      + 'media or a consumer one otherwise learns that the components run out by building the '
      + 'screen, which costs more than every stop on this route put together. Raised again when '
      + '--strict stopped being one switch: a project whose brand does not clear 4.5:1 has to be '
      + 'told which kinds it can still hold, and a flag whose kinds are not named on the page is '
      + 'one nobody can type. Raised again when the config gained a key for a brand whose mark is '
      + 'a gradient: what the key buys is that --strict=audit stops failing over the most '
      + 'recognisable thing about a product, and a key nobody is told about is one nobody '
      + 'declares, so the report it silences goes on being suppressed a line at a time. Raised '
      + 'again when the router\'s description named the style kernel: the description is the whole '
      + 'of what an agent reads before it decides whether to load Arena at all, and one that stops '
      + 'at the palette describes a system that cannot be reskinned. Raised again when the '
      + 'question table gained the three rows the kernel answers: this route and the build route '
      + 'share the router, so a project that has to decide its appearance before the first screen '
      + 'pays for those rows here too. Most of what they cost was bought back out of the paragraph '
      + 'that used to describe a style plugin on the router, which the kernel document owns now. '
      + 'Raised again when a cold agent walked this route and reported that the page taught it the '
      + 'skin is a palette and three fonts: it would have shipped somebody else\'s appearance with '
      + 'its own colours in it and believed that was the job, so the section says what a palette '
      + 'is not and names where the decision is made. Raised again when the same walk found what '
      + 'the page ships and never names: five projection markers whose slots fail in silence, and '
      + 'the sheets under css/ a reader picking a depth is not offered. A file a package ships and '
      + 'a page never mentions is one nobody imports, and this route is where a consumer meets '
      + 'every one of them. Raised again to 46,000 when check:exports landed and reported twelve '
      + 'symbols in that same shape, the modal contract among them: Arena tells a consumer a '
      + 'lightbox is theirs to write, ships the tested focus trap its own dialogs run on, and the '
      + 'page disclaimed it by omission, so a cold walk planned a second trap written from memory. '
      + 'Raised again to 46,600 when the main landmark and its skip link shipped as a pair joined '
      + 'by a constant id: the id is the one thing a consumer needs in order to write a second '
      + 'route into the content or an anchor of their own, and a pair whose id is undocumented is '
      + 'a pair a consumer coordinates by reading the source of a package they installed. '
      + 'Raised again to 49,400 when the metadata provider shipped behind a second entry point: '
      + 'the import path is not derivable, the router peer is optional and a consumer who does not '
      + 'know that installs it for nothing, and the whole value of the provider is a default a '
      + 'reader has to be told about, since a route born noindex is a surprise the first time it '
      + 'is right and a defect every time it is not. What the section deliberately does NOT carry '
      + 'is why a bundler resolves before it eliminates, which is the mechanism behind the second '
      + 'entry point and belongs to frameworks/PACKAGING.md, on the branch whose reader can act on it. '
      + 'What buys a raise here is always the same argument, that being right is what the page is '
      + 'for, and what makes this one binding is that a gate fails the page now rather than a '
      + 'reader discovering it. Raised again to 49,900 when the router started asking whether the '
      + 'product has to be found at all: this route is where the answer is acted on, since a yes '
      + 'names an entry point to import and a peer to install and a no leaves both alone, and the '
      + 'question reaching a project only through the page it is answered on is the shape that put '
      + 'the provider out of reach in the first place. Raised again to 52,300 when the page opened '
      + 'on what a project is adopting rather than on what to install: the components carry an API '
      + 'declared once for both layers, a behaviour pattern each of them binds, a kernel whose '
      + 'answers are the appearance, and a head a product that has to be found asks for and no '
      + 'other pays. A reader arriving from the registry has read nothing else, and one who learns '
      + 'those four by reaching the section that details each has already decided against three of '
      + 'them; the section is shared between both pages, so what it says is said once and charged '
      + 'to the larger. Raised again to 53,100 when the router started naming the pieces a page is '
      + 'composed from, which the npm page already documents sheet by sheet. The table was the one '
      + 'place css/page.css and css/rhythm.css were named, and a reader reaches a table by being '
      + 'sent to it: the router pointing at those two rows is what turns a stylesheet list a '
      + 'consumer finds into one they arrive at. Raised again to 53,700 by the same argument the '
      + 'pre-paint script bought the first time: it took two palette names as two literals, so a '
      + 'project declaring three or four could not state its first visit there at all, and the one '
      + 'name it did take was picked by hand where the theme surface takes the first palette of the '
      + 'matching polarity. The snippet takes the list and the default now, which are the two values '
      + 'that surface already takes, so the page costs more and the two cannot disagree. Raised '
      + 'again to 54,200 when the rhythm row started spelling its own classes. It named the three '
      + 'steps as bare modifiers, which reads as a custom property rather than as a class, and three '
      + 'cold walks read it that way: one wrote a gap variable that does not exist, one guessed the '
      + 'class and said so, and the one that got it right had it from a component prompt that '
      + 'happens to spell it. A row naming what a class does and never the class is a row a reader '
      + 'finishes and still has to guess from, so it spells all nine and says which belong to a '
      + 'stack and which to a row. Raised again to 54,600 when the router gained the inventory '
      + 'question. This page is where every part is documented in detail, sheet by sheet and export '
      + 'by export, and detail is not the same as knowing the part is there: a reader reaches a '
      + 'table by being sent to it, and the two tables on this page are long enough that what a '
      + 'reader does not already suspect exists is what they skip. The question sends them, and the '
      + 'inventory it links names the part in one line and leaves the detail here, so nothing on '
      + 'this page is said a second time. Raised again to 57,200 when the page gained the '
      + 'half of a page that is not a component. Three cold walks entered this library by three '
      + 'different doors, and only the two that reached the repository painted a floor: the page '
      + 'said the shell fills the window and never said what colour it takes, so the walk holding '
      + 'this page alone shipped a screen standing on the browser\'s own canvas, and painted its '
      + 'text out of the compatibility aliases in css/colors.css, because no role was named '
      + 'anywhere it was reading. The same walk could not learn that either density class exists '
      + 'at all. A class a consumer writes and a floor only a project can apply are both shipped '
      + 'things, and a shipped thing this page does not name is one a consumer replaces with a '
      + 'rule of their own and never learns they had. '
      + 'Raised again to 61,000 by six cold walks, two per entry point across both layers. This '
      + 'is the only route a reader arriving from the registry can take, and what it lacked is '
      + 'what they alone could not reach: how a level holds text back, which is why a bare ink- '
      + 'muted paints a caption at the strength of body copy; the column and the rhythm as names '
      + 'rather than as a stylesheet table four hundred lines down; the shape of the miss the '
      + 'group step replaces, which a walk reading only this page wrote by hand inside a table '
      + 'cell; that the band carries no block air, which every walk invented a padding for; and '
      + 'the behaviour contracts, which this package now ships because the sentence sending a '
      + 'builder to bind one pointed at a directory no tarball carried. Raised again to 62,500 '
      + 'when the page said what a TypeScript project declares before it can import a stylesheet. '
      + 'The three import lines it shows are a bundler\'s idiom and not the compiler\'s: a .css '
      + 'specifier resolves to no module, so a strict build stops at the file that wires Arena in, '
      + 'and three cold walks of this route wrote a declaration file of their own to get past it. '
      + 'It also carries what the shared column region gained, the row as anything laid across and '
      + 'the wrapper a growing child needs when that child is a component this package draws. '
      + 'Raised again to 47,400 when the install section named the three package managers rather '
      + 'than the one it showed. The layout that would break a package making flat-tree '
      + 'assumptions is the strict one, so the page says the peers are declared rather than '
      + 'hoisted and that the shipped command resolves the icon font through a symlinked store. '
      + 'It was verified by installing the packed tarball under that layout and running the '
      + 'command, which is the evidence a claim about somebody else\'s tool needs. Raised again to '
      + '48,000 when the icon sheet stopped being half a promise. The page says the sheet holds '
      + 'every glyph the project draws and every glyph Arena draws for it, and the glyph COUNT is '
      + 'what a project is told to cut a self-hosted font subset to, so a list padded with names '
      + 'that appear in a sentence about a member rather than in a render is the wrong list to cut '
      + 'to. Measured across eight twin pairs of consumer benches, where the Angular half carried '
      + 'between 8 and 18 rules its React twin did not for the same screens and the same config. '
      + 'The package ships the list its own renders draw now, and the page has to say so, because '
      + 'a reader who is told the two halves are answered the same way has no reason to trust '
      + 'either. Raised again to 49,000 when the config block stopped omitting the key that '
      + 'decides the appearance. The block is announced as the whole file and a reader copies it '
      + 'whole, so a project meaning to look like itself shipped the answers this package installs '
      + 'with and nothing on the way said so: the consequence was stated sixty lines below the '
      + 'block, which is past where somebody copying stops reading. The same raise pays for the '
      + 'flag table saying what --src names and what it does not. The command resolves a declared '
      + 'style plugin from the config and walks it wherever it lives, so the flag names the trees '
      + 'a project owns and nothing else, and the page says so because a reader who has to be told '
      + 'to pass a directory the config already declares is a reader being asked to hold the tool '
      + 'together. Raised again to 50,400 when the page stopped documenting the runner Arena '
      + 'happens to be built with as the one a consumer needs. The command it tells them to run '
      + 'was written in that runner and nowhere else, and the shipped file is a Node program '
      + 'reading three node modules, so a reader on this route learned a dependency Arena does '
      + 'not have by copying the only line that names one. The region carries the two axes a '
      + 'reader cannot act without, what runs the command and how the package is loaded, each '
      + 'with the evidence behind it, and leaves the rest of the repertoire to the page that '
      + 'owns it: a project that cannot load a module has to learn it here rather than at the '
      + 'first import, and one that can is spared the other four axes on the route it pays per '
      + 'project. Raised again to 51,400 for the row naming the discovery record. This is the '
      + 'only route a reader arriving from the registry can take, and the record is what puts '
      + 'Arena where their editor looks: a package carrying the whole corpus and a page that '
      + 'never names the one command that surfaces it ships a language nobody reaches, which is '
      + 'the shape the stub it replaces already had. The row also says what --skill-check '
      + 'reports, since a record that stops matching the package fails at nothing and is read by '
      + 'an agent anyway.',
  },
  {
    name: 'consumer-skin',
    who: 'a project deciding what Arena looks like in their product: the router, then the kernel '
      + 'document that says what the questions are and which answers carry the difference',
    entry: 'consumer',
    stops: ['skills/design/references/style-kernel.md'],
    budget: 17_500,
    reason:
      'paid once per project and never per screen, like the install route, which is what lets it '
      + 'carry the whole surface the kernel exposes rather than a pointer to it. What it buys is '
      + 'that a project stops learning the kernel from a normative contributor document that names '
      + 'gates and links a contributor roof, which is where four products learned it. The number is '
      + 'what the stops measure with room for the kernel to grow a section, and it moves when the '
      + 'kernel grows a question rather than when the document grows a paragraph: the differentiation '
      + 'table is a measurement over consumer benches, so it grows by remeasuring and not by '
      + 'writing. Raised from 24,000 by what a cold agent could not answer from it: which scale '
      + 'each role draws from, since the type does not say and one type covers four scales; that '
      + 'a reading floor refuses the build rather than reporting; and that the loudest two '
      + 'decisions a brand makes, a square corner and no shadow, have no step to alias. Every one '
      + 'of those was a guess it had to make, and a route that costs less by leaving them out '
      + 'costs more the first time somebody walks it. Raised to 29,500 when the router gained the '
      + 'ordering two cold walks proved was missing: the kernel was routed to from a question table '
      + 'and from a paragraph under a heading about delivery, while the one section shaped like a '
      + 'procedure began at step 1, pick a component. Both walks reached the kernel in time and '
      + 'both reported reaching it by reading the table top to bottom rather than by being sent, '
      + 'which is luck of format. The router is a stop on four consumer routes, so that fix is '
      + 'charged four times and this is one of them; the paragraph saying the same thing a second '
      + 'time is what was bought back first. Raised again to 30,500 when the router stated that how '
      + 'a screen is composed belongs to the project: Arena ships the pieces and no shape they must '
      + 'make, which is a decision about the product rather than a paragraph, and a skeleton handed '
      + 'down instead would have made the first impression of the kernel Arena\'s rather than the '
      + 'project\'s. Three buy-backs paid for it, the last of them an identity sentence restating '
      + 'two rules that have their own bullets. What the raise itself buys is that the route stopped '
      + 'sitting one character under its ceiling, where the next correction is refused by arithmetic '
      + 'rather than by judgement. Raised again to 31,300 when the router named the floor a page '
      + 'stands on. fill-page is a question the kernel asks and every answer to it reached a style '
      + 'plugin and never a page, because nothing on this route said the role exists or that Arena '
      + 'declares the polarity and paints no page of the project\'s: a skin decided without its '
      + 'floor is a skin decided down to the last surface and not the one under them. Raised again '
      + 'to 31,700 when the router gained the inventory question, which is worth its share here for '
      + 'a reason particular to this route: the kernel is the largest thing on the consumer branch '
      + 'and a project that meets it first meets it as the whole offer. Named as one part of eleven '
      + 'and the second of three steps, it becomes a decision a project can take or defer on '
      + 'purpose, and that deferring it is legitimate is something this route cannot say about '
      + 'itself. Raised again to 17,200 by the remeasurement this route\'s own reason reserves the '
      + 'raise for: the catalogue grew from four registers to eight, and three role groups that '
      + 'four products had answered identically stopped agreeing. Which surface is the page and '
      + 'which is the thing standing on it, whether a control and a field carry a drawn edge, and '
      + 'whether small text is the body face or the mono one each moved from the table of answers a '
      + 'project may inherit into the table of answers it has to make. A row in the second table is '
      + 'a decision this page is now obliged to name, and a page that kept the shorter version '
      + 'would be telling a project that a decision it has to make was already made for it. Raised '
      + 'again to 17,500 when the one exception to the scale rule gained its mechanism. The page '
      + 'named the type and page rhythm ladders as the case a plugin may move and then said nothing '
      + 'about how, so the only prose carrying the key shape sat inside a role description in the '
      + 'contracts, where the builder holding the question never reaches, and three readings of the '
      + 'same page were each defensible. An exception a page names and does not answer costs more '
      + 'than the paragraph answering it, because a reader either guesses or goes looking on the '
      + 'branch that is not theirs.',
  },
  {
    name: 'consumer-register',
    who: 'a builder whose product, or one screen of it, is outside the component list: the router, '
      + 'then the page that says what Arena hands over instead of a component',
    entry: 'consumer',
    stops: ['skills/design/references/media-register.md'],
    budget: 9_600,
    reason:
      'paid once per project like the skin route, and by a reader the router has just told to write '
      + 'their own markup. What it buys is that the honest sentence at the top of the router stops '
      + 'costing more than a dishonest one would: two cold walks were sent away from the component '
      + 'list correctly and then left to hand-roll a focus trap the package already ships, guess an '
      + 'ARIA contract that is written down in contracts/behaviour/, and rediscover that a photo '
      + 'wall is one line of CSS. Every part of the answer already existed and none of it was '
      + 'reachable from the sentence that created the need. The number is what the stops measure '
      + 'with room for one section, and it grows when the register gains a part to hand over rather '
      + 'than when the page gains a paragraph. Raised to 21,500 the first time that happened, on the '
      + 'walk that repeated against this page: it gained the component that reads the two media '
      + 'roles the page already told a reader to answer first, the split between an auto-fitting '
      + 'grid and a fixed-count wall, and the two component names that look like the answer and are '
      + 'not. It also lost a claim it should never have made: the page said Arena ships the hard '
      + 'parts of both patterns it names, and Arena ships the modal one and binds the feed one '
      + 'inside a component nobody can reuse, so the page says that instead. Raised again to 22,200 '
      + 'when the router started naming the pieces a page is composed from, which this reader needs '
      + 'more than any other on the branch: nothing they write is a component that arrives carrying '
      + 'its own floor, its own column and its own air, so a route that hands them the markup and '
      + 'not the pieces hands them a page to rebuild from nothing. Raised again to 22,600 when the '
      + 'router gained the inventory question and sent the pieces to a page of their own. This '
      + 'reader gets the most of both: the inventory is where they learn that the parts handed over '
      + 'are not only the two this page names, and the page document is where the floor, the column '
      + 'and the air stop being a sentence in a router and become the list their own markup is '
      + 'built from. '
      + 'Raised again to 24,300 when the register gained the viewer that opens a picture at full '
      + 'size. Six cold walks were asked for one and six wrote it, each inventing the same four '
      + 'answers: what dims the page behind it, whether the picture is contained or cropped, what '
      + 'a control laid over a picture nobody chose stands on, and whether the pattern still has '
      + 'to be bound when Arena ships no component to bind it. Every one of those is already a '
      + 'token or a contract, so the section costs a paragraph and replaces four guesses per '
      + 'project. Raised again to 25,300 when the section gained the box itself. It opened by '
      + 'saying every value a viewer needs is already a token and left the one value that is not '
      + 'unsaid, so walks sized the picture with a vh nobody chose. A fixed layer at inset 0 needs '
      + 'no length at all, and the unit that follows a phone\'s browser chrome is dvh, which is '
      + 'what the chosen number was compensating for.'
      + ' The figures in this history predate the stop set being narrowed and the budget re-measured '
      + 'against what is left, so every one of them names a number this route does not have. The '
      + 'arguments travel and the numbers do not: what the budget is is the field beside this one.',
  },
  {
    name: 'consumer-seo',
    who: 'a project deciding whether what it builds has to be found from outside it: the router, '
      + 'then the page that says what Arena writes into the head and which layer writes it',
    entry: 'consumer',
    stops: ['skills/design/references/seo.md'],
    budget: 4_600,
    reason:
      'paid once per project like the skin and the register routes, and taken before the first '
      + 'screen for the same reason they are: the answer reaches the layer and the install rather '
      + 'than a component, so a project that settles it afterwards settles it against code it has '
      + 'already written. What it buys is that the metadata entry point stops being reachable only '
      + 'from the install route, four hundred lines into the longest page on the consumer branch, '
      + 'by a reader who has no reason to be looking for it. Every default it exists to surface is '
      + 'silent in the direction that costs: a route is born unindexed and says nothing about it, '
      + 'and an application with no origin publishes no canonical rather than a wrong one, so both '
      + 'are correct until a screen is missing from a result nobody thought to check. The page '
      + 'carries the question, the three properties and the asymmetry between the layers, and it '
      + 'carries no export table, because the layer\'s own page is where anything a package ships '
      + 'is documented. The number is what the stops measure with room for one section, and it '
      + 'grows when Arena gains something to write into the head rather than when the page gains a '
      + 'paragraph. Raised to 19,300 by a question this route does not ask: the router names the '
      + 'pieces a page is composed from now, and the router is a stop on five consumer routes, so '
      + 'this one is charged for it. That is what a shared stop costs and the reason it is still '
      + 'worth sharing, since the alternative is five routers going stale on five schedules. '
      + 'Raised again to 19,700 by the same arithmetic and a second question this route does not '
      + 'ask: the router asks what Arena ships and how much of it a project takes, and the head is '
      + 'one of the eleven parts that answer names. The shared stop is seven routes wide now, so a '
      + 'question added to the router is charged seven times, and what keeps that worth paying is '
      + 'that the head reaches a reader who came for something else and would never have opened '
      + 'this page on purpose.'
      + ' The figures in this history predate the stop set being narrowed and the budget re-measured '
      + 'against what is left, so every one of them names a number this route does not have. The '
      + 'arguments travel and the numbers do not: what the budget is is the field beside this one. Raised to 4,200 when the section stopped '
      + 'reading as a refusal of the architecture. It opened on there being no server render, which '
      + 'is the one page a project consults while the layer choice is still cheap, and the tree '
      + 'answers each architecture with the evidence behind it: Arena renders no page and lists '
      + 'none, and which one produces it is the project\'s own answer.'
      + ' Raised again to 4,600 when the page stopped picking the framework. It told a project '
      + 'whose framework was still open that Angular is the layer to build on, which is Arena\'s '
      + 'own gap read back as the project\'s decision: what differs is that Arena supplies the '
      + 'head on one layer and a React framework picked to be found supplies its own. The '
      + 'sentence also sent that reader at the layer whose server rendering is held by the '
      + 'weaker half of the evidence, and a product that has to be found is the one most '
      + 'exposed to it, so the pointer to the node carrying that asymmetry is at the decision '
      + 'rather than at the end of the page.'
  },
  {
    name: 'consumer-surface',
    who: 'a project deciding how much of Arena it is taking: the router, then the page naming '
      + 'every part Arena ships, the three steps a project can stop at, and where Arena stops',
    entry: 'consumer',
    stops: ['skills/design/references/surface.md'],
    budget: 10_700,
    reason:
      'paid once per project like the skin, the register and the seo routes, and taken before all '
      + 'three, because each of them asks how much of a thing nobody has shown the reader yet. What '
      + 'it buys is that a consumer stops learning the offer by running out of it. Arena ships a '
      + 'token layer, a set of colour aliases, the role tier, two densities, the components, '
      + 'five stylesheets for markup that is not one, a dozen exports carrying a compatibility '
      + 'promise, a head in one layer, a command that reports as well as writes, and a contract per '
      + 'pattern; the branch documented every one of them and named the whole of it nowhere, so '
      + 'which parts a project found came down to which page it happened to finish. The two '
      + 'measured cases are the rhythm tokens, which no consumer document named at all, and the '
      + 'density classes, which one rules bullet named once. The page is an index rather than a '
      + 'tutorial: every row points at the document that owns the part, which is what keeps it '
      + 'inside this budget and what keeps it from becoming a second router. It also carries the '
      + 'section nothing else could own, where Arena stops, because a limit stated in the document '
      + 'that would have taught you the feature is a limit nobody reads. The number is what the '
      + 'stops measure with room for one part to be added, and it grows when Arena ships something '
      + 'new rather than when the page explains something better: an explanation here is a row that '
      + 'should have been a pointer. '
      + 'Raised again to 25,800 when the density row stopped being two class names. Asked whether '
      + 'Arena answers twice the rows in the same height and a screen a thumb drives, six cold '
      + 'walks found both classes and none could say how one product offers both, which is the '
      + 'question a project actually has: the two are exclusive and neither is a prop, so the '
      + 'swap is a branch on the breakpoint helper rather than a media query, and that is decided '
      + 'here rather than per screen.'
      + ' The figures in this history predate the stop set being narrowed and the budget re-measured '
      + 'against what is left, so every one of them names a number this route does not have. The '
      + 'arguments travel and the numbers do not: what the budget is is the field beside this '
      + 'one. Raised again to 10,500 for the one line this section was missing. The page states '
      + 'every line as a decision rather than a gap waiting to close, and the decision to ship '
      + 'no date picker and no time picker sat in one component prompt three stops away, where '
      + 'a project planning a form reaches it after it has planned one. A page promising the '
      + 'whole line is falsified by any part of it kept somewhere else. Raised again to 10,700 '
      + 'when the same section stopped answering a question that is the project\'s. It opened a '
      + 'line with no server render, where the tree supports one and the cold start tree '
      + 'answers each architecture with the evidence behind it: what Arena ships no tooling for '
      + 'is producing the pages, and a headline naming the architecture instead reads as a '
      + 'refusal on the one page a project consults before choosing.',
  },
  {
    name: 'consumer-stack',
    who: 'a project settling what it installs Arena with and what assembles it: the router, then '
      + 'the page naming every axis, every answer Arena supports on it, and how much evidence '
      + 'each of those answers has',
    entry: 'consumer',
    stops: ['skills/design/references/stack.md'],
    budget: 10_300,
    reason:
      'paid once per project like the surface, skin, register and seo routes, and taken beside the '
      + 'cold start tree rather than after it, because a toolchain settled after the first screen '
      + 'is settled against code already written. What it buys is that a reader stops inheriting '
      + 'Arena. Arena is built with bun, React 18 and Angular 22, and a branch that says nothing '
      + 'about the difference documents its own build as a requirement: every command here was '
      + 'written in one runner, no page named the peer ranges the manifests declare, and one '
      + 'package manager that installs this appeared nowhere at all, so the honest answer and the '
      + 'unasked question were indistinguishable. The evidence column is most of what the page '
      + 'costs and all of what makes it usable: an answer allowed by a manifest and never '
      + 'exercised is worth having and is not worth the same as one a suite runs, and a page that '
      + 'flattened the two would trade a silence a reader can notice for a confidence they '
      + 'cannot. What it deliberately does not carry is the layer decision and the render '
      + 'architecture, which are nodes eight and nine of the cold start tree: naming them here '
      + 'would give a project two places to answer one thing, and the tree is where the answer '
      + 'reaches a peer dependency rather than a preference.',
  },
  {
    name: 'consumer-page',
    who: 'anybody writing markup that is not a component, which is every project: the router, then '
      + 'the page saying what colour their own markup takes, what column it sits in and how much '
      + 'air goes between two components',
    entry: 'consumer',
    stops: ['skills/design/references/page.md'],
    budget: 14_200,
    reason:
      'the one consumer route past the router that is not paid per project or per screen but per '
      + 'element a builder draws themselves, which every screen has. What it buys is the half of a '
      + 'page that is never a component, and every part of it was reachable before only as a table '
      + 'row: the floor arrived as one row of the router, six hundred characters wide, and the air '
      + 'and the column as one row pointing at a stylesheet table four hundred lines into an npm '
      + 'page. Both of those rows are pointers here now, so a third of this route was bought back '
      + 'out of the stop it shares. What it adds beyond them is what no row had space for: which of '
      + 'the nineteen colour roles each thing a builder draws takes, that the three rhythm steps are '
      + 'custom properties as well as classes, that the alignment modifiers carry no length, and the '
      + 'cut that decides which side of a gap a builder owns, since air between two components comes '
      + 'from here and air inside one is a role answered in a style plugin. It closes on the same '
      + 'least-to-most the surface page opens with, because the answer for a first screen and the '
      + 'answer for a product with its own appearance are the same names read twice. The number is '
      + 'what the stops measure with room for one section, and it grows when Arena ships a piece for '
      + 'markup of somebody else\'s rather than when this page argues for one it already '
      + 'names. Raised again to 26,100 when the group step gained the shape of the miss it '
      + 'replaces. A cold walk that had read this page still wrote a column of its own carrying a '
      + 'display, a direction and a gap inside a table cell, which is what the group class already '
      + 'is, so the sentence telling a builder to reach for the class first is the one sentence '
      + 'here that was read and passed over. Naming the case costs a paragraph, and it is what '
      + 'separates a rule a builder agrees with from one they apply. '
      + 'Raised again to 27,700 when the colour section gained the level beside the role. A role '
      + 'says which colour text takes and a level says how far it is held back, and under the '
      + 'default style plugin ink-muted and ink-body resolve to the same colour, so a bare ink- '
      + 'muted paints a caption at full strength and no gate reports it. Five of six cold walks '
      + 'shipped exactly that, and the one that did not found the idiom in a compiled component '
      + 'sheet, which this branch tells a builder never to target. The block air the band leaves '
      + 'is here for the same reason: all six invented a padding for it because the column '
      + 'section said what the band carries and never what it leaves. Raised again to 29,900 by '
      + 'three more measured misses on this same page. Four of six walks wrote a hand-rolled flex '
      + 'strip for a short horizontal group inside an app bar, because the row was described as a '
      + 'wrapping line and a two element lock-up does not read as one, so the row is stated as the '
      + 'horizontal half of the three steps and the wrapping is a property it has rather than the '
      + 'test for whether it applies. One walk refused to put a class on an Arena element, which '
      + 'is right, and wrote no wrapper, which leaves the shell distributing its slack to nothing, '
      + 'so the page says what to do when the element that has to be laid out is a component. And '
      + 'the gutter is stated as a ceiling, since a length answered for a full width page leaves a '
      + '430px viewport spending two fifths of itself on margin.'
      + ' The figures in this history predate the stop set being narrowed and the budget re-measured '
      + 'against what is left, so every one of them names a number this route does not have. The '
      + 'arguments travel and the numbers do not: what the budget is is the field beside this one.',
  },
  {
    name: 'consumer-coldstart',
    who: 'an agent starting a project that has no appearance of its own: the router, then the tree, '
      + 'then whichever of its branches the answers unlock',
    entry: 'consumer',
    branches: [
      { name: 'the tree alone', stops: ['skills/design/references/cold-start.md'] },
      {
        name: 'a catalogue entry',
        stops: [
          'skills/design/references/cold-start.md',
          'plugin-style-store/catalogue/*/ENTRY.md',
        ],
      },
    ],
    budget: 23_700,
    reason:
      'the first route on this branch that is declared as a tree, and the reason the shape exists. '
      + 'A reader here answers a question and walks one way: handed a document stating the palette '
      + 'and the type, they read the tree and go on; handed nothing and unwilling to be '
      + 'interviewed, they read the tree and one entry of the catalogue. Charging both branches '
      + 'would price a journey nobody takes and would make the catalogue look like a tax on every '
      + 'cold start rather than the answer to one branch of it. The worst branch is the catalogue '
      + 'one, and its second stop is a glob over the entries so the figure is the largest of them '
      + 'rather than the one that happens to be first. The number is what the two stops measure '
      + 'today with room for one entry to grow, and what it is argued against is that this route '
      + 'is paid once per project by a reader who would otherwise be guessing: the alternative to '
      + 'reading it is an agent inferring a palette from a screenshot, which costs nothing here '
      + 'and costs the project every screen. A branch is added when an answer sends a reader to a '
      + 'document the others never open, and never to describe a node they all read. Raised '
      + 'from 13,100 when the tree gained the two decisions that reach an install rather than a '
      + 'screen: how much of the product has to be found from outside it, which decides a layer '
      + 'and turns an optional peer into a required one, and what the application is assembled '
      + 'on, which is where the architecture claims are stated with what holds each of them up. '
      + 'The pair is what lets the last node derive the dependency list from the answers instead '
      + 'of asking about dependencies, and it is charged here rather than on the install route '
      + 'because a project reaching the install page has already chosen the layer this node chooses. It grew because the thing it describes grew, which is the one reason a budget should '
      + 'ever move. It grew again when node 4 gained what it matches a description against, which '
      + 'is the one line every ENTRY.md carries and not the entries themselves. That line is what '
      + 'keeps the second stop at a single entry as the catalogue grows: matching on the entries '
      + 'would make this route cost the whole catalogue, and the glob would stop being a fair '
      + 'charge the day a second register landed. The entry stop grew with it, because the '
      + 'catalogue now holds registers that depart from the answers the first ones converged '
      + 'on, and an entry that departs has to say so in its own table or a reader takes its '
      + 'roles for the shared answer and inherits a decision nobody made. A row is worth the '
      + 'characters when it names a role this register answers differently, and it is worth '
      + 'none when it restates the sheet sitting beside it. Raised again to 23,300 when the warm '
      + 'branch gained its exit. The node that reads what a project already carries handed the '
      + 'reader on to the nodes that decide an install, so a project with an approved config was '
      + 'routed into writing one again, and nothing in the tree said which of its nodes a project '
      + 'already carrying Arena has spent. The exit is what makes the first node\'s two answers '
      + 'reach two different ends rather than the same one, and it is charged here because the '
      + 'tree is where a reader is when they need it. Raised again to 23,600 when the catalogue '
      + 'stopped being reachable only by refusing the interview. Node 4 was titled a last '
      + 'resort and node 3 reached it from the row where the user will not answer, so a project '
      + 'that would rather pick a measured register than invent one had no row anywhere and was '
      + 'interviewed instead. Node 2 asks where the appearance comes from and a measured '
      + 'register is one of its answers, so the row belongs there, and the node it reaches says '
      + 'that two arrivals take it. It carries the verb as well: an entry is copied rather than '
      + 'cited, and the one page saying so was the catalogue\'s own AGENTS.md, on the branch this '
      + 'reader is told not to read, so a walk that reached the entry correctly then guessed at '
      + 'what to do with it.',
  },
  {
    name: 'contributor-component',
    who: 'a contributor adding or changing a component: the router, the frameworks roof, then the '
      + 'layer that binds it',
    entry: 'contributor',
    stops: ['frameworks/AGENTS.md', 'frameworks/*/AGENTS.md'],
    budget: 71_000,
    reason:
      'the most-walked contributor route and the one carrying the most reasoning per stop. It is '
      + 'allowed to cost more than any consumer route because it is paid by whoever changes Arena '
      + 'and never by whoever uses it. What it may not carry is one category\'s own tour: the '
      + 'chart family is a fourth stop, frameworks/CHARTS.md, for whoever changes a chart, and '
      + 'charging every component change for it cost a fifth of this route. Raised from 83,000 '
      + 'when the branch named the convention it answers to and the two places it departs from '
      + 'one: a contributor who does not know the consumer branch is a skill adds an eighteenth '
      + 'file under the reserved name, and the cost of that is paid by every reader of the tag. '
      + 'Raised from 84,500 when the Angular stop gained the rule deciding which primitives are an '
      + 'attribute on a native element rather than an element of their own. That is not one '
      + 'family\'s tour: the question it answers -- would wrapping this element break what the '
      + 'element means -- is asked of every primitive, and the two consequences it carries, that an '
      + 'output named after a DOM event cannot be listened to from the host block and that the demo '
      + 'emitters read the declared selector, are ones a contributor hits by writing the component '
      + 'and not by reading about the table. Left out of the roof and out of a family page for the '
      + 'same reason: only one layer authors elements a consumer nests, so only that layer '
      + 'decides. Raised to 69,500 when the architecture envelope was written down on the three '
      + 'stops that own it. A consumer adopts Arena on a tree whose last nodes tell a project it '
      + 'may server-render, prerender or embed as a fragment, and what each answer costs in '
      + 'dependencies; every one of those is a property of the sources this route reaches, and '
      + 'the whole of it was unwritten. What that cost was measured on the consumer bench: a '
      + 'module-scope read of a browser global throws at import time during a server render, so '
      + 'the stack names the import and never the component that caused it, and a contributor '
      + 'fixing something else has no way to know the claim existed. check:architecture holds the '
      + 'mechanical half now, and this route is where its reader is told which escapes are '
      + 'correct rather than only that the gate failed. The roof carries what binds both layers '
      + 'and each layer carries its own envelope and its own peer, which is the split that keeps '
      + 'the pair from going stale in one of them. Raised to 70,000 when the Angular stop gained '
      + 'the fourth trap: the layer writes an optional member\'s default twice, as the initial '
      + 'value and again as the fallback of the transform that resolves an absence, and only one '
      + 'of the two runs for any given caller. It is charged here rather than to a family page '
      + 'because every optional member in the layer carries the shape, and it is charged at all '
      + 'because no gate holds the PAIR: the two halves are read by two gates that each know one '
      + 'of them and neither knows they are one decision. Measured on a consumer bench, where one '
      + 'grid drew six columns against the five the same config drew beside it. Raised to 71,000 '
      + 'when the ordered steps stopped omitting two things a new component cannot ship without. '
      + 'The step naming each layer shape said trio and quartet and stopped there, while the '
      + 'barrel chain that makes an Angular primitive typechecked at all sat two hundred lines '
      + 'downstream under a heading about verifying the layer, so a contributor reading the steps '
      + 'in order shipped a primitive check:angular never compiled and no adopter could import. '
      + 'And no step said to write suites, which left the one fixture whose walk is bidirectional '
      + 'outside the list entirely: a component owning a contentChildren query cannot ship '
      + 'without an entry there, and the steps that claim each one produces what the next reads '
      + 'never said so. Both belong to the route rather than to a layer, because the steps are '
      + 'what a contributor reads once and in order, and a layer page is what they return to '
      + 'after something has already gone wrong.',
  },
  {
    name: 'contributor-authoring',
    who: 'a contributor about to edit a file and deciding which half of it is theirs: the router, '
      + 'then the page that says what a machine writes and where the boundary runs inside one file',
    entry: 'contributor',
    stops: ['GENERATED.md'],
    budget: 7_900,
    reason:
      'paid once per contributor rather than per change, which is what lets it carry the whole '
      + 'surface rather than a pointer to it. It is the shortest contributor route on purpose: what '
      + 'it answers is asked before the first edit, by a reader who has not chosen a task yet, and a '
      + 'route that costs more than the change it precedes is one nobody walks. Three cold walks '
      + 'converged on it independently, one per other contributor route, and each had decided '
      + 'generated against authored by opening files rather than by being told: a component source '
      + 'carrying an emitted doc comment with no marker on it, a prompt read as wholly generated '
      + 'when it is mostly prose, and a manifest whose existence no stop on the route mentions. '
      + 'Every one of those mistakes ships green, which is the argument for a stop of its own '
      + 'rather than a paragraph on a page a task chooses. The number is what the stops measure '
      + 'with room for one section, and it grows when a generator gains a shape rather than when '
      + 'the page gains a paragraph, since the shapes are derived from what each node declares it '
      + 'writes. Raised to 7,900 when a generator gained the shape this page had no name for: '
      + 'a file written into a repository that is not this one. Nothing here can observe such a '
      + 'file, so the section says which instrument reads it and who runs that instrument, and '
      + 'it names the payload as generated too, since a prompt found inside a package is one a '
      + 'contributor would otherwise correct in the copy rather than in its source.',
  },
  {
    name: 'contributor-token',
    who: 'a contributor moving a value: the router, the contracts roof, the design specification '
      + 'and the shape a token is authored in',
    entry: 'contributor',
    stops: ['contracts/AGENTS.md', 'contracts/design/AGENTS.md', 'contracts/design/TokenTypes.md'],
    budget: 65_600,
    reason:
      'the normative half of the tree, where a stop is read for what a value MEANS rather than for '
      + 'how to write one, so it is bounded by what a person can hold rather than by what an agent '
      + 'can afford. Raised from 72,000 when the role tier went from 28 roles to 63 and grew a '
      + 'ninth token type: TokenTypes.md has to state what a keyword is and why it is the one '
      + 'departure from 2025.10, and the design specification has to say why a style plugin now '
      + 'reaches type, ink and internal air. Raised again to 77,000 when the muted percentages '
      + 'stopped being literals frozen into a hundred compiled sheets and became a level tier a '
      + 'palette moves: the specification has to say that those numbers are floors, that a level '
      + 'is raised and never lowered, and what raising one costs the hierarchy it belonged to. '
      + 'The route is longer because the thing it describes is bigger, which is the one reason a '
      + 'budget should ever move.'
      + ' The figures in this history predate the stop set being narrowed and the budget re-measured '
      + 'against what is left, so every one of them names a number this route does not have. The '
      + 'arguments travel and the numbers do not: what the budget is is the field beside this one.'
      + ' The last raise was bought by this level answering a second reader. contracts/design/ is '
      + 'what a platform target reads first, and a target that is not a browser cannot derive from '
      + 'a value and a unit what the reader asking for larger text does to it, so TokenTypes.md '
      + 'states that axis, what each of its three words obliges on each platform, and why the '
      + 'emission here does not follow it. It also states the three shapes in the type map that read '
      + 'one way on the web and another everywhere else, which is where a target would otherwise '
      + 'guess: a keyword inherits no transform, a font stack ends in generic families that name '
      + 'nothing off the web, and a unit hint on a bare number is an instruction for one platform. '
      + 'The level describes something bigger rather than the same thing at more length, which is '
      + 'the one reason this budget moves. It also states, where the values are decided rather '
      + 'than where a gate is registered, that target size is density\'s axis: what each density '
      + 'clears, and that compact clears neither floor and is therefore not offerable to a thumb. A '
      + 'reader picking a density for a phone needs that sentence in the specification and not in a '
      + 'gate they have no reason to open. And it names a fourth thing DTCG deliberately does not '
      + 'model, beside the colour derivations, the font loading and the device geometry: whether the '
      + 'reader asked for a stronger interface, which has no value until there is a device. Three '
      + 'cases the kernel answers and one it refuses, because an accent drawn as ink is a decision '
      + 'over a palette this level does not know.',
  },
  {
    name: 'contributor-gate',
    who: 'a contributor writing or moving a gate: the router, the scripts roof, the check roof and '
      + 'the domain the gate lands in',
    entry: 'contributor',
    stops: ['scripts/AGENTS.md', 'scripts/check/AGENTS.md', 'scripts/check/*/AGENTS.md'],
    budget: 90_700,
    reason:
      'the route this repository asks a contributor to take most often after the component one, '
      + 'and the one whose last stop grows every time a gate lands, since a gate states its whole '
      + 'claim in one table row. The headroom is deliberately a few rows wide: a budget a single '
      + 'new row breaks reports the row rather than the growth it is there to report, and that '
      + 'has happened often enough to be the ordinary case rather than the exception. **Do not '
      + 'read a raise history here.** The one this string used to carry ended at a figure this '
      + 'route does not have, because the budgets on this branch were re-measured against the '
      + 'tree and clamped to it while the narratives were left behind, so a contributor arguing '
      + 'a raise read a number nothing held. Only the argument in such a history travels, and '
      + 'the argument is this: the measurement is worth more than the figure, so derive the '
      + 'median and the longest row with awk over the rows of the domain table before writing '
      + 'one, because the row that breaks a budget is the long one and the median is what says '
      + 'how often that happens. Raised to 83,500 when the gate checklist stopped under-reporting '
      + 'what a gate owes: it framed the registrations as a list plus two outside the file while '
      + 'the per-domain count in its own table is one more that fails on its own, and it told a '
      + 'contributor that nothing has to be written down for a node-less gate to run, which is '
      + 'true of the cache and false of check:graph. That sentence sent a reader to write a gate '
      + 'that goes red on the one rule the nearest page had just excused them from. Raised to '
      + '84,500 when check:workflow-scripts landed, which is one row and the ordinary case this '
      + 'budget is written around. The row runs longer than the median because its claim is a '
      + 'failure this tree has already paid for rather than a rule somebody thought of: a job '
      + 'that installs nothing resolved a pinned dependency to whatever the registry served, the '
      + 'throw was swallowed by a process substitution, and the guard that reads a list of paths '
      + 'read none. A contributor deciding whether their own gate owes that much needs the '
      + 'failure and not the rule. Raised to 87,000 when the contracts package landed with three '
      + 'gates at once, which is a case this budget has not had to hold before: a channel out of '
      + 'the repository is not one claim but three, and they arrive together or the artefact ships '
      + 'unheld. Measured the way this string says to, before the raise rather than after it: over '
      + '48 rows the median is 951 characters and the longest is 3,942, and the three new rows are '
      + '789, 856 and 677, so every one of them sits under the median and the raise pays for their '
      + 'number rather than for their length. Raised to 88,000 for the target-size row, measured '
      + 'the same way: over 49 rows the median is still 951 and the longest still 3,942, and the new '
      + 'row is 1,066. It runs a little past the median because its claim is a measurement rather '
      + 'than a rule, and what a contributor needs from it is what it measures and what it refuses '
      + 'to measure: the activation box rather than the painted one, only inside a named part, and '
      + 'in the density nothing else in this repository draws. Raised to 88,500 when check:citations widened from one surface to three, which is the case the paragraph above does not cover: no row landed and one row grew, from 1,927 characters to 2,840, over the same 49 rows whose median is 951 and whose longest is 3,942. A gate states its whole claim in one row, so a claim that widens is a row that grows, and the only alternative on offer is a row describing a third of what the gate reads. Raised to 89,600 for the check:support row, measured the way this string says to: over 50 rows the median is 972 characters and the longest is still 3,942, and the new row is 1,030. It sits just past the median because what a contributor needs from it is a failure this branch already shipped rather than a rule somebody thought of: bunx was written into five consumer pages while the command they name is a Node program, so the documentation carried a runtime dependency Arena does not have and no gate could see it. The raise pays for one row, which is the ordinary case this budget is written around. '
      + 'Raised to 90,700 for the check:mcp row, measured the same way: over 51 rows the median '
      + 'is 994 characters and the longest is still 3,942, and the new row is 1,017. It sits at '
      + 'the median, and what it buys is the one claim of that gate a contributor cannot infer '
      + 'from the package it judges: the emptiness is the assertion. A server carrying no corpus '
      + 'reads as an oversight until a gate says the corpus is refused and says why, and a '
      + 'comment claiming it would hold nothing.',
  },
  {
    name: 'contributor-tailwind',
    who: 'a contributor changing how a component looks and nothing about what it is: the router, '
      + 'then the one layer that owns an appearance decision for both frameworks at once',
    entry: 'contributor',
    stops: ['frameworks/tailwind/AGENTS.md'],
    budget: 44_000,
    reason:
      'the row a contributor takes when a shape, a colour or a state is wrong and the API is not, '
      + 'and it went unbudgeted for as long as the routing table has carried it. What that cost is '
      + 'was measured on a cold walk: the file a corner radius actually moves in is a style plugin '
      + 'under plugin-style-store, four stops from the router, because the appearance Arena '
      + 'installs with IS a plugin and no page on the way said so. One stop, and it is the largest '
      + 'single page on the contributor branch, so what this budget holds down is the document most '
      + 'likely to grow by a hazard nobody routes to and everybody meets.',
  },
  {
    name: 'contributor-behaviour',
    who: 'a contributor answering a report about a role, a key, focus or a dismissal: the router, '
      + 'the contracts roof, then the level that says what a kind of component must do',
    entry: 'contributor',
    stops: ['contracts/AGENTS.md', 'contracts/behaviour/AGENTS.md'],
    budget: 38_600,
    reason:
      'the route a bug report takes, which is the arrival the routing table had no row for until '
      + 'the symptom rows landed, and the one whose answer is most often that nothing in the code '
      + 'is broken: a requirement no suite pins is unfalsifiable rather than unverified, and that '
      + 'paragraph is what a reader comes here for. It is budgeted apart from the component route '
      + 'because the two share no stop past the roof, and because this one is paid by whoever is '
      + 'holding a defect rather than by whoever is adding a component. The level answers a second '
      + 'reader now, which is what the last raise bought: a pattern names the role it requires as a '
      + 'field rather than only inside prose, and the rule about native semantics states the half '
      + 'that applies where there is no browser to supply them. Both are the level describing '
      + 'something bigger rather than describing the same thing at more length, which is the one '
      + 'reason a budget moves. The roof above it grew for the same kind of reason: contracts/ now '
      + 'holds a page written for somebody who is not changing Arena at all, the one npm shows for '
      + 'the contracts package, and the roof is where a reader is told that page exists and who it '
      + 'is for.',
  },
  {
    name: 'contributor-release',
    who: 'a contributor cutting a release: the router, the order the moves are made in, what a '
      + 'package is, and what CI does with the tag once it exists',
    entry: 'contributor',
    stops: ['versioning_steps.md', 'frameworks/PACKAGING.md', '.github/workflows/AGENTS.md'],
    budget: 64_000,
    reason:
      'the least frequent route on the branch and the most expensive one to get wrong, because '
      + 'every one of its failures publishes nothing and errors nowhere. It is budgeted now '
      + 'because the document carrying the sequence was a .txt until this route existed, so every '
      + 'documentation gate walked past it: its own citations went unchecked, so did the two pages '
      + 'naming it, and one of its commands pushed the tag to whatever branch was checked out '
      + 'while the publish workflows listen on one. A cold walk reached the procedure at all only '
      + 'by reading to the middle of a CI page. The sequence is the first stop because it is what '
      + 'a reader needs first, and the other two are what it sends them to rather than what they '
      + 'open instead. Raised to 55,100 when the operating system matrix moved off the pull '
      + 'request and onto the merge into develop, because that move puts a precondition on this '
      + 'route: needs does not cross workflows, so no required check on a merge request to main '
      + 'reads a platform result, and what carries it instead is that the merge request is opened '
      + 'on a green develop. A reader cutting a release who does not know that reads a green '
      + 'required check as an answer about three operating systems, and it is an answer about '
      + 'one. Raised to 57,200 when the publish guard was made to fail closed. A reader cutting a '
      + 'release has to know that "nothing this package carries has moved" is a real answer and '
      + 'not a fault, and that the guard reaches it by asking the assembler which of a directory '
      + 'ships rather than by keeping a second list of globs in step. The version of it that '
      + 'could not read its own list of paths republished both packages from a diff of the whole '
      + 'tree at 10.0.1 and 10.1.0 and wrote publish into the run summary while doing it, which '
      + "is this route's failure mode exactly: nothing errored, and nobody was told."
      + ' Raised to 58,300 when a third package landed. The packaging page opened by saying there '
      + 'were two, which stopped being true, and a reader cutting a release needs to know at that '
      + 'point that the third is not a layer, that its consumer has no Node, and that the CSS '
      + 'chain, the CLI and the peer dependencies the rest of that page is about apply to neither '
      + 'of its files. Raised to 60,400 when that package gained a publisher of its own. A reader '
      + 'cutting a release now has a third workflow, and two things about it are true of neither of '
      + 'the others: its publish step is npm and not Bun, because bun publish does not speak OIDC '
      + 'and a tarball leaving through it would be unattested, and configuring a trusted publisher '
      + 'for a name that has never been published needs an explicitly selected allowed action since '
      + 'May 2026 and may not be possible at all before a first version exists. Both are things this '
      + 'route otherwise discovers at the worst moment, and the sequence itself carries them '
      + 'rather than sending a reader to a CI page mid-release. Raised to 62,900 when the release '
      + 'page stopped following the push of the tag and started following a green Arena main. That '
      + 'moves a step of this sequence: the tag now has to exist before that run finishes, which is '
      + 'what --follow-tags buys, and a page that never appeared is written by dispatching the '
      + 'workflow by hand and by nothing else. A reader who does not know it waits for a page that '
      + 'no event is coming for, which is this route\'s failure mode again: nothing errored, and '
      + 'nobody was told. Raised to 63,300 for the one artefact of a release that no gate here '
      + 'can observe. The command each package ships writes a discovery record into a consumer '
      + 'tree, and nothing in this repository holds one, so the version it stamps is checked by '
      + 'installing the packed package and running the command or it is checked by nobody: a '
      + 'record carrying the previous number is what every project installing the release would '
      + 'then be told to keep. This route\'s failure mode once more, and the sequence carries '
      + 'the step rather than sending a reader to find it. Raised to 64,000 when a fourth '
      + 'package landed, which is the case the third already argued and this route pays again: a '
      + 'reader cutting a release has one more workflow, and what is true of this one is true of '
      + 'none of the others. It is the only package here declaring a runtime dependency, and it '
      + 'carries no document at all, so the two things a reader would otherwise check by opening '
      + 'the tarball are the two a gate asserts instead.',
  },
];

export function branchesOf(route: Route): Branch[] {
  return route.branches ?? [{ stops: route.stops ?? [] }];
}

export const node = {
  name: 'check:routes',
  reads: [...new Set([
    ...ENTRIES.map((entry) => entry.router),
    ...ROUTES.flatMap((route) => branchesOf(route).flatMap((branch) => branch.stops)),
  ])],
  writes: [],
  feeds: [],
};

export const SKIPPED_ANYWHERE = new Set(['node_modules', '.git', 'dist', 'build', 'vendor']);

export function skips(name: string) {
  return SKIPPED_ANYWHERE.has(name);
}

export function documents(base = root) {
  return walkFiles(base, { skip: (name) => skips(name) })
    .filter((path) => path.endsWith('.md'))
    .map((path) => relPosix(base, path));
}

export type Charge = { stop: string; rel: string; chars: number };

export function largestReached(stop: string, universe: string[], base = root): Charge | null {
  const reached = resolveSpecs([stop], universe);
  let charge: Charge | null = null;
  for (const rel of reached) {
    const chars = readFileSync(join(base, rel), 'utf8').length;
    if (!charge || chars > charge.chars) charge = { stop, rel, chars };
  }
  return charge;
}

export function chargeStops(stops: string[], universe: string[], base = root) {
  const charged: Charge[] = [];
  const unreached: string[] = [];
  for (const stop of stops) {
    const charge = largestReached(stop, universe, base);
    if (charge) charged.push(charge);
    else unreached.push(stop);
  }
  return { charged, unreached, total: charged.reduce((sum, one) => sum + one.chars, 0) };
}

export function measureEntry(entry: Entry, universe: string[], base = root) {
  const { charged, unreached, total } = chargeStops([entry.router], universe, base);
  return { entry, charged, unreached, total };
}

export function measure(route: Route, universe: string[], base = root) {
  const measured = branchesOf(route).map((branch, index) => ({
    branch,
    name: branch.name ?? `the ${route.name} branch`,
    index,
    ...chargeStops(branch.stops, universe, base),
  }));
  const worst = [...measured].sort((a, b) => b.total - a.total)[0];
  return {
    branches: measured,
    worst,
    charged: worst?.charged ?? [],
    unreached: measured.flatMap((one) => one.unreached),
    total: worst?.total ?? 0,
  };
}

export function unreachedProblems(route: Route, unreached: string[]) {
  return unreached.map((stop) =>
    `${route.name}: the stop ${stop} reaches no document, so the route describes a tree that moved `
    + 'under it and the cost it reports is of a journey nobody can take',
  );
}

export function overBudgetProblems(
  name: string, reason: string, budget: number, charged: Charge[], total: number, what = 'route',
) {
  if (total <= budget) return [];
  const worst = [...charged].sort((a, b) => b.chars - a.chars)[0];
  return [
    `${name}: costs ${total} characters against a budget of ${budget}. ${reason} `
    + `The stop spending most of it is ${worst?.rel} at ${worst?.chars}. Move a level's own tour `
    + `into that level and leave the cross-level rule with a pointer, or argue the ${what}'s budget `
    + 'up here with the reason.',
  ];
}

export function staleBudgetProblems(name: string, budget: number, total: number) {
  const floor = Math.round(budget * BUDGET_SLACK);
  if (total >= floor) return [];
  return [
    `${name}: costs ${total} characters against a budget of ${budget}, which it has `
    + `fallen ${budget - total} under. An allowance is not an exemption: lower the budget to `
    + 'what it now costs, or the next paragraph spends a saving nobody argued for.',
  ];
}

export function entryProblems(route: Route, entries = ENTRIES) {
  if (entries.some((entry) => entry.name === route.entry)) return [];
  return [
    `${route.name}: opens with the entry "${route.entry}", and no entry is declared under that `
    + 'name. A route is what a reader pays PAST its router, so one whose router is not declared '
    + 'reports a cost that leaves the first document out.',
  ];
}

export function zeroScanProblems(routes: Route[], universe: string[], entries = ENTRIES) {
  const problems = [];
  if (entries.length === 0)
    problems.push('declared 0 entries, so every route reports what it adds and nothing reports the '
      + 'page each of them opens with');
  if (routes.length === 0)
    problems.push('declared 0 routes, so this gate holds no reader to anything and reports clean');
  if (universe.length === 0)
    problems.push('walked 0 documents, so every stop reads as unreachable and no cost is measured at all');
  for (const entry of entries)
    if (!routes.some((route) => route.entry === entry.name))
      problems.push(`the entry ${entry.name} is declared and no route opens with it, so its budget `
        + 'holds a page nobody is measured reading');
  for (const route of routes)
    for (const branch of branchesOf(route))
      if (branch.stops.length === 0)
        problems.push(`${route.name}: ${branch.name ?? 'a branch'} declares no stop, so it costs `
          + 'nothing and is the branch every measurement of this route will pick as its cheapest');
  return problems;
}

export function routeProblems(base = root, routes = ROUTES, entries = ENTRIES) {
  const universe = documents(base);
  const problems = [...zeroScanProblems(routes, universe, entries)];
  const opened = new Map<string, ReturnType<typeof measureEntry>>();
  const measured = [];

  for (const entry of entries) {
    const one = measureEntry(entry, universe, base);
    opened.set(entry.name, one);
    problems.push(
      ...one.unreached.map((stop) =>
        `${entry.name}: the router ${stop} reaches no document, so every route opening with it `
        + 'reports a cost that starts at the second page'),
      ...overBudgetProblems(entry.name, entry.reason, entry.budget, one.charged, one.total, 'entry'),
      ...staleBudgetProblems(entry.name, entry.budget, one.total),
    );
  }

  for (const route of routes) {
    const named = entryProblems(route, entries);
    problems.push(...named);
    const { branches, worst, charged, unreached, total } = measure(route, universe, base);
    const opening = opened.get(route.entry)?.total ?? 0;
    measured.push({ route, branches, worst, charged, total, opening, whole: opening + total });
    problems.push(
      ...unreachedProblems(route, unreached),
      ...(named.length > 0 ? [] : [
        ...overBudgetProblems(route.name, route.reason, route.budget, charged, total),
        ...staleBudgetProblems(route.name, route.budget, total),
      ]),
    );
  }

  return { problems, measured, opened: [...opened.values()], scanned: universe.length };
}

function main() {
  const { problems, measured, opened, scanned } = routeProblems();
  for (const { entry, total } of opened)
    console.log(`  ${String(total).padStart(6)} / ${String(entry.budget).padStart(6)}  `
      + `${entry.name} (${entry.router})`);
  for (const { route, worst, total, whole } of measured)
    console.log(`  ${String(total).padStart(6)} / ${String(route.budget).padStart(6)}  `
      + `${route.name} past ${route.entry}, ${whole} whole`
      + `${route.branches ? `, worst branch ${worst?.name}` : ''}`);

  if (problems.length > 0) {
    console.error(`\ncheck-routes: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`\ncheck-routes: ${opened.length} entr(ies) and ${measured.length} route(s) inside `
    + `their budget, over ${scanned} document(s)`);
}

if (isMainModule(import.meta.url)) main();
