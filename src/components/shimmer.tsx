import React, {useEffect, useState} from 'react'
import {Text} from 'ink'
import {useTheme} from '../theme'

const STEP_MS = 55
const TRAIL = 6 // how many characters the highlight fades over

/**
 * Sweeps a soft bright highlight left-to-right across the text — a subtle
 * "thinking" shimmer for the goal while its checklist is generated. Each char
 * is coloured by its distance from the moving highlight; the peak is bold.
 */
export function Shimmer({text}: {text: string}) {
  const theme = useTheme()
  const [pos, setPos] = useState(0)
  const span = text.length + TRAIL * 2

  useEffect(() => {
    const timer = setTimeout(() => setPos(p => (p + 1) % span), STEP_MS)
    return () => clearTimeout(timer)
  }, [pos, span])

  const head = pos - TRAIL // sweep from just off the left edge to just past the right
  return (
    <Text>
      {[...text].map((ch, i) => {
        const distance = Math.abs(i - head)
        const near = distance <= TRAIL
        return (
          <Text key={i} bold={distance <= 1} color={near ? theme.text : theme.muted} dimColor={!near && theme.dimMuted}>
            {ch}
          </Text>
        )
      })}
    </Text>
  )
}
