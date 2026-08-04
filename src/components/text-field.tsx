import React, {useEffect, useRef, useState} from 'react'
import {Text, useInput} from 'ink'
import {useTheme} from '../theme'

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  onTab?: () => void
  placeholder?: string
  focus?: boolean
}

const isWord = (c: string | undefined) => !!c && /\w/.test(c)

// Word boundaries, emacs/macOS style: skip separators, then skip the word.
function wordLeft(value: string, cursor: number): number {
  let i = cursor
  while (i > 0 && !isWord(value[i - 1])) i--
  while (i > 0 && isWord(value[i - 1])) i--
  return i
}
function wordRight(value: string, cursor: number): number {
  let i = cursor
  while (i < value.length && !isWord(value[i])) i++
  while (i < value.length && isWord(value[i])) i++
  return i
}

/**
 * A controlled single-line text field with real cursor navigation:
 * ← →, Option+← → (by word), Ctrl+A / Ctrl+E (line start/end). Cmd+← → would
 * be nicer, but terminals don't forward Cmd to programs — Ctrl+A/E is the
 * working equivalent. Renders its own block cursor.
 */
export function TextField({value, onChange, onSubmit, onTab, placeholder, focus = true}: Props) {
  const theme = useTheme()
  const [cursor, setCursor] = useState(value.length)
  const lastEmitted = useRef(value)

  // When the value changes from OUTSIDE (e.g. Tab fills a suggestion), jump the
  // cursor to the end. Our own edits set lastEmitted first, so they skip this.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      setCursor(value.length)
    }
  }, [value])

  const emit = (next: string, nextCursor: number) => {
    lastEmitted.current = next
    onChange(next)
    setCursor(nextCursor)
  }

  useInput(
    (input, key) => {
      const c = Math.min(cursor, value.length)
      const byWord = key.meta || key.ctrl // Option+arrow or Ctrl+arrow → by word

      if (key.leftArrow) return void setCursor(byWord ? wordLeft(value, c) : Math.max(0, c - 1))
      if (key.rightArrow) return void setCursor(byWord ? wordRight(value, c) : Math.min(value.length, c + 1))
      if (key.ctrl && input === 'a') return void setCursor(0) // line start
      if (key.ctrl && input === 'e') return void setCursor(value.length) // line end
      if (key.meta && input === 'b') return void setCursor(wordLeft(value, c)) // Option-b
      if (key.meta && input === 'f') return void setCursor(wordRight(value, c)) // Option-f
      if (key.return) return void onSubmit?.(value)
      if (key.tab) return void onTab?.()
      if (key.backspace || key.delete) {
        if (c > 0) emit(value.slice(0, c - 1) + value.slice(c), c - 1)
        return
      }
      // Printable insert.
      if (input && !key.ctrl && !key.meta && !key.escape) {
        emit(value.slice(0, c) + input + value.slice(c), c + input.length)
      }
    },
    {isActive: focus},
  )

  if (value.length === 0 && placeholder) {
    return (
      <Text>
        <Text inverse> </Text>
        <Text color={theme.muted} dimColor={theme.dimMuted}>{placeholder}</Text>
      </Text>
    )
  }

  const c = Math.min(cursor, value.length)
  return (
    <Text>
      <Text color={theme.text}>{value.slice(0, c)}</Text>
      <Text inverse>{value.slice(c, c + 1) || ' '}</Text>
      <Text color={theme.text}>{value.slice(c + 1)}</Text>
    </Text>
  )
}
