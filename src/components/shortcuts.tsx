import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {contentWidth, useColumns} from './screen'

/**
 * The bottom hint row: `key label   key label`, accent the key, mute the label.
 * Bounded to the content width and set to flex-wrap, so on a narrow terminal the
 * hints wrap onto a second line INSIDE the box instead of overflowing the
 * terminal (overflow is what garbles Ink's redraw on resize).
 */
export function Shortcuts({items}: {items: Array<[key: string, label: string]>}) {
  const theme = useTheme()
  const width = contentWidth(useColumns())
  return (
    <Box width={width} flexWrap="wrap">
      {items.map(([key, label]) => (
        <Text key={`${key}-${label}`}>
          <Text color={theme.accent} bold>{key}</Text>
          <Text color={theme.muted} dimColor={theme.dimMuted}>{` ${label}   `}</Text>
        </Text>
      ))}
    </Box>
  )
}
