export function arenaTooltipRedundant(name: string, label: string): boolean {
  const said = name.replace(/\s+/g, ' ').trim().toLowerCase();
  const text = label.replace(/\s+/g, ' ').trim().toLowerCase();
  return text !== '' && said.includes(text);
}

export function arenaAccessibleText(element: Element): string {
  const own = element.getAttribute('aria-label');
  if (own && own.trim() !== '') return own.trim();
  const parts: string[] = [];
  const walk = (node: Node): void => {
    if (node.nodeType === 3) { parts.push(node.textContent ?? ''); return; }
    if (node.nodeType !== 1 || (node as Element).getAttribute('aria-hidden') === 'true') return;
    for (const child of Array.from(node.childNodes)) walk(child);
  };
  for (const child of Array.from(element.childNodes)) walk(child);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
