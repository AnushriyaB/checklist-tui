import React, {useEffect, useRef, useState} from 'react'
import {Box, Text, useApp, useInput} from 'ink'
import {TextField} from './components/text-field'
import {Shortcuts} from './components/shortcuts'
import {Spinner} from './components/spinner'
import {Shimmer} from './components/shimmer'
import {Welcome, Logo} from './components/welcome'
import {Screen, Gap, useColumns, useRows, contentWidth} from './components/screen'
import {HelpOverlay} from './views/help'
import {Dashboard} from './views/dashboard'
import {DetailView} from './views/detail'
import {generateChecklist, GenerationError, type GenErrorCode} from './lib/ai'
import {play, soundAvailable} from './lib/sound'
import {truncate} from './lib/text'
import {MAX_GOAL} from './lib/limits'
import {ThemeProvider, useTheme} from './theme'
import {
  loadChecklists,
  saveChecklists,
  newChecklist,
  newGroup,
  newTask,
  checklistFromAi,
  progress,
  flatten,
  locate,
  type Checklist,
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
  | {name: 'genError'; goal: string; code: GenErrorCode; detail?: string}
  | {name: 'editTask'; id: string; taskId: string}

// Each phase declares its own keyboard hints — the row shown at the bottom.
// (genError's hints are built dynamically — retry only makes sense for failures.)
// Footer shows only the primary actions per screen — everything else lives in
// the `?` help overlay, so the bar stays quiet (Claude-Code style).
const HINTS: Record<Phase['name'], Array<[string, string]>> = {
  list: [['↵', 'open'], ['g', 'generate'], ['?', 'help']],
  new: [['↵', 'create'], ['esc', 'cancel']],
  detail: [['space', 'toggle'], ['a', 'add'], ['esc', 'back'], ['?', 'help']],
  addTask: [['↵', 'add'], ['esc', 'done']],
  editTask: [['↵', 'save'], ['esc', 'cancel']],
  confirmDelete: [['y', 'delete'], ['n', 'keep']],
  prompt: [['↵', 'generate'], ['esc', 'back']],
  generating: [['esc', 'cancel']],
  genError: [['esc', 'back']],
}

const RETRY_LABEL = '↵  Try again'

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

export function App({initialGoal}: {initialGoal?: string}) {
  return (
    <ThemeProvider mode="dark">
      <AppInner initialGoal={initialGoal} />
    </ThemeProvider>
  )
}

function AppInner({initialGoal}: {initialGoal?: string}) {
  const theme = useTheme()
  const {exit} = useApp()
  const width = contentWidth(useColumns()) // content area, re-measured on resize
  const rows = useRows() // terminal height, for the scroll viewport
  const showBar = width >= 44 // hide the progress bar when there's no room for it
  const scrollTop = useRef(0) // first visible display-line of the task viewport
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [phase, setPhase] = useState<Phase>(initialGoal ? {name: 'generating', goal: initialGoal} : {name: 'list'})
  const [listCursor, setListCursor] = useState(0)
  const [taskCursor, setTaskCursor] = useState(0)
  const [draft, setDraft] = useState('') // shared value for the text inputs
  const [suggestionIndex, setSuggestionIndex] = useState(0) // which goal suggestion Tab fills
  const [celebrating, setCelebrating] = useState(false) // brief burst when a list hits 100%
  const [soundOn, setSoundOn] = useState(soundAvailable) // subtle afplay cues (m toggles)
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
    // Celebrate + chime the moment a checklist goes from incomplete to fully done.
    if (current) {
      const before = progress(current)
      const willComplete = before.total > 0 && before.done === before.total - 1
      // (the task we just toggled — only fire if it was the one unchecked task left)
      const target = current.groups.flatMap(g => g.tasks).find(t => t.id === taskId)
      const checkingOff = target && !target.done // done was false → true
      // Only the whole-list-done moment gets a sound — a per-task tick read as an error blip.
      if (willComplete && checkingOff) {
        setCelebrating(true)
        if (soundOn) play('complete')
      }
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
    if (goal.length > MAX_GOAL) {
      setDraft(goal)
      setPhase({name: 'prompt'})
      return
    }
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
        if (soundOn) play('generate') // quiet pop when the checklist lands
      } catch (error) {
        if (controller.signal.aborted) return // user cancelled — handled elsewhere
        const code = error instanceof GenerationError ? error.code : 'SERVICE'
        const detail = error instanceof GenerationError ? error.detail : String(error)
        setPhase({name: 'genError', goal, code, detail})
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

    // Help overlay: esc or ? closes it (so ? toggles open/close). The footer
    // only advertises esc, but ? still works so you can reopen it.
    if (showHelp) {
      if (key.escape || input === '?') setShowHelp(false)
      return
    }
    if (input === '?' && (phase.name === 'list' || phase.name === 'detail')) {
      setShowHelp(true)
      return
    }
    // Mute toggle (only outside text-entry, where 'm' is a character).
    if (input === 'm' && (phase.name === 'list' || phase.name === 'detail')) {
      setSoundOn(on => {
        if (!on) play('generate') // soft pop to confirm turning sound back on
        return !on
      })
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
        setListCursor(c => Math.max(0, Math.min(c, next.length)))
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
      const last = checklists.length > 0 ? checklists.length : 0 // extra row: + generate
      if (key.upArrow || input === 'k') setListCursor(c => Math.max(0, c - 1))
      if (key.downArrow || input === 'j') setListCursor(c => Math.min(last, c + 1))
      const onGenerate = checklists.length > 0 && listCursor === checklists.length
      const current = onGenerate ? undefined : checklists[listCursor]
      if (key.return) {
        if (onGenerate) {
          setDraft('')
          setPhase({name: 'prompt'})
        } else if (current) {
          setTaskFilter('all')
          setTaskCursor(0)
          setPhase({name: 'detail', id: current.id})
        }
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
  // `esc` + `^c quit` get routed to their own group on the right by <Shortcuts>.
  // Quit only shows on the home screen — inside pages just show `esc`.
  const onGenerateRow = phase.name === 'list' && checklists.length > 0 && listCursor === checklists.length
  const baseHints: Array<[string, string]> =
    phase.name === 'genError'
      ? [['↵', 'try again'], ...HINTS.genError]
      : onGenerateRow
        ? [['↵', 'generate'], ['?', 'help']]
        : HINTS[phase.name]
  const hints: Array<[string, string]> =
    phase.name === 'list' ? [...baseHints, ['^c', 'quit']] : baseHints

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

  if (showHelp) return <HelpOverlay />

  return (
    <Screen>
      {/* grows to fill (footer sits at the bottom); never shrinks — shrinking
          would squeeze rows until they overlap on a short terminal. */}
      <Box flexDirection="column" flexGrow={1} flexShrink={0} minWidth={0}>
      {phase.name === 'list' && <Welcome width={width} />}
      {(phase.name === 'new' ||
        phase.name === 'confirmDelete' ||
        phase.name === 'prompt' ||
        phase.name === 'generating' ||
        phase.name === 'genError') && <Logo />}

      <Gap />

      {phase.name === 'list' && (
        <Dashboard checklists={checklists} listCursor={listCursor} width={width} showBar={showBar} />
      )}

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
          <Text color={theme.muted} dimColor={theme.dimMuted}>You'll get a step-by-step checklist.</Text>
          <Gap />
          <Box>
            <Text color={theme.accent}>❯ </Text>
            <Box flexGrow={1} flexShrink={1} minWidth={0}>
              <TextField
                value={draft}
                onChange={setDraft}
                maxLength={MAX_GOAL}
                onSubmit={value => {
                  const goal = value.trim()
                  if (goal && goal.length <= MAX_GOAL) startGenerate(goal)
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
          <Box flexShrink={0}>
            <Text
              color={draft.length > MAX_GOAL ? (theme.danger ?? 'red') : theme.muted}
              dimColor={draft.length <= MAX_GOAL && theme.dimMuted}
            >
              {`${String(draft.length).padStart(String(MAX_GOAL).length)}/${MAX_GOAL}`}
            </Text>
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
            <Text bold color={theme.text} wrap="wrap">{`Your checklist “${truncate(phase.goal, 46)}” didn't generate`}</Text>
            <Text color={theme.muted} dimColor={theme.dimMuted} wrap="wrap">
              Something went wrong this time. Give it another try, or head back and add tasks yourself.
            </Text>
          </Box>
          <Box marginTop={1}>
            <Box borderStyle="round" borderColor={theme.accent} paddingX={2}>
              <Text bold color={theme.accent}>{RETRY_LABEL}</Text>
            </Box>
          </Box>
        </Box>
      )}

      {(phase.name === 'detail' || phase.name === 'addTask' || phase.name === 'editTask') && openChecklist && (
        <DetailView
          checklist={openChecklist}
          mode={phase.name}
          editTaskId={phase.name === 'editTask' ? phase.taskId : undefined}
          taskCursor={taskCursor}
          taskFilter={taskFilter}
          celebrating={celebrating}
          draft={draft}
          onDraft={setDraft}
          onSubmitTask={submitTask}
          onSubmitEdit={submitEdit}
          width={width}
          rows={rows}
          showBar={showBar}
          scrollTop={scrollTop}
        />
      )}

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

      </Box>
      <Shortcuts items={hints} />
    </Screen>
  )
}
