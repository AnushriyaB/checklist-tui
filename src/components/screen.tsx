import React, {useEffect, useState, type ReactNode} from 'react'
import {Box, Text, useStdout} from 'ink'

// Shared so the footer bar can compute the exact same content width.
export const MAX_WIDTH = 100
export const PAD_X = 2

/** Terminal columns, kept live across resizes (Ink doesn't re-render on its own). */
export function useColumns(): number {
  const {stdout} = useStdout()
  const [cols, setCols] = useState(stdout?.columns ?? 80)
  useEffect(() => {
    if (!stdout) return
    const onResize = () => setCols(stdout.columns ?? 80)
    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])
  return cols
}

/** Width of the content area inside the page padding. */
export const contentWidth = (cols: number) => Math.min(cols, MAX_WIDTH) - PAD_X * 2

/**
 * Page frame: pads the content and re-measures on terminal resize so the
 * layout stays put. Capped at 100 columns so lines don't sprawl on a wide
 * terminal.
 */
export function Screen({children}: {children: ReactNode}) {
  const cols = useColumns()
  return (
    <Box flexDirection="column" paddingX={PAD_X} paddingY={1} width={Math.min(cols, MAX_WIDTH)}>
      {children}
    </Box>
  )
}

/**
 * A real blank line. Empty `<Box height={1}/>` spacers collapse under flexbox
 * pressure (Ink defaults to flexShrink=1), so we render an actual space that
 * won't shrink.
 */
export const Gap = () => (
  <Box flexShrink={0}>
    <Text> </Text>
  </Box>
)
