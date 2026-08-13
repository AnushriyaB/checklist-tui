import {spawn} from 'node:child_process'

export type Cue = 'toggle' | 'complete' | 'generate'

// macOS ships tasteful system cues — borrow a few, no bundled files needed.
const FILES: Record<Cue, string> = {
  toggle: '/System/Library/Sounds/Tink.aiff', // soft tick when a task is checked
  complete: '/System/Library/Sounds/Glass.aiff', // chime when a whole list is done
  generate: '/System/Library/Sounds/Pop.aiff', // quiet pop when AI finishes
}

/** Only macOS ships `afplay` + these sounds. Elsewhere, cues silently no-op. */
export const soundAvailable = process.platform === 'darwin'

/**
 * Play a subtle interaction cue. Non-blocking (detached), quiet (-v 0.35), and
 * silent if `afplay` isn't there — never interrupts or crashes the TUI.
 */
export function play(cue: Cue) {
  if (!soundAvailable) return
  try {
    const child = spawn('afplay', ['-v', '0.35', FILES[cue]], {stdio: 'ignore', detached: true})
    child.on('error', () => {}) // no afplay → stay silent
    child.unref()
  } catch {
    /* ignore */
  }
}
