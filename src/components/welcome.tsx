import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'

const TITLE = 'Checklist'
const DESC = 'Turn any goal into a checkable plan — saved locally, no account.'

/** The `[✓] Checklist` wordmark — shared so every screen's header matches. */
export function Logo() {
  const theme = useTheme()
  return (
    <Text wrap="truncate-end">
      <Text color={theme.muted} dimColor={theme.dimMuted}>[</Text>
      <Text color={theme.accent} bold>✓</Text>
      <Text color={theme.muted} dimColor={theme.dimMuted}>{'] '}</Text>
      <Text color={theme.text} bold>{TITLE}</Text>
    </Text>
  )
}

/**
 * The top bar: a small static checkbox + "Checklist" title and a one-line
 * explainer, with a full-width divider below to separate it from the list.
 * No fill — plain, Claude-Code style.
 */
export function Welcome({width}: {width: number}) {
  const theme = useTheme()
  return (
    <Box flexDirection="column" width={width}>
      <Logo />
      <Text color={theme.muted} dimColor={theme.dimMuted} wrap="wrap">{DESC}</Text>
      <Box marginTop={1}>
        <Text color={theme.muted} dimColor={theme.dimMuted}>{'─'.repeat(width)}</Text>
      </Box>
    </Box>
  )
}
