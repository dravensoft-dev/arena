/* No .test. infix on purpose: bun test collects by that infix, and a shared module must not be
 * collected as a suite. TestbedEnv shares one document across the whole run, so a pane a fixture
 * failed to dispose outlives the file that opened it.
 * MEASURED, and the reason this file is not a one-liner: the container must NOT be removed. The
 * CDK creates it once and caches the reference, so removing the element leaves every later
 * overlay attaching into a node no longer in the document -- silently, with nothing to query.
 * An empty container is already invisible (overlay-prebuilt.css hides :empty), so leaving it is
 * free. Remove the panes; keep the container. disposeStrays sweeps what a fixture appended to the
 * body, and for the reason above it keeps the container. */

const PANE_PARTS = '.cdk-overlay-pane, .cdk-overlay-connected-position-bounding-box, .cdk-overlay-backdrop';

export function overlayContainers(doc: Document = document): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>('.cdk-overlay-container'));
}

export function overlayPanes(doc: Document = document): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>('.cdk-overlay-pane'));
}

export function disposeOverlays(doc: Document = document): number {
  const panes = overlayPanes(doc).length;
  for (const part of Array.from(doc.querySelectorAll<HTMLElement>(PANE_PARTS))) part.remove();
  return panes;
}

export function disposeStrays(doc: Document = document): void {
  for (const node of [...doc.body.children]) {
    if (!node.classList.contains('cdk-overlay-container')) node.remove();
  }
}
