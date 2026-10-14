/**
 * Visible text of an element with inline emoji images turned into their alt text.
 * Uses the DOM only; never returns HTML (plan §1.3).
 *
 * @param element - The element to read.
 * @returns Whitespace-normalized text.
 */
export function readText(element: Element): string {
  const parts: string[] = []
  const walker = element.ownerDocument.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  )
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? '')
    } else if (node instanceof HTMLImageElement && node.alt !== '') {
      parts.push(node.alt)
    }
  }
  return parts.join('').replace(/\s+/g, ' ').trim()
}

/**
 * Keeps only elements that aren't nested inside another element of the same list, so text
 * isn't read twice.
 *
 * @param elements - Candidate elements.
 * @returns The outermost elements, in their original order.
 */
export function outermost(elements: readonly Element[]): Element[] {
  return elements.filter(
    element => !elements.some(other => other !== element && other.contains(element)),
  )
}
