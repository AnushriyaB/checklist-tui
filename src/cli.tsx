#!/usr/bin/env node
import React from 'react'
import {render} from 'ink'
import {App} from './app'

// Own the screen via the alternate buffer, and keep it clean: clear + home on
// start and on every resize so Ink always redraws from the top instead of
// piling frames up (which looked like the app drifting to the middle / stacking).
const ESC = String.fromCharCode(27)
const isTTY = Boolean(process.stdout.isTTY)

if (isTTY) {
  process.stdout.write(`${ESC}[?1049h${ESC}[2J${ESC}[H`) // enter alt screen, clear, home
  // Only clear when the character grid actually changed. Terminals also fire
  // 'resize' on no-op events (focus, sub-cell drags); clearing on those wiped
  // the screen while Ink — seeing identical content — didn't redraw → blank.
  let lastCols = process.stdout.columns
  let lastRows = process.stdout.rows
  process.stdout.on('resize', () => {
    if (process.stdout.columns === lastCols && process.stdout.rows === lastRows) return
    lastCols = process.stdout.columns
    lastRows = process.stdout.rows
    process.stdout.write(`${ESC}[2J${ESC}[H`)
  })
}

let cleaned = false
const cleanup = () => {
  if (cleaned || !isTTY) return
  cleaned = true
  process.stdout.write(`${ESC}[?1049l`) // leave alt screen, restore the shell
}
process.on('exit', cleanup)

// `checklist "plan a trip"` generates that goal immediately, skipping the menu.
const initialGoal = process.argv.slice(2).join(' ').trim() || undefined

const {waitUntilExit} = render(<App initialGoal={initialGoal} />)
void waitUntilExit().finally(cleanup)
