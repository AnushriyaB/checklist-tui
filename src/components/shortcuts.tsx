import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {contentWidth, useColumns} from './screen'

export type Hint = [key: string, label: string, action?: boolean]

/**
 * The bottom hint bar, on a subtle full-width fill. Items are separated by a
 * dim `·`. Two visual classes:
 *   - actions (g, n, ↵, …) — accent, bold key, brighter label
 *   - instructions (↑↓, ^c, esc, …) — fully dimmed, so they read as info, not buttons
 * Ink 5 only backgrounds Text (not Box), so this is one padded Text; the
 * `truncate-end` keeps it from overflowing a narrow terminal.
 */
export function Shortcuts({items}: {items: Hint[]}) {
  const theme = useTheme()
  const bg = theme.barBg
  const width = contentWidth(useColumns())

  const INSET = 1
  const SEP = 3 // ' · '
  const textLength =
    INSET + items.reduce((sum, [k, l], i) => sum + (i > 0 ? SEP : 0) + k.length + 1 + l.length, 0)
  const pad = Math.max(0, width - textLength)

  return (
    <Box width={width}>
      <Text backgroundColor={bg} wrap="truncate-end">
        <Text backgroundColor={bg}>{' '.repeat(INSET)}</Text>
        {items.map(([key, label, action = true], i) => (
          <Text key={`${key}-${label}`} backgroundColor={bg}>
            {i > 0 ? <Text backgroundColor={bg} color={theme.muted} dimColor>{' · '}</Text> : null}
            <Text backgroundColor={bg} color={action ? theme.accent : theme.muted} dimColor={!action} bold={action}>
              {key}
            </Text>
            <Text backgroundColor={bg} color={theme.muted} dimColor={!action}>{` ${label}`}</Text>
          </Text>
        ))}
        <Text backgroundColor={bg}>{' '.repeat(pad)}</Text>
      </Text>
    </Box>
  )
}
