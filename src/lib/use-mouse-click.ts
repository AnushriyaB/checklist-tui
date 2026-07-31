import {useEffect, useRef} from 'react'
import {useStdin, useStdout} from 'ink'

// 1000h = report button presses; 1006h = SGR encoding (`ESC [ < b ; x ; y M`).
const ENABLE = '[?1000h[?1006h'
const DISABLE = '[?1006l[?1000l'
const SGR_PRESS = /\[<(\d+);(\d+);(\d+)M/g

/**
 * Reports left-button presses as 1-based (column, row) terminal cells.
 * While active, the terminal's native text selection needs a modifier key
 * (option/shift) — the trade-off for receiving clicks at all.
 */
export function useMouseClick(onClick: (x: number, y: number) => void, isActive: boolean) {
  const handlerRef = useRef(onClick)
  handlerRef.current = onClick
  const {stdin} = useStdin()
  const {stdout} = useStdout()

  useEffect(() => {
    if (!isActive || !stdin || !stdout || !process.stdin.isTTY) return
    stdout.write(ENABLE)
    const onData = (data: Buffer | string) => {
      for (const match of String(data).matchAll(SGR_PRESS)) {
        const [, button, x, y] = match
        if (button === '0') handlerRef.current(Number(x), Number(y))
      }
    }
    stdin.on('data', onData)
    return () => {
      stdin.off('data', onData)
      stdout.write(DISABLE)
    }
  }, [isActive, stdin, stdout])
}

/**
 * Mouse reports also flow through Ink's keypress parsing, which strips the
 * leading ESC and hands the rest (`[<0;34;12M`) to a text input as typed text.
 * Run every text-input onChange value through this to drop the leaked reports.
 */
export const stripMouseReports = (value: string) => value.replace(/?\[?<\d+;\d+;\d+[Mm]/g, '')
