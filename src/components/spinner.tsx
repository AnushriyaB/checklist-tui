import React, {useEffect, useState} from 'react'
import {Text} from 'ink'
import {useTheme} from '../theme'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const FRAME_MS = 80

/** A small braille spinner. Same setTimeout-per-frame technique as the check. */
export function Spinner() {
  const theme = useTheme()
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setFrame(n => (n + 1) % FRAMES.length), FRAME_MS)
    return () => clearTimeout(timer)
  }, [frame])
  return <Text color={theme.accent}>{FRAMES[frame]}</Text>
}
