import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {progress, type Checklist} from '../store'
import {truncate} from '../lib/text'

type Props = {checklists: Checklist[]; listCursor: number; width: number; showBar: boolean}

/** The home list: one tight filled row per checklist (selected row highlighted). */
export function Dashboard({checklists, listCursor, width, showBar}: Props) {
  const theme = useTheme()

  if (checklists.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={theme.muted} dimColor={theme.dimMuted}>No checklists yet.</Text>
        <Text color={theme.muted} dimColor={theme.dimMuted}>
          Press <Text color={theme.accent} bold>g</Text> to generate one with AI, or{' '}
          <Text color={theme.accent} bold>n</Text> to add one yourself.
        </Text>
      </Box>
    )
  }

  // Fixed count column (widest count wins) so every bar starts at the same x.
  const countW = Math.max(3, ...checklists.map(c => {
    const {done, total} = progress(c)
    return `${done}/${total}`.length
  }))
  const titleW = Math.max(4, width - 3 - (showBar ? 11 : 0) - countW)

  return (
    <Box flexDirection="column">
      {checklists.map((c, i) => {
        const {done, total} = progress(c)
        const selected = i === listCursor
        // One Text per row so the selection fill is continuous (Ink 5 can't
        // background a Box); widths are padded by hand.
        const bg = selected ? theme.barBg : undefined
        const countStr = `${done}/${total}`.padStart(countW)
        const barW = showBar ? 10 : 0
        const title = truncate(c.title, titleW).padEnd(titleW)
        const filled = total > 0 ? Math.round((done / total) * barW) : 0
        const complete = total > 0 && done === total
        return (
          <Box key={c.id} width={width}>
            <Text backgroundColor={bg} wrap="truncate-end">
              <Text backgroundColor={bg} color={theme.accent} bold>{selected ? '❯ ' : '  '}</Text>
              <Text backgroundColor={bg} color={theme.text} bold={selected}>{title}</Text>
              <Text backgroundColor={bg}> </Text>
              {showBar ? (
                <Text>
                  <Text backgroundColor={bg} color={complete ? theme.accent : theme.text}>{'█'.repeat(filled)}</Text>
                  <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{'░'.repeat(barW - filled)}</Text>
                  <Text backgroundColor={bg}> </Text>
                </Text>
              ) : null}
              <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{countStr}</Text>
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
