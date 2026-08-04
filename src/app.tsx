import React, {useEffect, useRef, useState} from 'react'
import {Box, Text, useApp, useInput} from 'ink'
import {TextField} from './components/text-field'
import {ProgressBar} from './components/progress-bar'
import {Shortcuts, type Hint} from './components/shortcuts'
import {Spinner} from './components/spinner'
import {Shimmer} from './components/shimmer'
import {Welcome} from './components/welcome'
import {Screen, Gap, useColumns, useRows, contentWidth} from './components/screen'
import {generateChecklist, GenerationError, type GenErrorCode} from './lib/ai'
import {ThemeProvider, useTheme, nextThemeMode, type ThemeMode} from './theme'
import {
  loadChecklists,
  saveChecklists,
  newChecklist,
  newGroup,
  newTask,
  checklistFromAi,
  progress,
  type Checklist,
  type Group,
} from './store'

// The whole app is one state machine. Each phase carries exactly the data it
// needs (e.g. which checklist is open), which makes illegal states impossible.
type Phase =
  | {name: 'list'}
  | {name: 'new'}
  | {name: 'detail'; id: string}
  | {name: 'addTask'; id: string}
  | {name: 'confirmDelete'; id: string}
  | {name: 'prompt'}
  | {name: 'generating'; goal: string}
  | {name: 'genError'; goal: string; code: GenErrorCode}
  | {name: 'editTask'; id: string; taskId: string}

// Each phase declares its own keyboard hints — the row shown at the bottom.
// (genError's hints are built dynamically — retry only makes sense for failures.)
const HINTS: Record<Phase['name'], Array<[string, string]>> = {
  list: [['↑↓', 'move'], ['↵', 'open'], ['g', 'generate'], ['n', 'new'], ['d', 'delete'], ['?', 'help'], ['^t', 'theme'], ['^c', 'quit']],
  new: [['↵', 'create'], ['esc', 'cancel']],
  detail: [['↑↓', 'move'], ['space', 'toggle'], ['e', 'edit'], ['a', 'add'], ['x', 'delete'], ['/', 'filter'], ['?', 'help'], ['esc', 'back']],
  addTask: [['↵', 'add'], ['esc', 'done']],
  editTask: [['↵', 'save'], ['esc', 'cancel']],
  confirmDelete: [['y', 'delete'], ['n', 'keep']],
  prompt: [['↵', 'generate'], ['esc', 'back']],
  generating: [['esc', 'cancel']],
  genError: [['esc', 'back']],
}

// One friendly, provider-agnostic message for every failure. The user never
// sees "OpenRouter", an API-key name, or any other plumbing — just what happened
// and the two ways forward (retry, or go back).
const GEN_ERROR = {
  title: "Couldn't generate that checklist",
  body: 'Something went wrong this time. Give it another try, or head back and add one yourself.',
}
const RETRY_LABEL = '↵  Try again'
// Footer keys shown muted (navigation / system), vs accent for action keys.
const MUTED_KEYS = new Set(['↑↓', '^c'])

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

