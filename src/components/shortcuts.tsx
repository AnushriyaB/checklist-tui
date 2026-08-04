import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {contentWidth, useColumns} from './screen'

export type Hint = [key: string, label: string, clickable?: boolean]

/**
 * The bottom hint row: `key label   key label`, on a subtle full-width fill.
 * Ink 5 only backgrounds Text (not Box), so the bar is one Text padded with
 * spaces to the content width; `truncate-end` keeps it from overflowing on a
 * narrow terminal. Clickable hints get the accent key (bold); keyboard-only
 * ones (↑↓, ^c) are muted so they don't look like buttons.
 */
export function Shortcuts({items}: {items: Hint[]}) {
  const theme = useTheme()
  const width = contentWidth(useColumns())
  const bg = theme.barBg
  const INSET = 1
  const SEP = 3
  const textLength =
    INSET + items.reduce((sum, [k, l], i) => sum + (i > 0 ? SEP : 0) + k.length + 1 + l.length, 0)
  const pad = Math.max(0, width - textLength)

  return (
    <Box width={width}>
      <Text backgroundColor={bg} wrap="truncate-end">
        <Text backgroundColor={bg}>{' '.repeat(INSET)}</Text>
        {items.map(([key, label, clickable = true], i) => (
          <Text key={`${key}-${label}`} backgroundColor={bg}>
            {i > 0 ? <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{'   '}</Text> : null}
            <Text backgroundColor={bg} color={clickable ? theme.accent : theme.muted} dimColor={!clickable && theme.dimMuted} bold={clickable}>
              {key}
            </Text>
            <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{` ${label}`}</Text>
          </Text>
        ))}
        <Text backgroundColor={bg}>{' '.repeat(pad)}</Text>
      </Text>
    </Box>
  )
}
