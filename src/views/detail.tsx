import React from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme'
import {Gap} from '../components/screen'
import {ProgressBar} from '../components/progress-bar'
import {Shimmer} from '../components/shimmer'
import {TextField} from '../components/text-field'
import {progress, flatten, type Checklist} from '../store'
import {wrapText} from '../lib/text'

export type TaskFilter = 'all' | 'done' | 'todo'

type Props = {
  checklist: Checklist
  mode: 'detail' | 'addTask' | 'editTask'
  editTaskId?: string
  taskCursor: number
  taskFilter: TaskFilter
  celebrating: boolean
  draft: string
  onDraft: (value: string) => void
  onSubmitTask: (value: string) => void
  onSubmitEdit: (value: string) => void
  width: number
  rows: number
  showBar: boolean
  scrollTop: React.MutableRefObject<number>
}

/**
 * The open-checklist view: header + a scrolling task panel. The panel can't rely
 * on the terminal to scroll (alt-screen), so it builds a flat list of "display
 * lines" (phase headers, wrapped task lines, the add/edit input) and renders a
 * viewport window over them that follows the cursor.
 */
export function DetailView(props: Props) {
  const {checklist, mode, editTaskId, taskCursor, taskFilter, celebrating, draft, width, rows, showBar, scrollTop} = props
  const theme = useTheme()

  const {done, total} = progress(checklist)
  const allDone = total > 0 && done === total && taskFilter === 'all'
  const all = flatten(checklist)
  const taskRows = taskFilter === 'done' ? all.filter(r => r.task.done) : taskFilter === 'todo' ? all.filter(r => !r.task.done) : all
  const showGroupHeaders = checklist.groups.length > 1
  const taskTextWidth = Math.max(4, width - 10)

  type DLine = {taskIndex: number; node: React.ReactNode}
  const dlines: DLine[] = []
  const focusTask = Math.min(taskCursor, taskRows.length - 1) // where 'a' inserts
  const inputNode = (
    <Box>
      <Box width={2} flexShrink={0}><Text> </Text></Box>
      <Text color={theme.accent}>+ </Text>
      <Box flexGrow={1} flexShrink={1} minWidth={0}>
        <TextField value={draft} onChange={props.onDraft} onSubmit={props.onSubmitTask} placeholder="add a task…" />
      </Box>
    </Box>
  )

  taskRows.forEach((r, i) => {
    const selected = mode === 'detail' && i === taskCursor
    // First VISIBLE task of its group (recomputed so headers stay correct when '/' hides tasks).
    const firstOfGroup = i === 0 || taskRows[i - 1]!.groupTitle !== r.groupTitle
    if (firstOfGroup && showGroupHeaders) {
      if (dlines.length) dlines.push({taskIndex: -1, node: <Text> </Text>})
      dlines.push({taskIndex: -1, node: <Text bold color={theme.muted} dimColor={theme.dimMuted}>{r.groupTitle}</Text>})
    }
    if (mode === 'editTask' && r.task.id === editTaskId) {
      dlines.push({
        taskIndex: i,
        node: (
          <Box>
            <Box width={2} flexShrink={0}><Text color={theme.accent}>❯ </Text></Box>
            <Box flexGrow={1} flexShrink={1} minWidth={0}>
              <TextField value={draft} onChange={props.onDraft} onSubmit={props.onSubmitEdit} />
            </Box>
          </Box>
        ),
      })
      return
    }
    wrapText(r.task.text, taskTextWidth).forEach((line, li) => {
      // One Text per line so Ink measures the whole row (glyphs included) and
      // never sub-wraps it. Marker + checkbox = a 4-cell prefix; continuation
      // lines indent by the same 4 cells.
      dlines.push({
        taskIndex: i,
        node: (
          <Text>
            <Text color={theme.accent}>{li === 0 && selected ? '❯ ' : '  '}</Text>
            <Text color={r.task.done ? theme.accent : theme.muted} dimColor={!r.task.done && theme.dimMuted}>
              {li === 0 ? (r.task.done ? '✓ ' : '◻ ') : '  '}
            </Text>
            <Text color={r.task.done ? theme.muted : theme.text} dimColor={r.task.done && theme.dimMuted}>{line}</Text>
          </Text>
        ),
      })
    })
    if (mode === 'addTask' && i === focusTask) dlines.push({taskIndex: -2, node: inputNode})
  })
  if (mode === 'addTask' && taskRows.length === 0) dlines.push({taskIndex: -2, node: inputNode})

  const isEmpty = taskRows.length === 0 && mode !== 'addTask'
  // Interior height; reserve 2 lines for the ↑/↓ indicators when scrolling so the panel height stays constant.
  const viewportH = Math.max(4, rows - 11)
  const totalLines = dlines.length
  const scrolls = totalLines > viewportH
  const contentH = scrolls ? viewportH - 2 : totalLines

  let offset = scrollTop.current
  if (scrolls) {
    const focusIndex = mode === 'addTask' ? -2 : taskCursor // follow cursor, or the input while adding
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
  // Keep phase context when scrolled: name the phase the first visible task belongs to.
  const firstVisibleTask = visible.find(d => d.taskIndex >= 0)
  const topPhase = showGroupHeaders && firstVisibleTask ? taskRows[firstVisibleTask.taskIndex]?.groupTitle : undefined

  return (
    <Box flexDirection="column" width={width}>
      <Box width={width}>
        <Box flexGrow={1} flexShrink={1} minWidth={0} marginRight={1}>
          <Text bold color={theme.text} wrap="truncate-end">{checklist.title}</Text>
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
          {celebrating ? <Shimmer text="✓  All done — nice work!" /> : <Text bold color={theme.accent}>✓  All done!</Text>}
        </Box>
      ) : null}
      <Gap />

      <Box flexDirection="column" width={width} borderStyle="round" borderColor={theme.muted} borderDimColor={theme.dimMuted} paddingX={1}>
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
              <Text color={theme.muted} dimColor={theme.dimMuted}>{hasAbove ? `  ↑  ${topPhase ?? 'more above'}` : ' '}</Text>
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
}
