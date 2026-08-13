import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {Screen, Gap, contentWidth, useColumns} from '../components/screen'
import {Shortcuts} from '../components/shortcuts'

// Shortcut reference for the '?' overlay. Keys use plain words (opt/ctrl) rather
// than ⌥/⌃ glyphs to avoid width surprises in the fixed key column.
const HELP: Array<{heading: string; rows: Array<[keys: string, desc: string]>}> = [
  {
    heading: 'Dashboard',
    rows: [
      ['↑↓ / j k', 'move between checklists'],
      ['↵', 'open'],
      ['g', 'generate one with AI'],
      ['n', 'new empty list'],
      ['d', 'delete list'],
    ],
  },
  {
    heading: 'Inside a checklist',
    rows: [
      ['↑↓ / j k', 'move between tasks'],
      ['space', 'toggle done'],
      ['e', 'edit task'],
      ['a', 'add task'],
      ['x', 'delete task'],
      ['/', 'filter: all → done → to-do'],
    ],
  },
  {
    heading: 'Typing',
    rows: [
      ['← →', 'move by character'],
      ['opt ← →', 'move by word'],
      ['ctrl a/e', 'jump to line start / end'],
      ['tab', 'use suggestion (goal prompt)'],
    ],
  },
  {
    heading: 'Anywhere',
    rows: [
      ['esc', 'back / cancel'],
      ['m', 'mute / unmute sounds'],
      ['^t', 'cycle theme (dark / light / auto)'],
      ['?', 'toggle this help'],
      ['^c', 'quit'],
    ],
  },
]

/** The full-screen '?' shortcut reference. */
export function HelpOverlay() {
  const theme = useTheme()
  const width = contentWidth(useColumns())
  return (
    <Screen>
      <Text bold color={theme.accent}>Checklist — shortcuts</Text>
      <Gap />
      <Box
        flexDirection="column"
        width={width}
        borderStyle="round"
        borderColor={theme.muted}
        borderDimColor={theme.dimMuted}
        paddingX={2}
        paddingY={1}
      >
        {HELP.map((section, si) => (
          <Box key={section.heading} flexDirection="column" marginTop={si === 0 ? 0 : 1}>
            <Text bold color={theme.muted} dimColor={theme.dimMuted}>{section.heading}</Text>
            {section.rows.map(([keys, desc]) => (
              <Box key={keys}>
                <Box width={12} flexShrink={0}><Text color={theme.accent}>{keys}</Text></Box>
                <Box flexGrow={1} flexShrink={1} minWidth={0}>
                  <Text color={theme.text}>{desc}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      <Gap />
      <Shortcuts items={[['?', 'close', false], ['esc', 'close', false]]} />
    </Screen>
  )
}
