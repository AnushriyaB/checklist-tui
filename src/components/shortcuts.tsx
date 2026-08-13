import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {contentWidth, useColumns} from './screen'

export type Hint = [key: string, label: string, action?: boolean]

/**
 * A single filled hint "card": `key label · key label`, with a space of
 * padding each side. Actions (g, ↵, …) get the accent, bold key; instructions
 * (↑↓, ^c, esc) are dimmed so they read as info, not buttons. Ink 5 only
 * backgrounds Text, so a card is one padded Text.
 */
function Card({items, bg}: {items: Hint[]; bg?: string}) {
  const theme = useTheme()
  if (items.length === 0) return null
  return (
    <Text backgroundColor={bg} wrap="truncate-end">
      <Text backgroundColor={bg}> </Text>
      {items.map(([key, label, action = true], i) => (
        <Text key={`${key}-${label}`} backgroundColor={bg}>
          {i > 0 ? <Text backgroundColor={bg} color={theme.muted} dimColor>{' · '}</Text> : null}
          <Text backgroundColor={bg} color={action ? theme.accent : theme.muted} dimColor={!action} bold={action}>
            {key}
          </Text>
          <Text backgroundColor={bg} color={theme.muted} dimColor={!action}>{` ${label}`}</Text>
        </Text>
      ))}
      <Text backgroundColor={bg}> </Text>
    </Text>
  )
}

/**
 * Three-card footer: `move` on the left, `quit` on the right, everything else
 * in a centered card between them — row-flexed across the content width.
 */
export function Shortcuts({items}: {items: Hint[]}) {
  const theme = useTheme()
  const bg = theme.barBg
  const width = contentWidth(useColumns())

  const left = items.filter(([k]) => k === '↑↓')
  const right = items.filter(([k]) => k === '^c')
  const middle = items.filter(([k]) => k !== '↑↓' && k !== '^c')

  return (
    <Box width={width}>
      <Box flexShrink={0}>
        <Card items={left} bg={bg} />
      </Box>
      <Box flexGrow={1} flexShrink={1} minWidth={0} justifyContent="center">
        <Card items={middle} bg={bg} />
      </Box>
      <Box flexShrink={0}>
        <Card items={right} bg={bg} />
      </Box>
    </Box>
  )
}
