import {existsSync, readFileSync} from 'node:fs'
import {createInterface} from 'node:readline/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import os from 'node:os'
import {DATA_DIR} from '../store'

const PACKAGE = 'checklist-tui'
const UPDATE = new Set(['update', 'upgrade'])
const UNINSTALL = new Set(['uninstall', 'unistall', 'unintall', 'uninstal', 'remove'])

const tty = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
const wrap = (code: number, s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s)
const blue = (s: string) => wrap(34, s)
const bold = (s: string) => wrap(1, s)
const ok = `${bold('[')}${blue('✓')}${bold(']')}`

export const HELP =
  '\n  A checklist app for your terminal.\n' +
  '\n    checklist\n' +
  '    checklist "trip to sf for 10 days"\n' +
  '    checklist update\n' +
  '    checklist uninstall\n\n'

function say(body: string) {
  process.stdout.write(body.endsWith('\n') ? body : `${body}\n`)
}

function dataPath() {
  return DATA_DIR.replace(os.homedir(), '~')
}

export function packageVersion(): string {
  try {
    const pkg = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
    return JSON.parse(readFileSync(pkg, 'utf8')).version as string
  } catch {
    return '0.1.5'
  }
}

function npmBin(): string {
  const local = join(dirname(process.execPath), process.platform === 'win32' ? 'npm.cmd' : 'npm')
  return existsSync(local) ? local : process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function npm(args: string[]) {
  const result = spawnSync(npmBin(), args, {
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return {
    status: result.status,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  }
}

function npmError(result: {stdout: string; stderr: string}) {
  return (result.stderr || result.stdout || 'npm failed').trim()
}

function globalVersion(): string | null {
  const result = npm(['list', '-g', '--json', '--depth=0', PACKAGE])
  try {
    const json = JSON.parse(result.stdout || '{}') as {
      dependencies?: Record<string, {version?: string}>
    }
    return json.dependencies?.[PACKAGE]?.version ?? null
  } catch {
    return null
  }
}

function latestVersion(): string | null {
  const result = npm(['view', PACKAGE, 'version'])
  if (result.status !== 0) return null
  const version = (result.stdout || '').trim()
  return version || null
}

function commandName(args: string[]): 'update' | 'uninstall' | null {
  const raw = args[0]?.toLowerCase()
  if (!raw) return null
  const token = raw.replace(/^--?/, '')
  if (UPDATE.has(token)) return 'update'
  if (UNINSTALL.has(token)) return 'uninstall'
  return null
}

function hasFlag(flags: string[], ...names: string[]) {
  return flags.some(flag => names.includes(flag))
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false
  const rl = createInterface({input: process.stdin, output: process.stdout})
  try {
    const answer = (await rl.question(question)).trim().toLowerCase()
    return answer === 'y' || answer === 'yes'
  } finally {
    rl.close()
  }
}

function updateHelp() {
  say('\n  Install the latest Checklist from npm.\n\n    checklist update\n\n')
}

function uninstallHelp() {
  say(
    '\n  Remove the Checklist command. Lists stay on this machine.\n' +
    '\n    checklist uninstall\n' +
    '    checklist uninstall -y\n\n',
  )
}

async function update(): Promise<number> {
  const installed = globalVersion()
  const latest = latestVersion()
  if (installed && latest && installed === latest) {
    say(`\n  ${ok} ${bold('Already the latest')} (${installed})\n\n`)
    return 0
  }

  say(`\n  Updating Checklist…\n`)
  const result = npm(['install', '-g', `${PACKAGE}@latest`])
  if (result.status !== 0) {
    say(`\n  Couldn’t update.\n\n    ${npmError(result).split('\n')[0]}\n\n`)
    return 1
  }

  const next = globalVersion() ?? latest ?? packageVersion()
  say(`\n  ${ok} ${bold('Updated to')} ${next}\n\n    ${blue('checklist')}\n\n`)
  return 0
}

async function uninstall(yes: boolean): Promise<number> {
  if (!globalVersion()) {
    say('\n  Checklist isn’t installed as a global command.\n\n')
    return 1
  }

  if (!yes) {
    if (!process.stdin.isTTY) {
      say('\n  Pass -y to uninstall.\n\n')
      return 1
    }
    const okToRemove = await confirm('  Remove Checklist from this machine? [y/N] ')
    if (!okToRemove) {
      say('  Kept.\n\n')
      return 0
    }
  }

  const result = npm(['uninstall', '-g', PACKAGE])
  if (result.status !== 0) {
    say(`\n  Couldn’t uninstall.\n\n    ${npmError(result).split('\n')[0]}\n\n`)
    return 1
  }

  say(
    `\n  ${ok} ${bold('Checklist')} is uninstalled.\n` +
    `\n    Your lists are still at ${blue(dataPath())}\n\n`,
  )
  return 0
}

/** `update` / `uninstall` always win as the first word — never a generate goal. */
export async function runSelfCommand(args: string[]): Promise<number | null> {
  const command = commandName(args)
  if (!command) return null
  const flags = args.slice(1)

  if (hasFlag(flags, '-h', '--help')) {
    if (command === 'update') updateHelp()
    else uninstallHelp()
    return 0
  }

  if (command === 'update') return update()
  return uninstall(hasFlag(flags, '-y', '--yes'))
}
