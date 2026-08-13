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
      {/* Every hint is a keyboard shortcut, so the key is always accent (blue,
          bold) and the label always muted (gray) — no click distinction. */}
      {items.map(([key, label], i) => (
        <Text key={`${key}-${label}`} backgroundColor={bg}>
          {i > 0 ? <Text backgroundColor={bg} color={theme.muted} dimColor>{' · '}</Text> : null}
          <Text backgroundColor={bg} color={theme.accent} bold>{key}</Text>
          <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{` ${label}`}</Text>
        </Text>
      ))}
      <Text backgroundColor={bg}> </Text>
    </Text>
  )
}

/**
 * Two-box footer on the right: the primary commands in one card, then `esc` +
 * `^c quit` in a separate card of their own (rightmost).
 */
export function Shortcuts({items}: {items: Hint[]}) {
  const theme = useTheme()
  const bg = theme.barBg
  const width = contentWidth(useColumns())

  const exits = items.filter(([k]) => k === 'esc' || k === '^c')
  const rest = items.filter(([k]) => k !== 'esc' && k !== '^c')

  return (
    <Box width={width} justifyContent="flex-end" columnGap={2}>
      <Card items={rest} bg={bg} />
      <Card items={exits} bg={bg} />
    </Box>
  )
}
