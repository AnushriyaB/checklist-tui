import {promises as fs} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {randomUUID} from 'node:crypto'

// --- Data model -------------------------------------------------------------
// A checklist holds groups (the AI calls them "phases"); each group holds
// tasks. Modelling groups now — even though step 1's manual entry only uses a
// single default group — means the AI's phase/subtask output in step 3 drops
// straight in with no migration.
export type Task = {id: string; text: string; done: boolean}
export type Group = {id: string; title: string; tasks: Task[]}
export type Checklist = {id: string; title: string; groups: Group[]; createdAt: string}

// --- Where it lives ---------------------------------------------------------
// One JSON file under the user's config dir. No database, no accounts — the
// whole point of the TUI version.
const DIR = path.join(os.homedir(), '.config', 'checklist')
const FILE = path.join(DIR, 'data.json')

export async function loadChecklists(): Promise<Checklist[]> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    const parsed = JSON.parse(raw) as {checklists?: Checklist[]}
    return Array.isArray(parsed.checklists) ? parsed.checklists : []
  } catch {
    // First run — the file doesn't exist yet. Empty is the correct answer.
    return []
  }
}

export async function saveChecklists(checklists: Checklist[]): Promise<void> {
  await fs.mkdir(DIR, {recursive: true})
  await fs.writeFile(FILE, JSON.stringify({checklists}, null, 2), 'utf8')
}

// --- Constructors -----------------------------------------------------------
export const newChecklist = (title: string): Checklist => ({
  id: randomUUID(),
  title,
  groups: [],
  createdAt: new Date().toISOString(),
})

export const newGroup = (title: string): Group => ({id: randomUUID(), title, tasks: []})
export const newTask = (text: string): Task => ({id: randomUUID(), text, done: false})

// --- Derived ----------------------------------------------------------------
export function progress(checklist: Checklist): {done: number; total: number} {
  const tasks = checklist.groups.flatMap(group => group.tasks)
  return {done: tasks.filter(task => task.done).length, total: tasks.length}
}
