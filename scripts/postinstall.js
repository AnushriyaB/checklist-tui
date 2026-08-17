#!/usr/bin/env node
import {execFileSync, spawn} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const self = fileURLToPath(import.meta.url)
const cli = path.join(path.dirname(self), '..', 'dist', 'cli.js')
const ttyFile = process.platform === 'win32' ? '\\\\.\\CON' : '/dev/tty'

function banner() {
  const color = !process.env.NO_COLOR
  const wrap = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s)
  const blue = (s) => wrap(34, s)
  const bold = (s) => wrap(1, s)
  return (
    `\n  ${bold('[')}${blue('✓')}${bold(']')} ${bold('Checklist')} is installed.\n` +
    `\n    ${blue('checklist')}` +
    `\n    ${blue('checklist')} "trip to sf for 10 days"\n\n`
  )
}

function npmStillRunning(pid) {
  try {
    const cmd = execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return /\bnpm\b/.test(cmd)
  } catch {
    return false
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function greetAndOpen(npmPid) {
  while (npmStillRunning(npmPid)) sleep(60)
  // Let npm flush "changed N packages" onto the screen, then wipe it.
  sleep(150)

  let fd
  try {
    fd = fs.openSync(ttyFile, 'r+')
  } catch {
    process.exit(0)
  }

  fs.writeSync(fd, '\x1b[2J\x1b[H')
  fs.writeSync(fd, banner())

  if (!fs.existsSync(cli)) process.exit(0)

  const child = spawn(process.execPath, [cli], {
    stdio: [fd, fd, fd],
    env: process.env,
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

if (process.env.CHECKLIST_WAIT_PPID) {
  greetAndOpen(Number(process.env.CHECKLIST_WAIT_PPID))
} else {
  if (process.env.CI || process.env.npm_config_global !== 'true') process.exit(0)
  const child = spawn(process.execPath, [self], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      CHECKLIST_WAIT_PPID: String(process.ppid),
    },
  })
  child.unref()
}
