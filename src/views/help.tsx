import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {Screen, Gap, contentWidth, useColumns} from '../components/screen'
import {Shortcuts} from '../components/shortcuts'

// Just the essentials, grouped by where you are. (Cursor nav ← → / word / line
// and vim j k still work — they don't need documenting.)
const HELP: Array<{heading: string; keys: Array<[string, string]>}> = [
  {heading: 'Dashboard', keys: [['↵', 'open'], ['g', 'generate'], ['n', 'new'], ['d', 'delete']]},
  {heading: 'In a checklist', keys: [['space', 'toggle'], ['a', 'add'], ['e', 'edit'], ['x', 'delete'], ['/', 'filter']]},
  {heading: 'Anywhere', keys: [['?', 'help'], ['esc', 'back'], ['m', 'sound'], ['^c', 'quit']]},
]

/** The compact '?' shortcut reference. Full-height so it fully covers the screen
 * behind it (no ghost of the previous view). esc closes it. */
export function HelpOverlay() {
  const theme = useTheme()
  const width = contentWidth(useColumns())
  return (
    <Screen>
      <Box flexDirection="column" flexGrow={1} flexShrink={0}>
        <Text bold color={theme.accent}>Checklist — shortcuts</Text>
        <Gap />
        <Box
          flexDirection="column"
          flexShrink={0}
          width={width}
          borderStyle="round"
          borderColor={theme.muted}
          borderDimColor={theme.dimMuted}
          paddingX={2}
          paddingY={1}
        >
          {HELP.map((section, si) => (
            <Box key={section.heading} flexDirection="column" flexShrink={0} marginTop={si === 0 ? 0 : 1}>
              <Text color={theme.muted} dimColor={theme.dimMuted}>{section.heading}</Text>
              <Box flexWrap="wrap" width={width - 6}>
                {section.keys.map(([key, label], i) => (
                  <Text key={key + label}>
                    <Text color={theme.accent} bold>{key}</Text>
                    <Text color={theme.text}>{` ${label}`}</Text>
                    {i < section.keys.length - 1 ? <Text>{'    '}</Text> : null}
                  </Text>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Shortcuts items={[['esc', 'close', false]]} />
    </Screen>
  )
}
