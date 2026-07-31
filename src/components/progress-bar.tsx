import React from 'react'
import {Text} from 'ink'
import {useTheme} from '../theme'

/** A fixed-width block bar. Width never changes, so it never shifts the layout. */
export function ProgressBar({done, total, width = 10}: {done: number; total: number; width?: number}) {
  const theme = useTheme()
  const ratio = total > 0 ? done / total : 0
  const filled = Math.round(ratio * width)
  const complete = total > 0 && done === total
  return (
    <Text>
      <Text color={complete ? theme.accent : theme.text}>{'█'.repeat(filled)}</Text>
      <Text color={theme.muted} dimColor={theme.dimMuted}>{'░'.repeat(width - filled)}</Text>
    </Text>
  )
}
