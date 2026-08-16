import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {progress, type Checklist} from '../store'
import {truncate} from '../lib/text'

type Props = {checklists: Checklist[]; listCursor: number; width: number; showBar: boolean}

/** Home list: selected row is the blue arrow + blue title. No fill, no box. */
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

  const countW = Math.max(3, ...checklists.map(c => {
    const {done, total} = progress(c)
    return `${done}/${total}`.length
  }))
  const numW = String(checklists.length).length
  const titleW = Math.max(4, width - 3 - (numW + 2) - (showBar ? 11 : 0) - countW)

  return (
    <Box flexDirection="column">
      {checklists.map((c, i) => {
        const {done, total} = progress(c)
        const selected = i === listCursor
        const countStr = `${done}/${total}`.padStart(countW)
        const barW = showBar ? 10 : 0
        const title = truncate(c.title, titleW).padEnd(titleW)
        const filled = total > 0 ? Math.round((done / total) * barW) : 0
        const complete = total > 0 && done === total
        const titleColor = selected ? theme.accent : theme.text
        return (
          <Box key={c.id} width={width} flexShrink={0}>
            <Text>
              <Text color={theme.accent} bold>{selected ? '❯ ' : '  '}</Text>
              <Text color={theme.muted} dimColor={theme.dimMuted}>{`${i + 1}`.padStart(numW) + '. '}</Text>
              <Text color={titleColor} bold={selected}>{title}</Text>
              <Text> </Text>
              {showBar ? (
                complete ? (
                  <Text>
                    <Text color={theme.accent} bold>{'Completed'.padEnd(barW)}</Text>
                    <Text> </Text>
                  </Text>
                ) : (
                  <Text>
                    <Text color={selected ? theme.accent : theme.text}>{'█'.repeat(filled)}</Text>
                    <Text color={theme.muted} dimColor={theme.dimMuted}>{'░'.repeat(barW - filled)}</Text>
                    <Text> </Text>
                  </Text>
                )
              ) : null}
              <Text color={complete || selected ? theme.accent : theme.muted} dimColor={!complete && !selected && theme.dimMuted}>
                {countStr}
              </Text>
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
