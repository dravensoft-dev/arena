import {
  ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input,
} from '@angular/core';
import { ArenaSideNavState, arenaIndentFor } from '../arena-side-nav/ArenaSideNavState';
import { arenaSideNavStyles } from '../arena-side-nav/ArenaSideNav.variants';
import manifest from '../arena-side-nav/ArenaSideNav.classes.generated';

let nextId = 0;

@Component({
  selector: 'arena-side-nav-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaSideNavState],
  host: {
    '[class]': 'styles().section()',
    '[attr.data-arena-part]': 'parts.section',
    role: 'group',
    '[attr.aria-labelledby]': 'labelId',
  },
  template: `
    <div [id]="labelId" [class]="styles().sectionLabel()" [attr.data-arena-part]="parts.sectionLabel" [style.paddingInlineStart]="indent()">{{ heading() }}</div>
    <ng-content />
  `,
})
export class ArenaSideNavSection {
  protected readonly parts = manifest.parts;

  /** Names the group, both on screen and to assistive technology. Required, and guarded at runtime: a blank label leaves the group with no accessible name, which is the defect the guard exists to prevent arriving through a value that is present, so the guard trims before it decides. */
  readonly label = input.required<string>();

  private readonly parent = inject(ArenaSideNavState, { skipSelf: true });
  private readonly own = inject(ArenaSideNavState);

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly labelId = `arena-side-nav-section-${nextId++}`;

  protected readonly heading = computed(() => {
    const text = this.label();
    if (text.trim() === '') {
      throw new Error('ArenaSideNavSection: `label` is required, and names the group its heading introduces');
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
  }

  protected ngAfterContentInit(): void {
    if (this.contentAfterHeading().length === 0) {
      throw new Error('ArenaSideNavSection: a section with no children is not a legal shape — its heading would name nothing');
    }
  }

  private contentAfterHeading(): Element[] {
    const element = this.host.nativeElement as HTMLElement;
    return [...element.children].slice(1);
  }
}
