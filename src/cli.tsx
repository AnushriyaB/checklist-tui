#!/usr/bin/env node
import React from 'react'
import {render} from 'ink'
import {App} from './app'
import {captureFrames} from './lib/click-map'

// Enter the alternate screen buffer BEFORE Ink's first render, so Ink draws
// from row 1 of a cleared screen. This is what makes mouse hit-testing line up
// (a click at terminal row y maps to frame line y-1) and stops resize ghosting.
const ESC = String.fromCharCode(27)
const isTTY = Boolean(process.stdout.isTTY)

// Belt-and-suspenders cleanup: turn mouse reporting off AND leave the alt
// screen, so a click after exit can't leak `0;57;13m`-style junk to the shell
// and the user's scrollback comes back.
let cleaned = false
const cleanup = () => {
  if (cleaned || !isTTY) return
  cleaned = true
  process.stdout.write(`${ESC}[?1006l${ESC}[?1000l`) // disable SGR mouse reporting
  process.stdout.write(`${ESC}[?1049l`) // leave alt screen
}

if (isTTY) process.stdout.write(`${ESC}[?1049h${ESC}[H`)
process.on('exit', cleanup)

// `checklist "plan a trip"` generates that goal immediately, skipping the menu.
const initialGoal = process.argv.slice(2).join(' ').trim() || undefined

const {waitUntilExit} = render(<App initialGoal={initialGoal} />, {stdout: captureFrames(process.stdout)})
void waitUntilExit().finally(cleanup)
