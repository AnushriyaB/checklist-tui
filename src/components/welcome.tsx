import React, {useEffect, useState} from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'

// The check as a "pen path": [row, col, glyph] in the order a hand draws it —
// down the short left arm into the valley, then up the long right arm. Revealing
// the path one cell at a time animates the drawing. Safe to animate now that the
// app runs in the alternate screen buffer (no resize smearing).
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

// Draw once per process, not every time we return to the dashboard.
let alreadyPlayed = false

function CheckArt({revealed, color}: {revealed: number; color?: string}) {
  const grid = Array.from({length: ROWS}, () => Array<string>(COLS).fill(' '))
  for (const [row, col, glyph] of PATH.slice(0, revealed)) grid[row]![col] = glyph
  return (
    <Box flexDirection="column">
      {grid.map((row, i) => (
        <Text key={i} color={color} bold>
          {row.join('')}
        </Text>
      ))}
    </Box>
  )
}

/** The launch card: an animated check "avatar" beside a short explanation. */
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

  // Below this the check + text can't sit side by side; drop the art so nothing overflows.
  const showArt = width >= 40
  return (
    <Box
      borderStyle="round"
      borderColor={theme.accent}
      borderDimColor={theme.dimMuted}
      width={width}
      paddingX={2}
      paddingY={1}
      columnGap={showArt ? 3 : 0}
      alignItems="center"
    >
      {showArt ? <CheckArt revealed={revealed} color={theme.accent} /> : null}
      {/* flexShrink + minWidth=0 let the text wrap within the remaining space
          instead of pushing the card wider than the terminal. */}
      <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
        <Text bold color={theme.text}>checklist</Text>
        <Text color={theme.muted} dimColor={theme.dimMuted} wrap="wrap">
          turn any goal into a clear, checkable plan — right in your terminal.
        </Text>
        <Text> </Text>
        <Text color={theme.muted} dimColor={theme.dimMuted} wrap="truncate-end">· everything saved locally, no account</Text>
        <Text color={theme.muted} dimColor={theme.dimMuted} wrap="truncate-end">· AI-generated checklists coming soon</Text>
        {count > 0 ? (
          <Text color={theme.muted} dimColor={theme.dimMuted} wrap="truncate-end">{`· ${count} saved ${count === 1 ? 'list' : 'lists'}`}</Text>
        ) : null}
      </Box>
    </Box>
  )
}
