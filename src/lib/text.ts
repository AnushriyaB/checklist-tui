/** Truncate to n cells with a trailing ellipsis. */
export const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/**
 * Greedy word-wrap to a cell width, hard-breaking any single word that's too
 * long. We wrap by hand (rather than leaning on Ink) so we know exactly what
 * lands on each line — the task viewport builds one display-line per wrapped line.
 */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let w = word
    while (w.length > width) {
      if (line) {
        lines.push(line)
        line = ''
      }
      lines.push(w.slice(0, width))
      w = w.slice(width)
    }
    if (!line) line = w
    else if (line.length + 1 + w.length <= width) line += ` ${w}`
    else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}
