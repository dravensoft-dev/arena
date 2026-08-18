import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, DestroyRef, effect,
  inject, input, output, signal, untracked,
} from '@angular/core';
import { ArenaSideNavState, arenaIndentFor } from '../arena-side-nav/ArenaSideNavState';
import { arenaSideNavStyles } from '../arena-side-nav/ArenaSideNav.variants';
import manifest from '../arena-side-nav/ArenaSideNav.classes.generated';

@Component({
  selector: 'arena-side-nav-collapsible',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaSideNavState],
  host: {
    '[class]': 'styles().section()',
    '[attr.data-arena-part]': 'parts.section',
    '[attr.id]': 'null',
  },
  template: `
    <button type="button" [id]="triggerId()" [class]="styles().trigger()" [attr.data-arena-part]="parts.trigger"
            [style.paddingInlineStart]="indent()"
            [attr.aria-expanded]="expanded()" [attr.aria-controls]="regionId()"
            (click)="press()" (keydown)="onKeydown($event)">
      @if (icon(); as glyph) {
        <i [class]="styles().icon() + ' ' + glyph" [attr.data-arena-part]="parts.icon" aria-hidden="true"></i>
      }
      <span [class]="styles().triggerLabel()" [attr.data-arena-part]="parts.triggerLabel">{{ heading() }}</span>
      <i [class]="styles().caret() + ' ' + caretGlyph()" [attr.data-arena-part]="parts.caret" aria-hidden="true"></i>
    </button>
    <div [id]="regionId()" [class]="styles().region()" [attr.data-arena-part]="parts.region" role="group"
         [attr.aria-labelledby]="triggerId()" [hidden]="!expanded()">
      <ng-content />
    </div>
  `,
})
export class ArenaSideNavCollapsible {
  protected readonly parts = manifest.parts;

  /** Identifies the group. The disclosure pattern needs two DOM ids that resolve -- the trigger's aria-controls must name the region, and the region's aria-labelledby must name the trigger -- and Arena derives both from this member, as `${id}-trigger` and `${id}-region`. Neither wiring is conditional: every collapsible has a trigger and a region, so there is no shape in which the id goes unused, and that is why it is required rather than optional. A group is a thing a consumer names anyway. Falsy-guarded as well as required: a blank id yields the pair `-trigger`/`-region`, which every other blank-id collapsible on the page would share, and duplicate ids make aria-controls resolve to the wrong element rather than to none. A consumer can address either element from outside as a consequence -- an aria-describedby, a deep link, a test hook -- but that is a benefit of the derivation, not the reason for it. */
  readonly id = input.required<string>();
  /** What the trigger reads, and the accessible name of both the trigger and the region it controls. Required and falsy-guarded. */
  readonly label = input.required<string>();
  /** A Phosphor class name drawn before the label. The caret that reports expanded-ness is Arena's own and is not this member. */
  readonly icon = input<string>();
  /** Whether the group starts open. It is a seed, not a control: after the first render the state is the component's, and the group also opens itself when it comes to hold the active destination. */
  readonly defaultExpanded = input(false, { transform: booleanAttribute });
  /** The trigger was pressed, carrying the state it moved to. It fires on a press ONLY: the automatic expansion that follows the active destination is Arena's decision rather than the user's, and reporting it here would be a lie a consumer persists. */
  readonly toggle = output<boolean>();

  private readonly parent = inject(ArenaSideNavState, { skipSelf: true });
  private readonly own = inject(ArenaSideNavState);
  private readonly open = signal<boolean | null>(null);

  protected readonly triggerId = computed(() => `${this.key()}-trigger`);
  protected readonly regionId = computed(() => `${this.key()}-region`);
  protected readonly expanded = computed(() => this.open() ?? (this.defaultExpanded() || this.holdsActive()));
  protected readonly caretGlyph = computed(() => (this.expanded() ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'));

  protected readonly holdsActive = this.own.holdsActive;

  protected readonly heading = computed(() => {
    const text = this.label();
    if (text.trim() === '') {
      throw new Error('ArenaSideNavCollapsible: `label` is required, and names the group its trigger opens');
    }
    return text;
  });

  protected readonly indent = computed(() => arenaIndentFor(this.parent.indentStep(), this.parent.depth()));
  protected readonly styles = computed(() => arenaSideNavStyles());

  constructor() {
    this.own.depth = computed(() => this.parent.depth() + 1);
    this.own.activeId = this.parent.activeId;
    this.own.indentStep = this.parent.indentStep;
    this.own.activate = (id: string) => this.parent.activate(id);
    this.parent.adopt(this.own);
    inject(DestroyRef).onDestroy(() => this.parent.orphan(this.own));

    effect(() => {
      const holds = this.holdsActive();
      untracked(() => {
        if (holds) this.open.set(true);
      });
    });
  }

  protected press(): void {
    const next = !this.expanded();
    this.open.set(next);
    this.toggle.emit(next);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.press();
  }

  private key(): string {
    const id = this.id();
    if (id.trim() === '') {
      throw new Error('ArenaSideNavCollapsible: `id` is required, and is what its trigger and its region are named from');
    }
    return id;
  }
}
