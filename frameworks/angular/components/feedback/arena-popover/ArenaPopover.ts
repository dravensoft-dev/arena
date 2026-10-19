import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, TemplateRef, afterNextRender,
  afterRenderEffect, booleanAttribute, computed, inject, input, output, untracked, viewChild,
} from '@angular/core';
import type { ArenaMenuAlign } from '../../../Api.generated';
import { sp1 } from '../../../Tokens.generated';
import { arenaWarnOnce } from '../../../WarnOnce';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaAnchoredOverlay, arenaConnectedPositions, arenaFirstFocusable } from '../../../AnchoredOverlay';
import { arenaPopoverStyles } from './ArenaPopover.variants';
import manifest from './ArenaPopover.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';

const TRIGGER_SELECTOR =
  'button:not([tabindex="-1"]), a[href]:not([tabindex="-1"]), [role="button"]:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'arena-popover',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.align]': 'null',
    '[attr.label]': 'guardLabel()',
  },
  template: `
    <ng-content select="[trigger]" />
    <ng-template #panel>
      <div role="dialog" tabindex="-1" [id]="panelId" [attr.aria-label]="labelText()" [class]="styles().panel()" [attr.data-arena-surface]="'floating'" [arenaSlotData]="styles().$data.panel()" [attr.data-arena-part]="parts.panel" data-arena-boundary="">
        <ng-content />
      </div>
    </ng-template>
  `,
})
export class ArenaPopover {
  protected readonly parts = manifest.parts;

  /** Names the panel for assistive technology: what it holds, not that it is a panel. Required, and guarded at runtime: a dialog with no accessible name is announced unlabelled, and the trigger's own name says what opens it, never what the panel is for. "Filters", not "Popover". */
  readonly label = input.required<string>();
  /** Whether the panel is shown. The consumer owns it: the component asks to change it through openChange and never changes it by itself, so content inside the panel can close it, an Apply button included. */
  readonly open = input(false, { transform: booleanAttribute });
  /** Which edge of the trigger the panel lines up with. */
  readonly align = input<ArenaMenuAlign, ArenaMenuAlign | undefined>(
    'start',
    { transform: (value) => value ?? 'start' },
  );
  /** The panel asks to be shown or hidden, carrying the state it asks for. The trigger was pressed, Escape was pressed while it was the topmost panel, a press landed outside it, or Tab left it. The panel moves only when open does. */
  readonly openChange = output<boolean>();

  protected readonly panelId = inject(ArenaIdGenerator).next('arena-popover');
  protected readonly styles = computed(() => arenaPopoverStyles());
  protected readonly labelText = computed(() => {
    const label = this.label();
    if (!label.trim()) throw new Error('arena-popover: `label` is required, and names the panel for assistive technology');
    return label;
  });

  protected guardLabel(): null {
    this.labelText();
    return null;
  }

  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private detachTrigger: (() => void) | null = null;

  private readonly overlay = new ArenaAnchoredOverlay({
    anchor: () => this.host.nativeElement,
    trigger: () => this.trigger(),
    panel: () => this.panel(),
    positions: () => arenaConnectedPositions(this.align(), 'below', sp1 * 1.5),
    onDismiss: () => this.openChange.emit(false),
    focusOnOpen: arenaFirstFocusable,
    restoreFocus: true,
    tabOut: true,
  });

  constructor() {
    afterNextRender(() => this.bindTrigger(), { injector: this.injector });
    afterRenderEffect(() => {
      const wanted = this.open();
      untracked(() => {
        if (wanted) this.overlay.open();
        else this.overlay.close();
        this.describeTrigger(this.overlay.isOpen());
      });
    });
    inject(DestroyRef).onDestroy(() => this.detachTrigger?.());
  }

  protected ngAfterViewInit(): void {
    this.describeTrigger(false);
  }

  private trigger(): HTMLElement | null {
    const found = this.host.nativeElement.querySelector<HTMLElement>(TRIGGER_SELECTOR);
    if (found) return found;
    const first = this.host.nativeElement.firstElementChild;
    return first instanceof HTMLElement ? first : null;
  }

  private reportTrigger(): void {
    if (this.host.nativeElement.querySelector(TRIGGER_SELECTOR)) return;
    const first = this.host.nativeElement.firstElementChild;
    arenaWarnOnce(
      first === null
        ? 'arena-popover is given no trigger: mark the element that opens it with the `trigger` '
          + 'attribute, or nothing opens the panel at all.'
        : `arena-popover's trigger is a <${first.tagName.toLowerCase()}>, which takes no focus and `
          + 'answers no key. The panel opens on a pointer and on nothing else, and a reader on a '
          + 'keyboard cannot reach it. Project a control: an ArenaButton or an ArenaIconButton, '
          + 'or your own element carrying a button role and a tabindex.',
    );
  }

  private bindTrigger(): void {
    this.reportTrigger();
    const trigger = this.trigger();
    if (!trigger) return;
    const onClick = (): void => this.openChange.emit(!this.open());
    trigger.addEventListener('click', onClick);
    this.detachTrigger = () => trigger.removeEventListener('click', onClick);
    this.describeTrigger(this.overlay.isOpen());
  }

  private describeTrigger(isOpen: boolean): void {
    const trigger = this.trigger();
    if (!trigger) return;
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) trigger.setAttribute('aria-controls', this.panelId);
    else trigger.removeAttribute('aria-controls');
  }
}
