import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'

const TITLE = 'Checklist'
const DESC = 'Turn any goal into a checkable plan — saved locally, no account.'

/** Wordmark: one check + "Checklist". Same header on every screen. */
export function Logo() {
  const theme = useTheme()
  return (
    <Text wrap="truncate-end">
      <Text color={theme.accent} bold>✓ </Text>
      <Text color={theme.text} bold>{TITLE}</Text>
    </Text>
  )
}

/**
 * The top bar: drawn check + title, a one-line explainer, then a divider.
 */
export function Welcome({width}: {width: number}) {
  const theme = useTheme()
  return (
    <Box flexDirection="column" width={width}>
      <Logo />
      <Text color={theme.muted} dimColor={theme.dimMuted} wrap="wrap">{DESC}</Text>
      <Text color={theme.muted} dimColor={theme.dimMuted}>{'─'.repeat(width)}</Text>
    </Box>
  )
}
