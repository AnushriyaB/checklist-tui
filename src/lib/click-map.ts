/**
 * Click hit-testing against the rendered frame. Ink has no absolute-position
 * API, so rather than re-deriving each widget's cell rectangle from layout
 * math (fragile — it breaks whenever the layout changes), we keep a copy of the
 * last frame Ink wrote and find clickable text in it by content.
 */

// Matches the CSI/OSC sequences Ink emits (colours, cursor moves, erase lines).
const ANSI_PATTERN = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
  ].join('|'),
  'g',
)
const stripAnsi = (text: string) => text.replace(ANSI_PATTERN, '')

// Frame line i ↔ terminal row i+1: Ink rewrites its output region top-down.
let frameLines: string[] = []

/**
 * Wrap the stdout handed to Ink's render() so every frame it writes is kept for
 * hit-testing. Cursor-only / colour-only updates carry no printable text and
 * are ignored, so the last frame with real content stays around.
 */
export function captureFrames<T extends NodeJS.WriteStream>(stream: T): T {
  return new Proxy(stream, {
    get(target, prop) {
      if (prop === 'write') {
        return (chunk: unknown, ...rest: unknown[]) => {
          const lines = String(chunk).split('\n').map(stripAnsi)
          if (lines.some(line => line.trim() !== '')) frameLines = lines
          return (target.write as (...args: unknown[]) => boolean)(chunk, ...rest)
        }
      }
      const value = Reflect.get(target, prop)
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value
    },
  })
}

export type ClickTarget = {
  /** Exact text to find in the frame (colours are stripped before matching). */
  match: string
  action: () => void
  /** Extra cells left/right of the match that still count as a hit. */
  padX?: number
  /** Extra rows above/below the match that still count as a hit (e.g. card borders). */
  padY?: number
}

/** First target whose text sits under the click. x/y are 1-based terminal cells. */
export function clickTargetAt(x: number, y: number, targets: ClickTarget[]): ClickTarget | undefined {
  for (const target of targets) {
    const {match, padX = 1, padY = 0} = target
    if (!match) continue
    for (let row = y - 1 - padY; row <= y - 1 + padY; row++) {
      const line = frameLines[row]
      if (!line) continue
      let index = line.indexOf(match)
      while (index !== -1) {
        if (x - 1 >= index - padX && x - 1 <= index + match.length - 1 + padX) return target
        index = line.indexOf(match, index + 1)
      }
    }
  }
  return undefined
}
