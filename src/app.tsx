import React, {useEffect, useState} from 'react'
import {Box, Text, useApp, useInput} from 'ink'
import TextInput from 'ink-text-input'
import {ProgressBar} from './components/progress-bar'
import {Shortcuts} from './components/shortcuts'
import {Welcome} from './components/welcome'
import {Screen, Gap, useColumns, contentWidth} from './components/screen'
import {clickTargetAt, type ClickTarget} from './lib/click-map'
import {useMouseClick, stripMouseReports} from './lib/use-mouse-click'
import {ThemeProvider, useTheme, nextThemeMode, type ThemeMode} from './theme'
import {
  loadChecklists,
  saveChecklists,
  newChecklist,
  newGroup,
  newTask,
  progress,
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

// Each phase declares its own keyboard hints — the row shown at the bottom.
const HINTS: Record<Phase['name'], Array<[string, string]>> = {
  list: [['↑↓', 'move'], ['↵', 'open'], ['n', 'new'], ['d', 'delete'], ['^t', 'theme'], ['^c', 'quit']],
  new: [['↵', 'create'], ['esc', 'cancel']],
  detail: [['↑↓', 'move'], ['space', 'toggle'], ['a', 'add task'], ['esc', 'back'], ['^c', 'quit']],
  addTask: [['↵', 'add'], ['esc', 'done']],
  confirmDelete: [['y', 'delete'], ['n', 'keep']],
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

// Flatten a checklist's groups into one navigable list of rows, remembering
// where each group starts so we can print its header once.
function flatten(checklist: Checklist) {
  const rows: Array<{groupTitle: string; firstOfGroup: boolean; task: Checklist['groups'][number]['tasks'][number]}> = []
  for (const group of checklist.groups) {
    group.tasks.forEach((task, i) => rows.push({groupTitle: group.title, firstOfGroup: i === 0, task}))
  }
  return rows
}

export function App() {
  // Default to `dark` so the launch background tint is coherent; `^t` cycles to
  // light or `auto` (auto leaves your terminal's own colours untouched).
  const [mode, setMode] = useState<ThemeMode>('dark')
  return (
    <ThemeProvider mode={mode}>
      <AppInner cycleTheme={() => setMode(nextThemeMode)} />
    </ThemeProvider>
  )
}

function AppInner({cycleTheme}: {cycleTheme: () => void}) {
  const theme = useTheme()
  const {exit} = useApp()
  const width = contentWidth(useColumns()) // content area, re-measured on resize
  const showBar = width >= 44 // hide the progress bar when there's no room for it
  // Exact widths of the truncated text, so the CLICK match string equals what's
  // actually on screen (otherwise hit-testing can't find it). Fixed chrome:
  // card = border(2)+padX(2)+marker(2)+gap(1)+count(6)+bar(10 when shown).
  const cardTitleWidth = Math.max(4, width - (showBar ? 23 : 13))
  const taskTextWidth = Math.max(4, width - 8) // border(2)+padX(2)+marker(2)+box(2)
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [phase, setPhase] = useState<Phase>({name: 'list'})
  const [listCursor, setListCursor] = useState(0)
  const [taskCursor, setTaskCursor] = useState(0)
  const [draft, setDraft] = useState('') // shared value for the text inputs

  // Load once on startup.
  useEffect(() => {
    void loadChecklists().then(setChecklists)
  }, [])

  // Every change writes straight to disk — no explicit "save" for the user.
  const persist = (next: Checklist[]) => {
    setChecklists(next)
    void saveChecklists(next)
  }
  const updateChecklist = (id: string, fn: (c: Checklist) => Checklist) =>
    persist(checklists.map(c => (c.id === id ? fn(c) : c)))

  const openChecklist =
    phase.name === 'detail' || phase.name === 'addTask' ? checklists.find(c => c.id === phase.id) : undefined

  // --- Actions --------------------------------------------------------------
  const submitNew = (value: string) => {
    const title = value.trim()
    if (!title) return
    const created = newChecklist(title)
    persist([created, ...checklists])
    setDraft('')
    setListCursor(0)
    setTaskCursor(0)
    setPhase({name: 'detail', id: created.id}) // open it so you can add tasks right away
  }

  const submitTask = (value: string) => {
    const text = value.trim()
    if (phase.name !== 'addTask') return
    if (!text) return
    updateChecklist(phase.id, c => {
      const groups = c.groups.length ? c.groups : [newGroup('Tasks')]
      const [first, ...rest] = groups
      return {...c, groups: [{...first!, tasks: [...first!.tasks, newTask(text)]}, ...rest]}
    })
    setDraft('') // stay in addTask with a fresh field so you can add several in a row
  }

  const toggleTask = (id: string, taskId: string) =>
    updateChecklist(id, c => ({
      ...c,
      groups: c.groups.map(g => ({
        ...g,
        tasks: g.tasks.map(t => (t.id === taskId ? {...t, done: !t.done} : t)),
      })),
    }))

  // --- Keyboard -------------------------------------------------------------
  useInput((input, key) => {
    // Global — works in every phase.
    if (key.ctrl && input === 'c') return exit()
    if (key.ctrl && input === 't') return cycleTheme()

    // Text-entry phases: let TextInput handle typing; we only catch esc.
    if (phase.name === 'new' || phase.name === 'addTask') {
      if (key.escape) {
        setDraft('')
        setPhase(phase.name === 'addTask' ? {name: 'detail', id: phase.id} : {name: 'list'})
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

    if (phase.name === 'list') {
      if (key.upArrow) setListCursor(c => Math.max(0, c - 1))
      if (key.downArrow) setListCursor(c => Math.min(checklists.length - 1, c + 1))
      const current = checklists[listCursor]
      if (key.return && current) {
        setTaskCursor(0)
        setPhase({name: 'detail', id: current.id})
      }
      if (input === 'n') {
        setDraft('')
        setPhase({name: 'new'})
      }
      if (input === 'd' && current) setPhase({name: 'confirmDelete', id: current.id})
      return
    }

    if (phase.name === 'detail' && openChecklist) {
      const rows = flatten(openChecklist)
      if (key.upArrow) setTaskCursor(c => Math.max(0, c - 1))
      if (key.downArrow) setTaskCursor(c => Math.min(Math.max(0, rows.length - 1), c + 1))
      if (input === ' ') {
        const row = rows[taskCursor]
        if (row) toggleTask(openChecklist.id, row.task.id)
      }
      if (input === 'a') {
        setDraft('')
        setPhase({name: 'addTask', id: openChecklist.id})
      }
      if (key.escape) setPhase({name: 'list'})
      return
    }
  }, {isActive: Boolean(process.stdin.isTTY)}) // no raw-mode crash when piped / non-TTY

  // --- Mouse ----------------------------------------------------------------
  // Anything a mouse user would expect to press is clickable. Targets are found
  // by their visible text in the last rendered frame (see lib/click-map.ts), so
  // there is no layout math to keep in sync. The action for a footer hint is
  // whatever pressing that key would do in the current phase.
  const hintAction = (keyName: string): (() => void) | undefined => {
    if (keyName === '^c') return () => exit()
    if (keyName === '^t') return cycleTheme
    switch (phase.name) {
      case 'list': {
        const current = checklists[listCursor]
        if (keyName === '↵' && current) return () => {
          setTaskCursor(0)
          setPhase({name: 'detail', id: current.id})
        }
        if (keyName === 'n') return () => {
          setDraft('')
          setPhase({name: 'new'})
        }
        if (keyName === 'd' && current) return () => setPhase({name: 'confirmDelete', id: current.id})
        break
      }
      case 'detail': {
        if (!openChecklist) break
        if (keyName === 'space') {
          const row = flatten(openChecklist)[taskCursor]
          if (row) return () => toggleTask(openChecklist.id, row.task.id)
        }
        if (keyName === 'a') return () => {
          setDraft('')
          setPhase({name: 'addTask', id: openChecklist.id})
        }
        if (keyName === 'esc') return () => setPhase({name: 'list'})
        break
      }
      case 'new':
        if (keyName === '↵') return () => submitNew(draft)
        if (keyName === 'esc') return () => {
          setDraft('')
          setPhase({name: 'list'})
        }
        break
      case 'addTask':
        if (keyName === '↵') return () => submitTask(draft)
        if (keyName === 'esc') return () => {
          setDraft('')
          setPhase({name: 'detail', id: phase.id})
        }
        break
      case 'confirmDelete':
        if (keyName === 'y') return () => {
          const next = checklists.filter(c => c.id !== phase.id)
          persist(next)
          setListCursor(c => Math.max(0, Math.min(c, next.length - 1)))
          setPhase({name: 'list'})
        }
        if (keyName === 'n') return () => setPhase({name: 'list'})
        break
    }
    return undefined
  }

  // Match strings must equal the truncated text actually rendered. Footer hints
  // go FIRST so a click on the hint bar always resolves to the hint — never to a
  // card/task whose text happens to appear on that same row. padX stays small so
  // a target only matches on its own text (a wide padX let one row's target
  // swallow clicks meant for another). padY covers a card's border rows.
  const clickTargets: ClickTarget[] = []
  for (const [keyName, label] of HINTS[phase.name]) {
    const action = hintAction(keyName)
    if (action) clickTargets.push({match: `${keyName} ${label}`, action})
  }
  if (phase.name === 'list') {
    checklists.forEach((c, i) =>
      clickTargets.push({
        match: truncate(c.title, cardTitleWidth),
        padY: 1,
        action: () => {
          setListCursor(i)
          setTaskCursor(0)
          setPhase({name: 'detail', id: c.id})
        },
      }),
    )
  }
  if ((phase.name === 'detail' || phase.name === 'addTask') && openChecklist) {
    for (const row of flatten(openChecklist)) {
      clickTargets.push({
        match: truncate(row.task.text, taskTextWidth),
        action: () => toggleTask(openChecklist.id, row.task.id),
      })
    }
  }

  useMouseClick((x, y) => clickTargetAt(x, y, clickTargets)?.action(), Boolean(process.stdin.isTTY))

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

  return (
    <Screen>
      {phase.name === 'list' && <Welcome count={checklists.length} width={width} />}
      {(phase.name === 'new' || phase.name === 'confirmDelete') && (
        <Text bold color={theme.accent}>✓ checklists</Text>
      )}

      <Gap />

      {phase.name === 'list' &&
        (checklists.length === 0 ? (
          <Box flexDirection="column">
            <Text color={theme.muted} dimColor={theme.dimMuted}>No checklists yet.</Text>
            <Text color={theme.muted} dimColor={theme.dimMuted}>
              Press <Text color={theme.accent} bold>n</Text> to create your first one.
            </Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {checklists.map((c, i) => {
              const {done, total} = progress(c)
              const selected = i === listCursor
              // Each checklist is its own card. The selected one lifts with an
              // accent border; the rest sit back with a dim muted border.
              return (
                <Box
                  key={c.id}
                  width={width}
                  borderStyle="round"
                  borderColor={selected ? theme.accent : theme.muted}
                  borderDimColor={!selected && theme.dimMuted}
                  paddingX={1}
                >
                  <Box width={2} flexShrink={0}>
                    <Text color={theme.accent}>{selected ? '❯' : ' '}</Text>
                  </Box>
                  {/* flexShrink + minWidth=0 so the title truncates instead of
                      wrapping (which would break the card's single-row layout). */}
                  <Box flexGrow={1} flexShrink={1} minWidth={0} marginRight={1}>
                    <Text bold={selected} color={theme.text} wrap="truncate-end">{truncate(c.title, cardTitleWidth)}</Text>
                  </Box>
                  {showBar ? <ProgressBar done={done} total={total} /> : null}
                  <Box width={6} flexShrink={0} justifyContent="flex-end">
                    <Text color={theme.muted} dimColor={theme.dimMuted}>{`${done}/${total}`}</Text>
                  </Box>
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
            <TextInput
              value={draft}
              onChange={v => setDraft(stripMouseReports(v))}
              onSubmit={submitNew}
              placeholder="e.g. Plan a weekend trip"
            />
          </Box>
        </Box>
      )}

      {(phase.name === 'detail' || phase.name === 'addTask') &&
        openChecklist &&
        (() => {
          const {done, total} = progress(openChecklist)
          const rows = flatten(openChecklist)
          const showGroupHeaders = openChecklist.groups.length > 1
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
              <Gap />

              <Box
                flexDirection="column"
                width={width}
                borderStyle="round"
                borderColor={theme.muted}
                borderDimColor={theme.dimMuted}
                paddingX={1}
              >
              {rows.length === 0 && phase.name !== 'addTask' ? (
                <Text color={theme.muted} dimColor={theme.dimMuted}>
                  No tasks yet. Press <Text color={theme.accent} bold>a</Text> to add one.
                </Text>
              ) : (
                rows.map((r, i) => {
                  const selected = phase.name === 'detail' && i === taskCursor
                  return (
                    <Box flexDirection="column" key={r.task.id}>
                      {r.firstOfGroup && showGroupHeaders ? (
                        <Text color={theme.muted} dimColor={theme.dimMuted}>{r.groupTitle}</Text>
                      ) : null}
                      <Box>
                        <Box width={2} flexShrink={0}>
                          <Text color={theme.accent}>{selected ? '❯' : ' '}</Text>
                        </Box>
                        <Box flexShrink={0}>
                          <Text color={r.task.done ? theme.accent : theme.muted} dimColor={!r.task.done && theme.dimMuted}>
                            {r.task.done ? '✓ ' : '◻ '}
                          </Text>
                        </Box>
                        {/* truncate so a long task stays one row — keeps the layout
                            stable and mouse hit-testing accurate. */}
                        <Box flexGrow={1} flexShrink={1} minWidth={0}>
                          <Text color={theme.text} dimColor={r.task.done && theme.dimMuted} strikethrough={r.task.done} wrap="truncate-end">
                            {truncate(r.task.text, taskTextWidth)}
                          </Text>
                        </Box>
                      </Box>
                    </Box>
                  )
                })
              )}

              {phase.name === 'addTask' ? (
                <Box marginTop={rows.length ? 1 : 0}>
                  <Box width={2} flexShrink={0}>
                    <Text> </Text>
                  </Box>
                  <Text color={theme.accent}>+ </Text>
                  <Box flexGrow={1} flexShrink={1} minWidth={0}>
                    <TextInput
                      value={draft}
                      onChange={v => setDraft(stripMouseReports(v))}
                      onSubmit={submitTask}
                      placeholder="add a task…"
                    />
                  </Box>
                </Box>
              ) : null}
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
      <Shortcuts items={HINTS[phase.name]} />
    </Screen>
  )
}
