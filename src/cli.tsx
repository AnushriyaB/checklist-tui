#!/usr/bin/env node
import React from 'react'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {render} from 'ink'
import {App} from './app'

const flag = process.argv[2]
if (flag === '-h' || flag === '--help') {
  process.stdout.write(
    '\n  A checklist app for your terminal.\n' +
    '\n    checklist\n' +
    '    checklist "plan a 3-day trip to Lisbon"\n\n',
  )
  process.exit(0)
}
if (flag === '-v' || flag === '--version') {
  try {
    const pkg = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
    process.stdout.write(`${JSON.parse(readFileSync(pkg, 'utf8')).version}\n`)
  } catch {
    process.stdout.write('0.1.1\n')
  }
  process.exit(0)
}

// Own the screen via the alternate buffer so the app draws on a clean slate and
// the shell + scrollback come back on exit.
const ESC = String.fromCharCode(27)
const isTTY = Boolean(process.stdout.isTTY)

let cleaned = false
const cleanup = () => {
  if (cleaned || !isTTY) return
  cleaned = true
  process.stdout.write(`${ESC}[?1049l`) // leave alt screen, restore the shell
}
process.on('exit', cleanup)

const initialGoal = process.argv.slice(2).join(' ').trim() || undefined

let instance: ReturnType<typeof render> | undefined
if (isTTY) {
  process.stdout.write(`${ESC}[?1049h${ESC}[2J${ESC}[H`) // enter alt screen, clear, home

  // On a real resize, repaint via Ink's OWN clear(), not a raw ESC[2J.
  // Ink's clear() resets its render cache, so the next render always writes.
  // Writing ESC[2J ourselves blanks the screen whenever the width-capped
  // content is unchanged (e.g. resizing a terminal already wider than the cap):
  // Ink sees identical output, treats the render as a no-op, and never repaints
  // → the screen stays blank. (No-op resize events — focus, sub-cell drags —
  // are filtered so we only act when the grid actually changed.)
  let lastCols = process.stdout.columns
  let lastRows = process.stdout.rows
  process.stdout.on('resize', () => {
    if (process.stdout.columns === lastCols && process.stdout.rows === lastRows) return
    lastCols = process.stdout.columns
    lastRows = process.stdout.rows
    instance?.clear()
  })
}

instance = render(<App initialGoal={initialGoal} />)
void instance.waitUntilExit().finally(cleanup)
