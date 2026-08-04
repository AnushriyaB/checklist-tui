import React, {useEffect, useState} from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'

// The check as a "pen path": [row, col, glyph] in drawing order.
const PATH: Array<[row: number, col: number, glyph: string]> = [
  [2, 0, '╲'],
  [3, 1, '╲'],
  [3, 2, '╱'],
  [2, 3, '╱'],
  [1, 4, '╱'],
  [0, 5, '╱'],
]
const ROWS = 4
const COLS = 6
const FRAME_MS = 70
const DESC = 'Turn any goal into a checkable plan — saved locally, no account.'

let alreadyPlayed = false // draw once per process

function checkGrid(revealed: number): string[] {
  const grid = Array.from({length: ROWS}, () => Array<string>(COLS).fill(' '))
  for (const [r, c, g] of PATH.slice(0, revealed)) grid[r]![c] = g
  return grid.map(row => row.join(''))
}

// Simple greedy word-wrap (kept local so the card composes its own lines).
function wrap(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (!line) line = word
    else if (line.length + 1 + word.length <= width) line += ` ${word}`
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * The launch "top bar": an animated check + explanation on a subtle full-width
 * fill (no border box — Ink 5 can't background a Box, so each row is one filled
 * Text composed by hand). In `auto` theme barBg is undefined, so it renders
 * cleanly on the terminal's own background.
 */
export function Welcome({count, width}: {count: number; width: number}) {
  const theme = useTheme()
  const [revealed, setRevealed] = useState(alreadyPlayed ? PATH.length : 0)
  useEffect(() => {
    if (revealed >= PATH.length) {
      alreadyPlayed = true
      return
    }
    const timer = setTimeout(() => setRevealed(n => n + 1), FRAME_MS)
    return () => clearTimeout(timer)
  }, [revealed])

  const bg = theme.barBg
  const showArt = width >= 40
  const LEFT = 2
  const RIGHT = 2
  const GAP = showArt ? 3 : 0
  const checkW = showArt ? COLS : 0
  const textW = Math.max(8, width - LEFT - checkW - GAP - RIGHT)

  const check = checkGrid(revealed)
  const descLines = wrap(DESC, textW).slice(0, 3)
  const chip = count > 0 ? `${count} saved` : ''
  const titlePad = Math.max(1, textW - 'checklist'.length - chip.length)
  const textLineCount = 1 + descLines.length
  const rowCount = showArt ? ROWS : textLineCount
  const offset = showArt ? Math.max(0, Math.floor((ROWS - textLineCount) / 2)) : 0

  const blank = <Text backgroundColor={bg}>{' '.repeat(width)}</Text>

  const textRow = (i: number) => {
    if (i === 0) {
      return (
        <>
          <Text backgroundColor={bg} color={theme.text} bold>checklist</Text>
          <Text backgroundColor={bg}>{' '.repeat(titlePad)}</Text>
          {chip ? <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{chip}</Text> : null}
        </>
      )
    }
    return (
      <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>
        {(descLines[i - 1] ?? '').padEnd(textW)}
      </Text>
    )
  }

  return (
    <Box flexDirection="column" width={width}>
      {blank}
      {Array.from({length: rowCount}, (_, row) => {
        const ti = row - offset
        const hasText = ti >= 0 && ti < textLineCount
        return (
          <Text key={row} backgroundColor={bg} wrap="truncate-end">
            <Text backgroundColor={bg}>{' '.repeat(LEFT)}</Text>
            {showArt ? (
              <Text backgroundColor={bg}>
                <Text backgroundColor={bg} color={theme.accent} bold>{check[row]}</Text>
                <Text backgroundColor={bg}>{' '.repeat(GAP)}</Text>
              </Text>
            ) : null}
            {hasText ? textRow(ti) : <Text backgroundColor={bg}>{' '.repeat(textW)}</Text>}
            <Text backgroundColor={bg}>{' '.repeat(RIGHT)}</Text>
          </Text>
        )
      })}
      {blank}
    </Box>
  )
}
