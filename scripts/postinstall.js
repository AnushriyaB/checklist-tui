#!/usr/bin/env node
import {execFileSync, spawn} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const self = fileURLToPath(import.meta.url)
const root = path.join(path.dirname(self), '..')

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

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function psCol(pid, col) {
  try {
    return execFileSync('ps', ['-p', String(pid), '-o', `${col}=`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function toDevPath(tty) {
  if (!tty || tty === '?' || tty === '??') return null
  if (tty.startsWith('/dev/')) return tty
  return `/dev/${tty}`
}

// npm 7+ runs postinstall in the background with no controlling terminal, so
// `/dev/tty` fails. Walk parents until we find the real pty (the user's shell).
function findTtyPath() {
  for (const candidate of ['/dev/tty', process.env.CHECKLIST_TTY]) {
    if (!candidate) continue
    try {
      fs.accessSync(candidate, fs.constants.R_OK | fs.constants.W_OK)
      return candidate
    } catch {}
  }
  let pid = process.ppid
  for (let i = 0; i < 16 && pid > 1; i++) {
    const dev = toDevPath(psCol(pid, 'tty'))
    if (dev) {
      try {
        fs.accessSync(dev, fs.constants.R_OK | fs.constants.W_OK)
        return dev
      } catch {}
    }
    pid = Number(psCol(pid, 'ppid')) || 0
  }
  return null
}

function isGlobalInstall() {
  if (process.env.CI) return false
  if (['true', '1'].includes(String(process.env.npm_config_global))) return true
  const prefix = process.env.npm_config_prefix
  if (!prefix) return false
  try {
    const here = fs.realpathSync(root)
    const globalDir = path.join(prefix, 'lib', 'node_modules', 'checklist-tui')
    return fs.existsSync(globalDir) && fs.realpathSync(globalDir) === here
  } catch {
    return false
  }
}

function openTty(ttyPath) {
  try {
    return fs.openSync(ttyPath, 'r+')
  } catch {
    return null
  }
}

function writeBanner(fd) {
  fs.writeSync(fd, '\x1b[2J\x1b[H')
  fs.writeSync(fd, banner())
}

if (process.env.CHECKLIST_AFTER_NPM === '1') {
  sleep(200)
  const fd = openTty(process.env.CHECKLIST_TTY)
  if (fd != null) {
    writeBanner(fd)
    fs.closeSync(fd)
  }
  process.exit(0)
}

if (!isGlobalInstall()) process.exit(0)

const ttyPath = findTtyPath()
if (!ttyPath) process.exit(0)
const fd = openTty(ttyPath)
if (fd == null) process.exit(0)

writeBanner(fd)

const cleaner = spawn(process.execPath, [self], {
  detached: true,
  stdio: 'ignore',
  env: {
    ...process.env,
    CHECKLIST_AFTER_NPM: '1',
    CHECKLIST_TTY: ttyPath,
  },
})
cleaner.unref()
