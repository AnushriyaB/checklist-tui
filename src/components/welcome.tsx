import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'

const TITLE = 'Checklist'
const DESC = 'Turn any goal into a checkable plan — saved locally, no account.'
const ICON = '[✓] ' // small static checkbox, 4 cells

// Simple greedy word-wrap so the card composes its own filled lines.
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
 * The launch "top bar": a small static checkbox + "Checklist" title and a
 * one-line explainer, on a subtle full-width fill (no border box — Ink 5 can't
 * background a Box, so each row is one filled Text). In `auto` theme barBg is
 * undefined, so it renders cleanly on the terminal's own background.
 */
export function Welcome({count, width}: {count: number; width: number}) {
  const theme = useTheme()
  const bg = theme.barBg
  const INSET = 2
  const RIGHT = 2
  const descIndent = INSET + ICON.length // align the explainer under the title
  const descW = Math.max(8, width - descIndent - RIGHT)
  const descLines = wrap(DESC, descW).slice(0, 2)

  const chip = count > 0 ? `${count} saved` : ''
  const titlePad = Math.max(1, width - INSET - ICON.length - TITLE.length - chip.length - RIGHT)

  const blank = <Text backgroundColor={bg}>{' '.repeat(width)}</Text>

  return (
    <Box flexDirection="column" width={width}>
      {blank}
      <Text backgroundColor={bg} wrap="truncate-end">
        <Text backgroundColor={bg}>{' '.repeat(INSET)}</Text>
        <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>[</Text>
        <Text backgroundColor={bg} color={theme.accent} bold>✓</Text>
        <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{'] '}</Text>
        <Text backgroundColor={bg} color={theme.text} bold>{TITLE}</Text>
        <Text backgroundColor={bg}>{' '.repeat(titlePad)}</Text>
        {chip ? <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{chip}</Text> : null}
        <Text backgroundColor={bg}>{' '.repeat(RIGHT)}</Text>
      </Text>
      {descLines.map((line, i) => (
        <Text key={i} backgroundColor={bg} wrap="truncate-end">
          <Text backgroundColor={bg}>{' '.repeat(descIndent)}</Text>
          <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{line.padEnd(descW)}</Text>
          <Text backgroundColor={bg}>{' '.repeat(RIGHT)}</Text>
        </Text>
      ))}
      {blank}
    </Box>
  )
}