// Greedy word-wrap to a cell width, hard-breaking any single word that's too
// long. We wrap by hand (rather than leaning on Ink) so we know exactly what
// lands on line 1 — that's what mouse hit-testing matches against.
function wrapText(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let w = word
    while (w.length > width) {
      if (line) {
        lines.push(line)
        line = ''
      }
      lines.push(w.slice(0, width))
      w = w.slice(width)
    }
    if (!line) line = w
    else if (line.length + 1 + w.length <= width) line += ` ${w}`
    else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

// Goal suggestions across the perspectives the user cares about (design / eng /
// PM), plus one everyday one. Tab in the prompt fills the current one.
const SUGGESTIONS = [
  'Plan a 3-day trip to Lisbon',
  'Run a usability test for the new onboarding flow',
  'Audit and clean up our design system components',
  'Ship a REST API with authentication and tests',
  'Migrate the web app from Webpack to Vite',
  'Write a PRD for a notifications feature',
  'Plan a product launch for Q3',
  'Turn this project into a portfolio case study',
]

// Shortcut reference shown by the '?' overlay. Keys use plain words (opt/ctrl)
// rather than ⌥/⌃ glyphs to avoid width surprises in the fixed key column.
const HELP: Array<{heading: string; rows: Array<[keys: string, desc: string]>}> = [
  {
    heading: 'Dashboard',
    rows: [
      ['↑↓ / j k', 'move between checklists'],
      ['↵', 'open'],
      ['g', 'generate one with AI'],
      ['n', 'new empty list'],
      ['d', 'delete list'],
    ],
  },
  {
    heading: 'Inside a checklist',
    rows: [
      ['↑↓ / j k', 'move between tasks'],
      ['space', 'toggle done'],
      ['e', 'edit task'],
      ['a', 'add task'],
      ['x', 'delete task'],
      ['/', 'filter: all → done → to-do'],
    ],
  },
  {
    heading: 'Typing',
    rows: [
      ['← →', 'move by character'],
      ['opt ← →', 'move by word'],
      ['ctrl a/e', 'jump to line start / end'],
      ['tab', 'use suggestion (goal prompt)'],
    ],
  },
  {
    heading: 'Anywhere',
    rows: [
      ['^t', 'cycle theme'],
      ['esc', 'back / cancel'],
      ['?', 'toggle this help'],
      ['^c', 'quit'],
    ],
  },
]

// Map a global task index (the cursor) to its group and position-in-group, so
// a new task can be inserted right where the user is. Past the end → last group.
function locate(groups: Group[], globalIndex: number): {gi: number; ti: number} {
  let count = 0
  for (let g = 0; g < groups.length; g++) {
    if (globalIndex < count + groups[g]!.tasks.length) return {gi: g, ti: globalIndex - count}
    count += groups[g]!.tasks.length
  }
  const gi = Math.max(0, groups.length - 1)
  return {gi, ti: groups[gi]?.tasks.length ?? 0}
}

// Flatten a checklist's groups into one navigable list of rows, remembering
// where each group starts so we can print its header once.
function flatten(checklist: Checklist) {
  const rows: Array<{groupTitle: string; firstOfGroup: boolean; task: Checklist['groups'][number]['tasks'][number]}> = []
  for (const group of checklist.groups) {
    group.tasks.forEach((task, i) => rows.push({groupTitle: group.title, firstOfGroup: i === 0, task}))
  }
  return rows
}

export function App({initialGoal}: {initialGoal?: string}) {
  // Default to `dark` so the launch background tint is coherent; `^t` cycles to
  // light or `auto` (auto leaves your terminal's own colours untouched).
  const [mode, setMode] = useState<ThemeMode>('dark')
  return (
    <ThemeProvider mode={mode}>
      <AppInner cycleTheme={() => setMode(nextThemeMode)} initialGoal={initialGoal} />
    </ThemeProvider>
  )
}

function AppInner({cycleTheme, initialGoal}: {cycleTheme: () => void; initialGoal?: string}) {
  const theme = useTheme()
  const {exit} = useApp()
  const width = contentWidth(useColumns()) // content area, re-measured on resize
  const rows = useRows() // terminal height, for the scroll viewport
  const showBar = width >= 44 // hide the progress bar when there's no room for it
  const scrollTop = useRef(0) // first visible display-line of the task viewport
  // border(2)+padX(2)+marker(2)+checkbox(2) = 8, plus 2 cells of slack so a
  // terminal-wide glyph (e.g. "◻" rendering 2 cells) can't overflow the row and
  // trigger a phantom wrap — which also desynced footer mouse hit-testing.
  const taskTextWidth = Math.max(4, width - 10)
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [phase, setPhase] = useState<Phase>(initialGoal ? {name: 'generating', goal: initialGoal} : {name: 'list'})
  const [listCursor, setListCursor] = useState(0)
  const [taskCursor, setTaskCursor] = useState(0)
  const [draft, setDraft] = useState('') // shared value for the text inputs
  const [suggestionIndex, setSuggestionIndex] = useState(0) // which goal suggestion Tab fills
  const [celebrating, setCelebrating] = useState(false) // brief burst when a list hits 100%
  const [taskFilter, setTaskFilter] = useState<'all' | 'done' | 'todo'>('all') // '/' cycles this
  const [showHelp, setShowHelp] = useState(false) // '?' overlay
  const genAbort = useRef<AbortController | undefined>(undefined) // cancels an in-flight generation

  // Load once on startup.
  useEffect(() => {
    void loadChecklists().then(setChecklists)
  }, [])

  // Auto-clear the celebration after a short beat.
  useEffect(() => {
    if (!celebrating) return
    const timer = setTimeout(() => setCelebrating(false), 2200)
    return () => clearTimeout(timer)
  }, [celebrating])

  // Every change writes straight to disk — no explicit "save" for the user.
  const persist = (next: Checklist[]) => {
    setChecklists(next)
    void saveChecklists(next)
  }
  // Prepend a new checklist using the latest state (survives the startup load
  // race when generating from a CLI argument).
  const addChecklist = (created: Checklist) =>
    setChecklists(prev => {
      const next = [created, ...prev]
      void saveChecklists(next)
      return next
    })
  const updateChecklist = (id: string, fn: (c: Checklist) => Checklist) =>
    persist(checklists.map(c => (c.id === id ? fn(c) : c)))

  const openChecklist =
    phase.name === 'detail' || phase.name === 'addTask' || phase.name === 'editTask'
      ? checklists.find(c => c.id === phase.id)
      : undefined

  // Fixed count column (widest count wins) so every home row's bar starts at
  // the same x — the bars line up instead of jittering per row.
  const listCountW = Math.max(3, ...checklists.map(c => {
    const {done, total} = progress(c)
    return `${done}/${total}`.length
  }))
  const listTitleW = Math.max(4, width - 3 - (showBar ? 11 : 0) - listCountW)

  // Rows to show for the open checklist — '/' cycles all → done → to-do.
  const visibleRows = (cl: Checklist) => {
    const all = flatten(cl)
    if (taskFilter === 'done') return all.filter(r => r.task.done)
    if (taskFilter === 'todo') return all.filter(r => !r.task.done)
    return all
  }

  // --- Actions --------------------------------------------------------------
  const submitNew = (value: string) => {
    const title = value.trim()
    if (!title) return
    const created = newChecklist(title)
    addChecklist(created)
    setDraft('')
    setListCursor(0)
    setTaskCursor(0)
    setPhase({name: 'detail', id: created.id}) // open it so you can add tasks right away
  }

  const submitTask = (value: string) => {
    const text = value.trim()
    if (phase.name !== 'addTask') return
    if (!text) return
    const current = checklists.find(c => c.id === phase.id)
    const hadTasks = !!current && current.groups.some(g => g.tasks.length > 0)
    updateChecklist(phase.id, c => {
      const groups = c.groups.length ? c.groups : [newGroup('Tasks')]
      const {gi, ti} = locate(groups, taskCursor)
      const next = groups.map((g, idx) => {
        if (idx !== gi) return g
        const tasks = [...g.tasks]
        tasks.splice(ti + 1, 0, newTask(text)) // insert right after the current task
        return {...g, tasks}
      })
      return {...c, groups: next}
    })
    setDraft('') // stay in addTask with a fresh field so you can add several in a row
    setTaskCursor(prev => (hadTasks ? prev + 1 : 0)) // follow the newly added task
  }

  const toggleTask = (id: string, taskId: string) => {
    const current = checklists.find(c => c.id === id)
    updateChecklist(id, c => ({
      ...c,
      groups: c.groups.map(g => ({
        ...g,
        tasks: g.tasks.map(t => (t.id === taskId ? {...t, done: !t.done} : t)),
      })),
    }))
    // Celebrate the moment a checklist goes from incomplete to fully done.
    if (current) {
      const before = progress(current)
      const willComplete = before.total > 0 && before.done === before.total - 1
      // (the task we just toggled — only fire if it was the one unchecked task left)
      const target = current.groups.flatMap(g => g.tasks).find(t => t.id === taskId)
      if (willComplete && target && !target.done) setCelebrating(true)
    }
  }

  const submitEdit = (value: string) => {
    if (phase.name !== 'editTask') return
    const text = value.trim()
    if (text) {
      updateChecklist(phase.id, c => ({
        ...c,
        groups: c.groups.map(g => ({...g, tasks: g.tasks.map(t => (t.id === phase.taskId ? {...t, text} : t))})),
      }))
    }
    setDraft('')
    setPhase({name: 'detail', id: phase.id})
  }

  const deleteTask = (id: string, taskId: string) => {
    const current = checklists.find(c => c.id === id)
    const newTotal = current ? current.groups.flatMap(g => g.tasks).filter(t => t.id !== taskId).length : 0
    updateChecklist(id, c => ({
      ...c,
      // drop the task, and any phase left empty by it
      groups: c.groups.map(g => ({...g, tasks: g.tasks.filter(t => t.id !== taskId)})).filter(g => g.tasks.length > 0),
    }))
    setTaskCursor(prev => Math.max(0, Math.min(prev, newTotal - 1)))
  }

  // Run a generation. On success, save the checklist and open it; on failure,
  // land on a friendly error screen carrying the goal so retry re-runs it.
  const startGenerate = (goal: string) => {
    const controller = new AbortController()
    genAbort.current = controller
    setPhase({name: 'generating', goal})
    void (async () => {
      try {
        const ai = await generateChecklist(goal, controller.signal)
        if (controller.signal.aborted) return
        const created = checklistFromAi(ai)
        addChecklist(created)
        setDraft('')
        setListCursor(0)
        setTaskCursor(0)
        setPhase({name: 'detail', id: created.id})
      } catch (error) {
        if (controller.signal.aborted) return // user cancelled — handled elsewhere
        const code = error instanceof GenerationError ? error.code : 'SERVICE'
        setPhase({name: 'genError', goal, code})
      }
    })()
  }

  const cancelGenerate = () => {
    genAbort.current?.abort()
    setPhase({name: 'prompt'}) // back to the goal field with the text still there
  }

  // Launched as `checklist "some goal"` → generate it right away.
  useEffect(() => {
    if (initialGoal) startGenerate(initialGoal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Keyboard -------------------------------------------------------------
  useInput((input, key) => {
    // Global — works in every phase.
    if (key.ctrl && input === 'c') return exit()
    if (key.ctrl && input === 't') return cycleTheme()

    // Help overlay swallows everything but its own close keys.
    if (showHelp) {
      if (input === '?' || key.escape) setShowHelp(false)
      return
    }
    if (input === '?' && (phase.name === 'list' || phase.name === 'detail')) {
      setShowHelp(true)
      return
    }

    // Text-entry phases: the field handles typing; we only catch esc.
    if (phase.name === 'new' || phase.name === 'addTask') {
      if (key.escape) {
        setDraft('')
        setPhase(phase.name === 'addTask' ? {name: 'detail', id: phase.id} : {name: 'list'})
      }
      return
    }

    if (phase.name === 'editTask') {
      if (key.escape) {
        setDraft('')
        setPhase({name: 'detail', id: phase.id})
      }
      return
    }

    if (phase.name === 'confirmDelete') {
      if (input === 'y') {
        const next = checklists.filter(c => c.id !== phase.id)
        persist(next)
        setListCursor(c => Math.max(0, Math.min(c, next.length - 1)))
        setPhase({name: 'list'})
      } else if (input === 'n' || key.escape) {
        setPhase({name: 'list'})
      }
      return
    }

    // Goal prompt: TextInput handles typing + ↵ (onSubmit generates); we catch
    // Tab (fill the current suggestion, then advance) and esc.
    if (phase.name === 'prompt') {
      if (key.tab && !draft) {
        setDraft(SUGGESTIONS[suggestionIndex]!)
        setSuggestionIndex(i => (i + 1) % SUGGESTIONS.length)
      } else if (key.escape) {
        setDraft('')
        setPhase({name: 'list'})
      }
      return
    }

    if (phase.name === 'generating') {
      if (key.escape) cancelGenerate()
      return
    }

    if (phase.name === 'genError') {
      if (key.return) startGenerate(phase.goal)
      else if (key.escape) setPhase({name: 'list'})
      return
    }

    if (phase.name === 'list') {
      if (key.upArrow || input === 'k') setListCursor(c => Math.max(0, c - 1))
      if (key.downArrow || input === 'j') setListCursor(c => Math.min(checklists.length - 1, c + 1))
      const current = checklists[listCursor]
      if (key.return && current) {
        setTaskFilter('all')
        setTaskCursor(0)
        setPhase({name: 'detail', id: current.id})
      }
      if (input === 'g') {
        setDraft('')
        setPhase({name: 'prompt'})
      }
      if (input === 'n') {
        setDraft('')
        setPhase({name: 'new'})
      }
      if (input === 'd' && current) setPhase({name: 'confirmDelete', id: current.id})
      return
    }

    if (phase.name === 'detail' && openChecklist) {
      const rows = visibleRows(openChecklist)
      if (key.upArrow || input === 'k') setTaskCursor(c => Math.max(0, c - 1))
      if (key.downArrow || input === 'j') setTaskCursor(c => Math.min(Math.max(0, rows.length - 1), c + 1))
      if (input === '/') {
        // cycle the filter: all → done → to-do → all
        setTaskFilter(f => (f === 'all' ? 'done' : f === 'done' ? 'todo' : 'all'))
        setTaskCursor(0)
        return
      }
      if (input === ' ') {
        const row = rows[taskCursor]
        if (row) toggleTask(openChecklist.id, row.task.id)
      }
      if (input === 'a') {
        setDraft('')
        setPhase({name: 'addTask', id: openChecklist.id})
      }
      if (input === 'e') {
        const row = rows[taskCursor]
        if (row) {
          setDraft(row.task.text)
          setPhase({name: 'editTask', id: openChecklist.id, taskId: row.task.id})
        }
      }
      if (input === 'x') {
        const row = rows[taskCursor]
        if (row) deleteTask(openChecklist.id, row.task.id)
      }
      if (key.escape) {
        if (taskFilter !== 'all') setTaskFilter('all') // clear the filter first
        else setPhase({name: 'list'})
      }
      return
    }
  }, {isActive: Boolean(process.stdin.isTTY)}) // no raw-mode crash when piped / non-TTY

  // --- Footer hints ---------------------------------------------------------
  const hints: Array<[string, string]> =
    phase.name === 'genError' ? [['↵', 'try again'], ...HINTS.genError] : HINTS[phase.name]
  // Navigation/system keys read muted; the action keys get the accent.
  const footerHints: Hint[] = hints.map(([k, l]) => [k, l, !MUTED_KEYS.has(k)])

  // --- Render ---------------------------------------------------------------
  // Below this the fixed-width pieces (borders, padding, progress bar) can't
  // fit; show a nudge instead of letting the layout overflow and garble.
  if (width < 24) {
    return (
      <Screen>
        <Text color={theme.muted} dimColor={theme.dimMuted}>Make the terminal a little wider ↔</Text>
      </Screen>
    )
  }

  if (showHelp) {
    return (
      <Screen>
        <Text bold color={theme.accent}>✓ checklists — shortcuts</Text>
        <Gap />
        <Box
          flexDirection="column"
          width={width}
          borderStyle="round"
          borderColor={theme.muted}
          borderDimColor={theme.dimMuted}
          paddingX={2}
          paddingY={1}
        >
          {HELP.map((section, si) => (
            <Box key={section.heading} flexDirection="column" marginTop={si === 0 ? 0 : 1}>
              <Text bold color={theme.muted} dimColor={theme.dimMuted}>{section.heading}</Text>
              {section.rows.map(([keys, desc]) => (
                <Box key={keys}>
                  <Box width={12} flexShrink={0}><Text color={theme.accent}>{keys}</Text></Box>
                  <Box flexGrow={1} flexShrink={1} minWidth={0}>
                    <Text color={theme.text}>{desc}</Text>
                  </Box>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
        <Gap />
        <Shortcuts items={[['?', 'close', false], ['esc', 'close', false]]} />
      </Screen>
    )
  }

  return (
    <Screen>
      {phase.name === 'list' && <Welcome count={checklists.length} width={width} />}
      {(phase.name === 'new' ||
        phase.name === 'confirmDelete' ||
        phase.name === 'prompt' ||
        phase.name === 'generating' ||
        phase.name === 'genError') && (
        <Text bold color={theme.accent}>✓ checklists</Text>
      )}

      <Gap />

      {phase.name === 'list' &&
        (checklists.length === 0 ? (
          <Box flexDirection="column">
            <Text color={theme.muted} dimColor={theme.dimMuted}>No checklists yet.</Text>
            <Text color={theme.muted} dimColor={theme.dimMuted}>
              Press <Text color={theme.accent} bold>g</Text> to generate one with AI, or{' '}
              <Text color={theme.accent} bold>n</Text> to add one yourself.
            </Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {checklists.map((c, i) => {
              const {done, total} = progress(c)
              const selected = i === listCursor
              // Tight one-line rows (no border boxes). The selected row lifts with
              // a subtle fill; the whole row is one Text so the fill is continuous
              // (Ink 5 can't background a Box). Widths are padded by hand.
              const bg = selected ? theme.barBg : undefined
              const countStr = `${done}/${total}`.padStart(listCountW)
              const barW = showBar ? 10 : 0
              const titleW = listTitleW
              const title = truncate(c.title, titleW).padEnd(titleW)
              const filled = total > 0 ? Math.round((done / total) * barW) : 0
              const complete = total > 0 && done === total
              return (
                <Box key={c.id} width={width}>
                  <Text backgroundColor={bg} wrap="truncate-end">
                    <Text backgroundColor={bg} color={theme.accent} bold>{selected ? '❯ ' : '  '}</Text>
                    <Text backgroundColor={bg} color={theme.text} bold={selected}>{title}</Text>
                    <Text backgroundColor={bg}> </Text>
                    {showBar ? (
                      <Text>
                        <Text backgroundColor={bg} color={complete ? theme.accent : theme.text}>{'█'.repeat(filled)}</Text>
                        <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{'░'.repeat(barW - filled)}</Text>
                        <Text backgroundColor={bg}> </Text>
                      </Text>
                    ) : null}
                    <Text backgroundColor={bg} color={theme.muted} dimColor={theme.dimMuted}>{countStr}</Text>
                  </Text>
                </Box>
              )
            })}
          </Box>
        ))}

      {phase.name === 'new' && (
        <Box flexDirection="column">
          <Text color={theme.text}>Name your checklist:</Text>
          <Box>
            <Text color={theme.accent}>❯ </Text>
            <TextField
              value={draft}
              onChange={setDraft}
              onSubmit={submitNew}
              placeholder="e.g. Plan a weekend trip"
            />
          </Box>
        </Box>
      )}

      {phase.name === 'prompt' && (
        <Box flexDirection="column" width={width}>
          <Text color={theme.text}>What do you want to get done?</Text>
          <Text color={theme.muted} dimColor={theme.dimMuted}>AI will turn it into a step-by-step checklist.</Text>
          <Gap />
          <Box>
            <Text color={theme.accent}>❯ </Text>
            <Box flexGrow={1} flexShrink={1} minWidth={0}>
              <TextField
                value={draft}
                onChange={setDraft}
                onSubmit={value => {
                  const goal = value.trim()
                  if (goal) startGenerate(goal)
                }}
                placeholder={SUGGESTIONS[suggestionIndex]}
              />
            </Box>
            {!draft ? (
              <Box flexShrink={0} marginLeft={2}>
                <Text color={theme.muted} dimColor={theme.dimMuted}>⇥ tab</Text>
              </Box>
            ) : null}
          </Box>
        </Box>
      )}

      {phase.name === 'generating' && (
        <Box flexDirection="column" width={width}>
          <Text>
            <Spinner />
            <Text color={theme.text}> Building your checklist…</Text>
          </Text>
          <Box marginTop={1}>
            <Shimmer text={`“${phase.goal}”`} />
          </Box>
        </Box>
      )}

      {phase.name === 'genError' && (
        <Box flexDirection="column" width={width}>
          <Box
            flexDirection="column"
            width={width}
            borderStyle="round"
            borderColor={theme.accent}
            borderDimColor={theme.dimMuted}
            paddingX={2}
            paddingY={1}
          >
            <Text bold color={theme.text} wrap="wrap">{GEN_ERROR.title}</Text>
            <Text color={theme.muted} dimColor={theme.dimMuted} wrap="wrap">{GEN_ERROR.body}</Text>
          </Box>
          <Box marginTop={1}>
            <Box borderStyle="round" borderColor={theme.accent} paddingX={2}>
              <Text bold color={theme.accent}>{RETRY_LABEL}</Text>
            </Box>
          </Box>
        </Box>
      )}

      {(phase.name === 'detail' || phase.name === 'addTask' || phase.name === 'editTask') &&
        openChecklist &&
        (() => {
          const {done, total} = progress(openChecklist)
          const allDone = total > 0 && done === total && taskFilter === 'all'
          const taskRows = visibleRows(openChecklist) // filtered by '/' (all/done/to-do)
          const showGroupHeaders = openChecklist.groups.length > 1

          // Build a flat list of display lines (phase headers, wrapped task
          // lines, spacers, and the add-task input) so a viewport can scroll
          // over them — the alt-screen terminal can't scroll itself. Each line
          // remembers which task it belongs to so scrolling can follow the cursor.
          type DLine = {taskIndex: number; node: React.ReactNode}
          const dlines: DLine[] = []
          const focusTask = Math.min(taskCursor, taskRows.length - 1) // where 'a' inserts
          const inputNode = (
            <Box>
              <Box width={2} flexShrink={0}><Text> </Text></Box>
              <Text color={theme.accent}>+ </Text>
              <Box flexGrow={1} flexShrink={1} minWidth={0}>
                <TextField value={draft} onChange={setDraft} onSubmit={submitTask} placeholder="add a task…" />
              </Box>
            </Box>
          )
          taskRows.forEach((r, i) => {
            const selected = phase.name === 'detail' && i === taskCursor
            // First VISIBLE task of its group (recomputed so headers stay correct
            // when '/' search hides some tasks).
            const firstOfGroup = i === 0 || taskRows[i - 1]!.groupTitle !== r.groupTitle
            if (firstOfGroup && showGroupHeaders) {
              if (dlines.length) dlines.push({taskIndex: -1, node: <Text> </Text>})
              dlines.push({
                taskIndex: -1,
                node: <Text bold color={theme.muted} dimColor={theme.dimMuted}>{r.groupTitle}</Text>,
              })
            }
            const editing = phase.name === 'editTask' && r.task.id === phase.taskId
            if (editing) {
              // Replace this task's lines with an inline editor prefilled with its text.
              dlines.push({
                taskIndex: i,
                node: (
                  <Box>
                    <Box width={2} flexShrink={0}><Text color={theme.accent}>❯ </Text></Box>
                    <Box flexGrow={1} flexShrink={1} minWidth={0}>
                      <TextField value={draft} onChange={setDraft} onSubmit={submitEdit} />
                    </Box>
                  </Box>
                ),
              })
              return
            }
            wrapText(r.task.text, taskTextWidth).forEach((line, li) => {
              // One Text per line so Ink measures the whole row (glyphs included)
              // and never sub-wraps it. Marker + checkbox = a 4-cell prefix;
              // continuation lines indent by the same 4 cells.
              dlines.push({
                taskIndex: i,
                node: (
                  <Text>
                    <Text color={theme.accent}>{li === 0 && selected ? '❯ ' : '  '}</Text>
                    <Text color={r.task.done ? theme.accent : theme.muted} dimColor={!r.task.done && theme.dimMuted}>
                      {li === 0 ? (r.task.done ? '✓ ' : '◻ ') : '  '}
                    </Text>
                    <Text color={r.task.done ? theme.muted : theme.text} dimColor={r.task.done && theme.dimMuted}>
                      {line}
                    </Text>
                  </Text>
                ),
              })
            })
            // The add-task input appears right below the task you're on.
            if (phase.name === 'addTask' && i === focusTask) {
              dlines.push({taskIndex: -2, node: inputNode})
            }
          })
          if (phase.name === 'addTask' && taskRows.length === 0) {
            dlines.push({taskIndex: -2, node: inputNode})
          }

          const isEmpty = taskRows.length === 0 && phase.name !== 'addTask'
          // Interior height available for the panel; reserve 2 lines for the
          // ↑/↓ indicators when scrolling so the panel height stays constant.
          const viewportH = Math.max(4, rows - 11)
          const totalLines = dlines.length
          const scrolls = totalLines > viewportH
          const contentH = scrolls ? viewportH - 2 : totalLines

          let offset = scrollTop.current
          if (scrolls) {
            // Follow the cursor's task, or the input line while adding.
            const focusIndex = phase.name === 'addTask' ? -2 : taskCursor
            const firstSel = dlines.findIndex(d => d.taskIndex === focusIndex)
            if (firstSel >= 0) {
              let lastSel = firstSel
              while (lastSel + 1 < totalLines && dlines[lastSel + 1]!.taskIndex === focusIndex) lastSel++
              if (firstSel < offset) offset = firstSel
              else if (lastSel > offset + contentH - 1) offset = lastSel - contentH + 1
            }
            offset = Math.max(0, Math.min(offset, totalLines - contentH))
          } else {
            offset = 0
          }
          scrollTop.current = offset

          const visible = dlines.slice(offset, offset + contentH)
          const hasAbove = scrolls && offset > 0
          const hasBelow = scrolls && offset + contentH < totalLines
          // Keep phase context when scrolled: the "↑ more" line names the phase
          // the first visible task belongs to (its header may be scrolled off).
          const firstVisibleTask = visible.find(d => d.taskIndex >= 0)
          const topPhase =
            showGroupHeaders && firstVisibleTask ? taskRows[firstVisibleTask.taskIndex]?.groupTitle : undefined

          return (
            <Box flexDirection="column" width={width}>
              <Box width={width}>
                <Box flexGrow={1} flexShrink={1} minWidth={0} marginRight={1}>
                  <Text bold color={theme.text} wrap="truncate-end">{openChecklist.title}</Text>
                </Box>
                <Box flexShrink={0}>
                  {showBar ? <ProgressBar done={done} total={total} /> : null}
                  <Text color={theme.muted} dimColor={theme.dimMuted}>{` ${done}/${total}`}</Text>
                </Box>
              </Box>

              {taskFilter !== 'all' ? (
                <Box marginTop={1}>
                  <Text backgroundColor={theme.barBg} color={theme.muted} dimColor={theme.dimMuted}>
                    {taskFilter === 'done' ? ' showing done ' : ' showing to-do '}
                  </Text>
                  <Text color={theme.muted} dimColor={theme.dimMuted}>  / cycles · esc clears</Text>
                </Box>
              ) : null}

              {allDone ? (
                <Box marginTop={1}>
                  {celebrating ? (
                    <Shimmer text="✓  All done — nice work!" />
                  ) : (
                    <Text bold color={theme.accent}>✓  All done!</Text>
                  )}
                </Box>
              ) : null}
              <Gap />

              <Box
                flexDirection="column"
                width={width}
                borderStyle="round"
                borderColor={theme.muted}
                borderDimColor={theme.dimMuted}
                paddingX={1}
              >
                {isEmpty ? (
                  taskFilter !== 'all' ? (
                    <Text color={theme.muted} dimColor={theme.dimMuted}>Nothing {taskFilter === 'done' ? 'completed' : 'left to do'} here.</Text>
                  ) : (
                    <Text color={theme.muted} dimColor={theme.dimMuted}>
                      No tasks yet. Press <Text color={theme.accent} bold>a</Text> to add one.
                    </Text>
                  )
                ) : (
                  <>
                    {scrolls ? (
                      <Text color={theme.muted} dimColor={theme.dimMuted}>
                        {hasAbove ? `  ↑  ${topPhase ?? 'more above'}` : ' '}
                      </Text>
                    ) : null}
                    {visible.map((d, idx) => (
                      <Box key={offset + idx}>{d.node}</Box>
                    ))}
                    {scrolls ? (
                      <Text color={theme.muted} dimColor={theme.dimMuted}>{hasBelow ? '  ↓ more below' : ' '}</Text>
                    ) : null}
                  </>
                )}
              </Box>
            </Box>
          )
        })()}

      {phase.name === 'confirmDelete' &&
        (() => {
          const target = checklists.find(c => c.id === phase.id)
          return (
            <Box flexDirection="column">
              <Text color={theme.text}>Delete “{truncate(target?.title ?? '', 40)}”?</Text>
              <Text color={theme.muted} dimColor={theme.dimMuted}>This can’t be undone.</Text>
            </Box>
          )
        })()}

      <Gap />
      <Shortcuts items={footerHints} />
    </Screen>
  )
}
