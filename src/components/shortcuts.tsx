import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {contentWidth, useColumns} from './screen'

export type Hint = [key: string, label: string, action?: boolean]

/** A group of shortcuts: `key label · key label`. Key accent+bold, label gray. */
function Group({items}: {items: Hint[]}) {
  const theme = useTheme()
  if (items.length === 0) return null
  return (
    <Text wrap="truncate-end">
      {items.map(([key, label], i) => (
        <Text key={`${key}-${label}`}>
          {/* muted color, NOT the dim attribute: dim + bold share a reset, so a
              dimmed separator was bleeding into the next bold key (faded look). */}
          {i > 0 ? <Text color={theme.muted}>{' · '}</Text> : null}
          <Text color={theme.accent} bold>{key}</Text>
          <Text color={theme.muted} dimColor={theme.dimMuted}>{` ${label}`}</Text>
        </Text>
      ))}
    </Text>
  )
}

/**
 * Footer: a full-width divider (Claude-Code style) above the shortcuts, no
 * fill. Primary commands sit on the left; `esc` + `^c quit` sit on the right.
 */
export function Shortcuts({items}: {items: Hint[]}) {
  const theme = useTheme()
  const width = contentWidth(useColumns())
  const exits = items.filter(([k]) => k === 'esc' || k === '^c')
  const rest = items.filter(([k]) => k !== 'esc' && k !== '^c')

  return (
    <Box flexDirection="column" width={width}>
      <Text color={theme.muted} dimColor={theme.dimMuted}>{'─'.repeat(width)}</Text>
      <Box justifyContent="space-between">
        <Group items={rest} />
        <Group items={exits} />
      </Box>
    </Box>
  )
}
