#!/usr/bin/env node
import fs from 'node:fs'

// Local `npm install` in this repo, CI, and dependency installs stay quiet.
// Global installs are the ones that need a next step.
if (process.env.CI) process.exit(0)
if (process.env.npm_config_global !== 'true') process.exit(0)

const color = !process.env.NO_COLOR
const wrap = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s)
const blue = (s) => wrap(34, s)
const bold = (s) => wrap(1, s)

const msg =
  `\n  ${bold('[')}${blue('✓')}${bold(']')} ${bold('Checklist')} is installed.\n` +
  `\n    ${blue('checklist')}` +
  `\n    ${blue('checklist')} "plan a 3-day trip to Lisbon"\n\n`

function say(text) {
  // npm 7+ swallows postinstall stdout. Write to the real terminal instead.
  const targets = process.platform === 'win32' ? ['\\\\.\\CON'] : ['/dev/tty']
  for (const target of targets) {
    try {
      fs.writeFileSync(target, text)
      return
    } catch {}
  }
  try {
    fs.writeSync(2, text)
  } catch {}
}

say(msg)
