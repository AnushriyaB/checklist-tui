#!/usr/bin/env node

// src/cli.tsx
import React13 from "react";
import { render } from "ink";

// src/app.tsx
import React12, { useEffect as useEffect5, useRef as useRef2, useState as useState5 } from "react";
import { Box as Box7, Text as Text11, useApp, useInput as useInput2 } from "ink";

// src/components/text-field.tsx
import React2, { useEffect, useRef, useState } from "react";
import { Text, useInput } from "ink";

// src/theme.ts
import React, { createContext, useContext } from "react";
var themes = {
  auto: { mode: "auto", accent: void 0, text: void 0, muted: void 0, danger: void 0, dimMuted: true, barBg: void 0 },
  dark: { mode: "dark", accent: "#8aa2ff", text: "#f4f4f5", muted: "#a1a1aa", danger: "#f87171", dimMuted: false, barBg: "#242429" },
  light: { mode: "light", accent: "#3b5bdb", text: "#18181b", muted: "#52525b", danger: "#e03131", dimMuted: false, barBg: "#ededf0" }
};
var ThemeContext = createContext(themes.auto);
var useTheme = () => useContext(ThemeContext);
function ThemeProvider({ mode, children }) {
  return React.createElement(ThemeContext.Provider, { value: themes[mode] }, children);
}

// src/components/text-field.tsx
var isWord = (c) => !!c && /\w/.test(c);
function wordLeft(value, cursor) {
  let i = cursor;
  while (i > 0 && !isWord(value[i - 1])) i--;
  while (i > 0 && isWord(value[i - 1])) i--;
  return i;
}
function wordRight(value, cursor) {
  let i = cursor;
  while (i < value.length && !isWord(value[i])) i++;
  while (i < value.length && isWord(value[i])) i++;
  return i;
}
function TextField({ value, onChange, onSubmit, onTab, placeholder, focus = true, maxLength }) {
  const theme = useTheme();
  const [cursor, setCursor] = useState(value.length);
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setCursor(value.length);
    }
  }, [value]);
  const emit = (next, nextCursor) => {
    lastEmitted.current = next;
    onChange(next);
    setCursor(nextCursor);
  };
  useInput(
    (input, key) => {
      const c2 = Math.min(cursor, value.length);
      const byWord = key.meta || key.ctrl;
      if (key.leftArrow) return void setCursor(byWord ? wordLeft(value, c2) : Math.max(0, c2 - 1));
      if (key.rightArrow) return void setCursor(byWord ? wordRight(value, c2) : Math.min(value.length, c2 + 1));
      if (key.ctrl && input === "a") return void setCursor(0);
      if (key.ctrl && input === "e") return void setCursor(value.length);
      if (key.meta && input === "b") return void setCursor(wordLeft(value, c2));
      if (key.meta && input === "f") return void setCursor(wordRight(value, c2));
      if (key.return) {
        if (maxLength != null && value.length > maxLength) return;
        return void onSubmit?.(value);
      }
      if (key.tab) return void onTab?.();
      if (key.backspace || key.delete) {
        if (c2 > 0) emit(value.slice(0, c2 - 1) + value.slice(c2), c2 - 1);
        return;
      }
      if (input && !key.ctrl && !key.meta && !key.escape) {
        emit(value.slice(0, c2) + input + value.slice(c2), c2 + input.length);
      }
    },
    { isActive: focus }
  );
  if (value.length === 0 && placeholder) {
    return /* @__PURE__ */ React2.createElement(Text, null, /* @__PURE__ */ React2.createElement(Text, { inverse: true }, " "), /* @__PURE__ */ React2.createElement(Text, { color: theme.muted, dimColor: theme.dimMuted }, placeholder));
  }
  const c = Math.min(cursor, value.length);
  return /* @__PURE__ */ React2.createElement(Text, null, /* @__PURE__ */ React2.createElement(Text, { color: theme.text }, value.slice(0, c)), /* @__PURE__ */ React2.createElement(Text, { inverse: true }, value.slice(c, c + 1) || " "), /* @__PURE__ */ React2.createElement(Text, { color: theme.text }, value.slice(c + 1)));
}

// src/components/shortcuts.tsx
import React4 from "react";
import { Box as Box2, Text as Text3 } from "ink";

// src/components/screen.tsx
import React3, { useEffect as useEffect2, useState as useState2 } from "react";
import { Box, Text as Text2, useStdout } from "ink";
var MAX_WIDTH = 100;
var PAD_X = 2;
function useColumns() {
  const { stdout } = useStdout();
  const [cols, setCols] = useState2(stdout?.columns ?? 80);
  useEffect2(() => {
    if (!stdout) return;
    const onResize = () => setCols(stdout.columns ?? 80);
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return cols;
}
var contentWidth = (cols) => Math.min(cols, MAX_WIDTH) - PAD_X * 2;
function useRows() {
  const { stdout } = useStdout();
  const [rows, setRows] = useState2(stdout?.rows ?? 24);
  useEffect2(() => {
    if (!stdout) return;
    const onResize = () => setRows(stdout.rows ?? 24);
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return rows;
}
function Screen({ children, fill = true }) {
  const cols = useColumns();
  const rows = useRows();
  return /* @__PURE__ */ React3.createElement(
    Box,
    {
      flexDirection: "column",
      height: fill ? rows : void 0,
      paddingX: PAD_X,
      paddingY: 1,
      width: Math.min(cols, MAX_WIDTH)
    },
    children
  );
}
var Gap = () => /* @__PURE__ */ React3.createElement(Box, { flexShrink: 0 }, /* @__PURE__ */ React3.createElement(Text2, null, " "));

// src/components/shortcuts.tsx
function Group({ items }) {
  const theme = useTheme();
  if (items.length === 0) return null;
  return /* @__PURE__ */ React4.createElement(Text3, { wrap: "truncate-end" }, items.map(([key, label], i) => /* @__PURE__ */ React4.createElement(Text3, { key: `${key}-${label}` }, i > 0 ? /* @__PURE__ */ React4.createElement(Text3, { color: theme.muted }, " \xB7 ") : null, /* @__PURE__ */ React4.createElement(Text3, { color: theme.accent, bold: true }, key), /* @__PURE__ */ React4.createElement(Text3, { color: theme.muted, dimColor: theme.dimMuted }, ` ${label}`))));
}
function Shortcuts({ items }) {
  const theme = useTheme();
  const width = contentWidth(useColumns());
  const exits = items.filter(([k]) => k === "esc" || k === "^c");
  const rest = items.filter(([k]) => k !== "esc" && k !== "^c");
  return /* @__PURE__ */ React4.createElement(Box2, { flexDirection: "column", width }, /* @__PURE__ */ React4.createElement(Text3, { color: theme.muted, dimColor: theme.dimMuted }, "\u2500".repeat(width)), /* @__PURE__ */ React4.createElement(Box2, { justifyContent: "space-between" }, /* @__PURE__ */ React4.createElement(Group, { items: rest }), /* @__PURE__ */ React4.createElement(Group, { items: exits })));
}

// src/components/spinner.tsx
import React5, { useEffect as useEffect3, useState as useState3 } from "react";
import { Text as Text4 } from "ink";
var FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
var FRAME_MS = 80;
function Spinner() {
  const theme = useTheme();
  const [frame, setFrame] = useState3(0);
  useEffect3(() => {
    const timer = setTimeout(() => setFrame((n) => (n + 1) % FRAMES.length), FRAME_MS);
    return () => clearTimeout(timer);
  }, [frame]);
  return /* @__PURE__ */ React5.createElement(Text4, { color: theme.accent }, FRAMES[frame]);
}

// src/components/shimmer.tsx
import React6, { useEffect as useEffect4, useState as useState4 } from "react";
import { Text as Text5 } from "ink";
var STEP_MS = 55;
var TRAIL = 6;
function Shimmer({ text }) {
  const theme = useTheme();
  const [pos, setPos] = useState4(0);
  const span = text.length + TRAIL * 2;
  useEffect4(() => {
    const timer = setTimeout(() => setPos((p) => (p + 1) % span), STEP_MS);
    return () => clearTimeout(timer);
  }, [pos, span]);
  const head = pos - TRAIL;
  return /* @__PURE__ */ React6.createElement(Text5, null, [...text].map((ch, i) => {
    const distance = Math.abs(i - head);
    const near = distance <= TRAIL;
    return /* @__PURE__ */ React6.createElement(Text5, { key: i, bold: distance <= 1, color: near ? theme.text : theme.muted, dimColor: !near && theme.dimMuted }, ch);
  }));
}

// src/components/welcome.tsx
import React7 from "react";
import { Box as Box3, Text as Text6 } from "ink";
var TITLE = "Checklist";
var DESC = "A checklist app for your terminal.";
function Logo() {
  const theme = useTheme();
  return /* @__PURE__ */ React7.createElement(Text6, { wrap: "truncate-end" }, /* @__PURE__ */ React7.createElement(Text6, { color: theme.accent, bold: true }, "\u2713 "), /* @__PURE__ */ React7.createElement(Text6, { color: theme.text, bold: true }, TITLE));
}
function Welcome({ width }) {
  const theme = useTheme();
  return /* @__PURE__ */ React7.createElement(Box3, { flexDirection: "column", width }, /* @__PURE__ */ React7.createElement(Logo, null), /* @__PURE__ */ React7.createElement(Text6, { color: theme.muted, dimColor: theme.dimMuted, wrap: "wrap" }, DESC), /* @__PURE__ */ React7.createElement(Text6, { color: theme.muted, dimColor: theme.dimMuted }, "\u2500".repeat(width)));
}

// src/views/help.tsx
import React8 from "react";
import { Box as Box4, Text as Text7 } from "ink";
var HELP = [
  { heading: "Dashboard", keys: [["\u21B5", "open"], ["g", "generate"], ["n", "new"], ["d", "delete"]] },
  { heading: "In a checklist", keys: [["space", "toggle"], ["a", "add"], ["e", "edit"], ["x", "delete"], ["/", "filter"]] },
  { heading: "Anywhere", keys: [["?", "help"], ["esc", "back"], ["m", "sound"], ["^c", "quit"]] }
];
function HelpOverlay() {
  const theme = useTheme();
  const width = contentWidth(useColumns());
  return /* @__PURE__ */ React8.createElement(Screen, null, /* @__PURE__ */ React8.createElement(Box4, { flexDirection: "column", flexGrow: 1, flexShrink: 0 }, /* @__PURE__ */ React8.createElement(Text7, { bold: true, color: theme.accent }, "Checklist \u2014 shortcuts"), /* @__PURE__ */ React8.createElement(Gap, null), /* @__PURE__ */ React8.createElement(
    Box4,
    {
      flexDirection: "column",
      flexShrink: 0,
      width,
      borderStyle: "round",
      borderColor: theme.muted,
      borderDimColor: theme.dimMuted,
      paddingX: 2,
      paddingY: 1
    },
    HELP.map((section, si) => /* @__PURE__ */ React8.createElement(Box4, { key: section.heading, flexDirection: "column", flexShrink: 0, marginTop: si === 0 ? 0 : 1 }, /* @__PURE__ */ React8.createElement(Text7, { color: theme.muted, dimColor: theme.dimMuted }, section.heading), /* @__PURE__ */ React8.createElement(Box4, { flexWrap: "wrap", width: width - 6 }, section.keys.map(([key, label], i) => /* @__PURE__ */ React8.createElement(Text7, { key: key + label }, /* @__PURE__ */ React8.createElement(Text7, { color: theme.accent, bold: true }, key), /* @__PURE__ */ React8.createElement(Text7, { color: theme.text }, ` ${label}`), i < section.keys.length - 1 ? /* @__PURE__ */ React8.createElement(Text7, null, "    ") : null)))))
  )), /* @__PURE__ */ React8.createElement(Shortcuts, { items: [["esc", "close", false]] }));
}

// src/views/dashboard.tsx
import React9 from "react";
import { Box as Box5, Text as Text8 } from "ink";

// src/store.ts
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
var DATA_DIR = path.join(os.homedir(), ".config", "checklist");
var FILE = path.join(DATA_DIR, "data.json");
async function loadChecklists() {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.checklists) ? parsed.checklists : [];
  } catch {
    return [];
  }
}
async function saveChecklists(checklists) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify({ checklists }, null, 2), "utf8");
}
var newChecklist = (title) => ({
  id: randomUUID(),
  title,
  groups: [],
  createdAt: (/* @__PURE__ */ new Date()).toISOString()
});
var newGroup = (title) => ({ id: randomUUID(), title, tasks: [] });
var newTask = (text) => ({ id: randomUUID(), text, done: false });
function checklistFromAi(ai) {
  return {
    id: randomUUID(),
    title: ai.title,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    groups: ai.items.map((item) => ({
      id: randomUUID(),
      title: item.text,
      tasks: (item.subtasks ?? []).map((text) => ({ id: randomUUID(), text, done: false }))
    }))
  };
}
function progress(checklist) {
  const tasks = checklist.groups.flatMap((group) => group.tasks);
  return { done: tasks.filter((task) => task.done).length, total: tasks.length };
}
function flatten(checklist) {
  const rows = [];
  for (const group of checklist.groups) {
    group.tasks.forEach((task, i) => rows.push({ groupTitle: group.title, firstOfGroup: i === 0, task }));
  }
  return rows;
}
function locate(groups, globalIndex) {
  let count = 0;
  for (let g = 0; g < groups.length; g++) {
    if (globalIndex < count + groups[g].tasks.length) return { gi: g, ti: globalIndex - count };
    count += groups[g].tasks.length;
  }
  const gi = Math.max(0, groups.length - 1);
  return { gi, ti: groups[gi]?.tasks.length ?? 0 };
}

// src/lib/text.ts
var truncate = (s, n) => s.length > n ? `${s.slice(0, n - 1)}\u2026` : s;
function wrapText(text, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let w = word;
    while (w.length > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!line) line = w;
    else if (line.length + 1 + w.length <= width) line += ` ${w}`;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

// src/views/dashboard.tsx
function Dashboard({ checklists, listCursor, width, showBar }) {
  const theme = useTheme();
  if (checklists.length === 0) {
    return /* @__PURE__ */ React9.createElement(Box5, { flexDirection: "column" }, /* @__PURE__ */ React9.createElement(Text8, { color: theme.muted, dimColor: theme.dimMuted }, "No checklists yet."), /* @__PURE__ */ React9.createElement(Text8, { color: theme.muted, dimColor: theme.dimMuted }, "Press ", /* @__PURE__ */ React9.createElement(Text8, { color: theme.accent, bold: true }, "g"), " to generate one, or", " ", /* @__PURE__ */ React9.createElement(Text8, { color: theme.accent, bold: true }, "n"), " to add one yourself."));
  }
  const countW = Math.max(3, ...checklists.map((c) => {
    const { done, total } = progress(c);
    return `${done}/${total}`.length;
  }));
  const numW = String(checklists.length).length;
  const titleW = Math.max(4, width - 3 - (numW + 2) - (showBar ? 11 : 0) - countW);
  return /* @__PURE__ */ React9.createElement(Box5, { flexDirection: "column" }, checklists.map((c, i) => {
    const { done, total } = progress(c);
    const selected = i === listCursor;
    const countStr = `${done}/${total}`.padStart(countW);
    const barW = showBar ? 10 : 0;
    const title = truncate(c.title, titleW).padEnd(titleW);
    const filled = total > 0 ? Math.round(done / total * barW) : 0;
    const complete = total > 0 && done === total;
    const titleColor = selected ? theme.accent : theme.text;
    return /* @__PURE__ */ React9.createElement(Box5, { key: c.id, width, flexShrink: 0 }, /* @__PURE__ */ React9.createElement(Text8, null, /* @__PURE__ */ React9.createElement(Text8, { color: theme.accent, bold: true }, selected ? "\u276F " : "  "), /* @__PURE__ */ React9.createElement(Text8, { color: theme.muted, dimColor: theme.dimMuted }, `${i + 1}`.padStart(numW) + ". "), /* @__PURE__ */ React9.createElement(Text8, { color: titleColor, bold: selected }, title), /* @__PURE__ */ React9.createElement(Text8, null, " "), showBar ? complete ? /* @__PURE__ */ React9.createElement(Text8, null, /* @__PURE__ */ React9.createElement(Text8, { color: theme.accent, bold: true }, "Completed".padEnd(barW)), /* @__PURE__ */ React9.createElement(Text8, null, " ")) : /* @__PURE__ */ React9.createElement(Text8, null, /* @__PURE__ */ React9.createElement(Text8, { color: selected ? theme.accent : theme.text }, "\u2588".repeat(filled)), /* @__PURE__ */ React9.createElement(Text8, { color: theme.muted, dimColor: theme.dimMuted }, "\u2591".repeat(barW - filled)), /* @__PURE__ */ React9.createElement(Text8, null, " ")) : null, /* @__PURE__ */ React9.createElement(Text8, { color: complete || selected ? theme.accent : theme.muted, dimColor: !complete && !selected && theme.dimMuted }, countStr)));
  }));
}

// src/views/detail.tsx
import React11 from "react";
import { Box as Box6, Text as Text10 } from "ink";

// src/components/progress-bar.tsx
import React10 from "react";
import { Text as Text9 } from "ink";
function ProgressBar({ done, total, width = 10 }) {
  const theme = useTheme();
  const ratio = total > 0 ? done / total : 0;
  const filled = Math.round(ratio * width);
  const complete = total > 0 && done === total;
  return /* @__PURE__ */ React10.createElement(Text9, null, /* @__PURE__ */ React10.createElement(Text9, { color: complete ? theme.accent : theme.text }, "\u2588".repeat(filled)), /* @__PURE__ */ React10.createElement(Text9, { color: theme.muted, dimColor: theme.dimMuted }, "\u2591".repeat(width - filled)));
}

// src/views/detail.tsx
function DetailView(props) {
  const { checklist, mode, editTaskId, taskCursor, taskFilter, celebrating, draft, width, rows, showBar, scrollTop } = props;
  const theme = useTheme();
  const { done, total } = progress(checklist);
  const allDone = total > 0 && done === total && taskFilter === "all";
  const all = flatten(checklist);
  const taskRows = taskFilter === "done" ? all.filter((r) => r.task.done) : taskFilter === "todo" ? all.filter((r) => !r.task.done) : all;
  const showGroupHeaders = checklist.groups.length > 1;
  const taskTextWidth = Math.max(4, width - 10);
  const dlines = [];
  const focusTask = Math.min(taskCursor, taskRows.length - 1);
  const inputNode = /* @__PURE__ */ React11.createElement(Box6, null, /* @__PURE__ */ React11.createElement(Box6, { width: 2, flexShrink: 0 }, /* @__PURE__ */ React11.createElement(Text10, null, " ")), /* @__PURE__ */ React11.createElement(Text10, { color: theme.accent }, "+ "), /* @__PURE__ */ React11.createElement(Box6, { flexGrow: 1, flexShrink: 1, minWidth: 0 }, /* @__PURE__ */ React11.createElement(TextField, { value: draft, onChange: props.onDraft, onSubmit: props.onSubmitTask, placeholder: "add a task\u2026" })));
  taskRows.forEach((r, i) => {
    const selected = mode === "detail" && i === taskCursor;
    const firstOfGroup = i === 0 || taskRows[i - 1].groupTitle !== r.groupTitle;
    if (firstOfGroup && showGroupHeaders) {
      if (dlines.length) dlines.push({ taskIndex: -1, node: /* @__PURE__ */ React11.createElement(Text10, null, " ") });
      dlines.push({ taskIndex: -1, node: /* @__PURE__ */ React11.createElement(Text10, { bold: true, color: theme.muted, dimColor: theme.dimMuted }, r.groupTitle) });
    }
    if (mode === "editTask" && r.task.id === editTaskId) {
      dlines.push({
        taskIndex: i,
        node: /* @__PURE__ */ React11.createElement(Box6, null, /* @__PURE__ */ React11.createElement(Box6, { width: 2, flexShrink: 0 }, /* @__PURE__ */ React11.createElement(Text10, { color: theme.accent }, "\u276F ")), /* @__PURE__ */ React11.createElement(Box6, { flexGrow: 1, flexShrink: 1, minWidth: 0 }, /* @__PURE__ */ React11.createElement(TextField, { value: draft, onChange: props.onDraft, onSubmit: props.onSubmitEdit })))
      });
      return;
    }
    wrapText(r.task.text, taskTextWidth).forEach((line, li) => {
      dlines.push({
        taskIndex: i,
        node: /* @__PURE__ */ React11.createElement(Text10, null, /* @__PURE__ */ React11.createElement(Text10, { color: theme.accent }, li === 0 && selected ? "\u276F " : "  "), /* @__PURE__ */ React11.createElement(Text10, { color: r.task.done ? theme.accent : theme.muted, dimColor: !r.task.done && theme.dimMuted }, li === 0 ? r.task.done ? "\u2713 " : "\u25FB " : "  "), /* @__PURE__ */ React11.createElement(Text10, { color: r.task.done ? theme.muted : theme.text, dimColor: r.task.done && theme.dimMuted }, line))
      });
    });
    if (mode === "addTask" && i === focusTask) dlines.push({ taskIndex: -2, node: inputNode });
  });
  if (mode === "addTask" && taskRows.length === 0) dlines.push({ taskIndex: -2, node: inputNode });
  const isEmpty = taskRows.length === 0 && mode !== "addTask";
  const viewportH = Math.max(4, rows - 11);
  const totalLines = dlines.length;
  const scrolls = totalLines > viewportH;
  const contentH = scrolls ? viewportH - 2 : totalLines;
  let offset = scrollTop.current;
  if (scrolls) {
    const focusIndex = mode === "addTask" ? -2 : taskCursor;
    const firstSel = dlines.findIndex((d) => d.taskIndex === focusIndex);
    if (firstSel >= 0) {
      let lastSel = firstSel;
      while (lastSel + 1 < totalLines && dlines[lastSel + 1].taskIndex === focusIndex) lastSel++;
      if (firstSel < offset) offset = firstSel;
      else if (lastSel > offset + contentH - 1) offset = lastSel - contentH + 1;
    }
    offset = Math.max(0, Math.min(offset, totalLines - contentH));
  } else {
    offset = 0;
  }
  scrollTop.current = offset;
  const visible = dlines.slice(offset, offset + contentH);
  const hasAbove = scrolls && offset > 0;
  const hasBelow = scrolls && offset + contentH < totalLines;
  const firstVisibleTask = visible.find((d) => d.taskIndex >= 0);
  const topPhase = showGroupHeaders && firstVisibleTask ? taskRows[firstVisibleTask.taskIndex]?.groupTitle : void 0;
  return /* @__PURE__ */ React11.createElement(Box6, { flexDirection: "column", width }, /* @__PURE__ */ React11.createElement(Box6, { width }, /* @__PURE__ */ React11.createElement(Box6, { flexGrow: 1, flexShrink: 1, minWidth: 0, marginRight: 1 }, /* @__PURE__ */ React11.createElement(Text10, { bold: true, color: theme.text, wrap: "truncate-end" }, checklist.title)), /* @__PURE__ */ React11.createElement(Box6, { flexShrink: 0 }, showBar ? /* @__PURE__ */ React11.createElement(ProgressBar, { done, total }) : null, /* @__PURE__ */ React11.createElement(Text10, { color: theme.muted, dimColor: theme.dimMuted }, ` ${done}/${total}`))), taskFilter !== "all" ? /* @__PURE__ */ React11.createElement(Box6, { marginTop: 1 }, /* @__PURE__ */ React11.createElement(Text10, { backgroundColor: theme.barBg, color: theme.muted, dimColor: theme.dimMuted }, taskFilter === "done" ? " showing done " : " showing to-do "), /* @__PURE__ */ React11.createElement(Text10, { color: theme.muted, dimColor: theme.dimMuted }, "  / cycles \xB7 esc clears")) : null, allDone ? /* @__PURE__ */ React11.createElement(Box6, { marginTop: 1 }, celebrating ? /* @__PURE__ */ React11.createElement(Shimmer, { text: "\u2713  All done \u2014 nice work!" }) : /* @__PURE__ */ React11.createElement(Text10, { bold: true, color: theme.accent }, "\u2713  All done!")) : null, /* @__PURE__ */ React11.createElement(Gap, null), /* @__PURE__ */ React11.createElement(Box6, { flexDirection: "column", width, borderStyle: "round", borderColor: theme.muted, borderDimColor: theme.dimMuted, paddingX: 1 }, isEmpty ? taskFilter !== "all" ? /* @__PURE__ */ React11.createElement(Text10, { color: theme.muted, dimColor: theme.dimMuted }, "Nothing ", taskFilter === "done" ? "completed" : "left to do", " here.") : /* @__PURE__ */ React11.createElement(Text10, { color: theme.muted, dimColor: theme.dimMuted }, "No tasks yet. Press ", /* @__PURE__ */ React11.createElement(Text10, { color: theme.accent, bold: true }, "a"), " to add one.") : /* @__PURE__ */ React11.createElement(React11.Fragment, null, scrolls ? /* @__PURE__ */ React11.createElement(Text10, { color: theme.muted, dimColor: theme.dimMuted }, hasAbove ? `  \u2191  ${topPhase ?? "more above"}` : " ") : null, visible.map((d, idx) => /* @__PURE__ */ React11.createElement(Box6, { key: offset + idx }, d.node)), scrolls ? /* @__PURE__ */ React11.createElement(Text10, { color: theme.muted, dimColor: theme.dimMuted }, hasBelow ? "  \u2193 more below" : " ") : null)));
}

// src/lib/ai.ts
var GENERATE_URL = process.env.CHECKLIST_API_URL ?? "https://checklist-tui.vercel.app/api/generate";
var GenerationError = class extends Error {
  code;
  detail;
  constructor(code, message, detail) {
    super(message);
    this.code = code;
    this.detail = detail;
    this.name = "GenerationError";
  }
};
async function generateChecklist(goal, signal) {
  let response;
  try {
    response = await fetch(GENERATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
      signal
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new GenerationError("NETWORK", "Could not reach the service", "network request failed");
  }
  if (response.status === 429) {
    throw new GenerationError("RATE_LIMITED", "Too many requests", "rate limited");
  }
  if (!response.ok) {
    throw new GenerationError("SERVICE", "Service returned an error", `HTTP ${response.status}`);
  }
  const data = await response.json().catch(() => null);
  if (!data || typeof data.title !== "string" || !Array.isArray(data.items)) {
    throw new GenerationError("BAD_RESPONSE", "Unexpected shape", "missing title/items");
  }
  return data;
}

// src/lib/sound.ts
import { spawn } from "child_process";
var FILES = {
  complete: "/System/Library/Sounds/Glass.aiff",
  // chime when a whole list is done
  generate: "/System/Library/Sounds/Pop.aiff"
  // quiet pop when AI finishes
};
var soundAvailable = process.platform === "darwin";
function play(cue) {
  if (!soundAvailable) return;
  try {
    const child = spawn("afplay", ["-v", "0.35", FILES[cue]], { stdio: "ignore", detached: true });
    child.on("error", () => {
    });
    child.unref();
  } catch {
  }
}

// src/lib/limits.ts
var MAX_GOAL = 400;

// src/app.tsx
var HINTS = {
  list: [["\u21B5", "open"], ["g", "generate"], ["?", "help"]],
  new: [["\u21B5", "create"], ["esc", "cancel"]],
  detail: [["space", "toggle"], ["a", "add"], ["esc", "back"], ["?", "help"]],
  addTask: [["\u21B5", "add"], ["esc", "done"]],
  editTask: [["\u21B5", "save"], ["esc", "cancel"]],
  confirmDelete: [["y", "delete"], ["n", "keep"]],
  prompt: [["\u21B5", "generate"], ["esc", "back"]],
  generating: [["esc", "cancel"]],
  genError: [["esc", "back"]]
};
var RETRY_LABEL = "\u21B5  Try again";
var SUGGESTIONS = [
  "Plan a 3-day trip to Lisbon",
  "Run a usability test for the new onboarding flow",
  "Audit and clean up our design system components",
  "Ship a REST API with authentication and tests",
  "Migrate the web app from Webpack to Vite",
  "Write a PRD for a notifications feature",
  "Plan a product launch for Q3",
  "Turn this project into a portfolio case study"
];
function App({ initialGoal: initialGoal2 }) {
  return /* @__PURE__ */ React12.createElement(ThemeProvider, { mode: "dark" }, /* @__PURE__ */ React12.createElement(AppInner, { initialGoal: initialGoal2 }));
}
function AppInner({ initialGoal: initialGoal2 }) {
  const theme = useTheme();
  const { exit } = useApp();
  const width = contentWidth(useColumns());
  const rows = useRows();
  const showBar = width >= 44;
  const scrollTop = useRef2(0);
  const [checklists, setChecklists] = useState5([]);
  const [phase, setPhase] = useState5(initialGoal2 ? { name: "generating", goal: initialGoal2 } : { name: "list" });
  const [listCursor, setListCursor] = useState5(0);
  const [taskCursor, setTaskCursor] = useState5(0);
  const [draft, setDraft] = useState5("");
  const [suggestionIndex, setSuggestionIndex] = useState5(0);
  const [celebrating, setCelebrating] = useState5(false);
  const [soundOn, setSoundOn] = useState5(soundAvailable);
  const [taskFilter, setTaskFilter] = useState5("all");
  const [showHelp, setShowHelp] = useState5(false);
  const genAbort = useRef2(void 0);
  useEffect5(() => {
    void loadChecklists().then(setChecklists);
  }, []);
  useEffect5(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), 2200);
    return () => clearTimeout(timer);
  }, [celebrating]);
  const persist = (next) => {
    setChecklists(next);
    void saveChecklists(next);
  };
  const addChecklist = (created) => setChecklists((prev) => {
    const next = [created, ...prev];
    void saveChecklists(next);
    return next;
  });
  const updateChecklist = (id, fn) => persist(checklists.map((c) => c.id === id ? fn(c) : c));
  const openChecklist = phase.name === "detail" || phase.name === "addTask" || phase.name === "editTask" ? checklists.find((c) => c.id === phase.id) : void 0;
  const visibleRows = (cl) => {
    const all = flatten(cl);
    if (taskFilter === "done") return all.filter((r) => r.task.done);
    if (taskFilter === "todo") return all.filter((r) => !r.task.done);
    return all;
  };
  const submitNew = (value) => {
    const title = value.trim();
    if (!title) return;
    const created = newChecklist(title);
    addChecklist(created);
    setDraft("");
    setListCursor(0);
    setTaskCursor(0);
    setPhase({ name: "detail", id: created.id });
  };
  const submitTask = (value) => {
    const text = value.trim();
    if (phase.name !== "addTask") return;
    if (!text) return;
    const current = checklists.find((c) => c.id === phase.id);
    const hadTasks = !!current && current.groups.some((g) => g.tasks.length > 0);
    updateChecklist(phase.id, (c) => {
      const groups = c.groups.length ? c.groups : [newGroup("Tasks")];
      const { gi, ti } = locate(groups, taskCursor);
      const next = groups.map((g, idx) => {
        if (idx !== gi) return g;
        const tasks = [...g.tasks];
        tasks.splice(ti + 1, 0, newTask(text));
        return { ...g, tasks };
      });
      return { ...c, groups: next };
    });
    setDraft("");
    setTaskCursor((prev) => hadTasks ? prev + 1 : 0);
  };
  const toggleTask = (id, taskId) => {
    const current = checklists.find((c) => c.id === id);
    updateChecklist(id, (c) => ({
      ...c,
      groups: c.groups.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => t.id === taskId ? { ...t, done: !t.done } : t)
      }))
    }));
    if (current) {
      const before = progress(current);
      const willComplete = before.total > 0 && before.done === before.total - 1;
      const target = current.groups.flatMap((g) => g.tasks).find((t) => t.id === taskId);
      const checkingOff = target && !target.done;
      if (willComplete && checkingOff) {
        setCelebrating(true);
        if (soundOn) play("complete");
      }
    }
  };
  const submitEdit = (value) => {
    if (phase.name !== "editTask") return;
    const text = value.trim();
    if (text) {
      updateChecklist(phase.id, (c) => ({
        ...c,
        groups: c.groups.map((g) => ({ ...g, tasks: g.tasks.map((t) => t.id === phase.taskId ? { ...t, text } : t) }))
      }));
    }
    setDraft("");
    setPhase({ name: "detail", id: phase.id });
  };
  const deleteTask = (id, taskId) => {
    const current = checklists.find((c) => c.id === id);
    const newTotal = current ? current.groups.flatMap((g) => g.tasks).filter((t) => t.id !== taskId).length : 0;
    updateChecklist(id, (c) => ({
      ...c,
      // drop the task, and any phase left empty by it
      groups: c.groups.map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) })).filter((g) => g.tasks.length > 0)
    }));
    setTaskCursor((prev) => Math.max(0, Math.min(prev, newTotal - 1)));
  };
  const startGenerate = (goal) => {
    if (goal.length > MAX_GOAL) {
      setDraft(goal);
      setPhase({ name: "prompt" });
      return;
    }
    const controller = new AbortController();
    genAbort.current = controller;
    setPhase({ name: "generating", goal });
    void (async () => {
      try {
        const ai = await generateChecklist(goal, controller.signal);
        if (controller.signal.aborted) return;
        const created = checklistFromAi(ai);
        addChecklist(created);
        setDraft("");
        setListCursor(0);
        setTaskCursor(0);
        setPhase({ name: "detail", id: created.id });
        if (soundOn) play("generate");
      } catch (error) {
        if (controller.signal.aborted) return;
        const code = error instanceof GenerationError ? error.code : "SERVICE";
        const detail = error instanceof GenerationError ? error.detail : String(error);
        setPhase({ name: "genError", goal, code, detail });
      }
    })();
  };
  const cancelGenerate = () => {
    genAbort.current?.abort();
    setPhase({ name: "prompt" });
  };
  useEffect5(() => {
    if (initialGoal2) startGenerate(initialGoal2);
  }, []);
  useInput2((input, key) => {
    if (key.ctrl && input === "c") return exit();
    if (showHelp) {
      if (key.escape || input === "?") setShowHelp(false);
      return;
    }
    if (input === "?" && (phase.name === "list" || phase.name === "detail")) {
      setShowHelp(true);
      return;
    }
    if (input === "m" && (phase.name === "list" || phase.name === "detail")) {
      setSoundOn((on) => {
        if (!on) play("generate");
        return !on;
      });
      return;
    }
    if (phase.name === "new" || phase.name === "addTask") {
      if (key.escape) {
        setDraft("");
        setPhase(phase.name === "addTask" ? { name: "detail", id: phase.id } : { name: "list" });
      }
      return;
    }
    if (phase.name === "editTask") {
      if (key.escape) {
        setDraft("");
        setPhase({ name: "detail", id: phase.id });
      }
      return;
    }
    if (phase.name === "confirmDelete") {
      if (input === "y") {
        const next = checklists.filter((c) => c.id !== phase.id);
        persist(next);
        setListCursor((c) => Math.max(0, Math.min(c, next.length - 1)));
        setPhase({ name: "list" });
      } else if (input === "n" || key.escape) {
        setPhase({ name: "list" });
      }
      return;
    }
    if (phase.name === "prompt") {
      if (key.tab && !draft) {
        setDraft(SUGGESTIONS[suggestionIndex]);
        setSuggestionIndex((i) => (i + 1) % SUGGESTIONS.length);
      } else if (key.escape) {
        setDraft("");
        setPhase({ name: "list" });
      }
      return;
    }
    if (phase.name === "generating") {
      if (key.escape) cancelGenerate();
      return;
    }
    if (phase.name === "genError") {
      if (key.return) startGenerate(phase.goal);
      else if (key.escape) setPhase({ name: "list" });
      return;
    }
    if (phase.name === "list") {
      if (key.upArrow || input === "k") setListCursor((c) => Math.max(0, c - 1));
      if (key.downArrow || input === "j") setListCursor((c) => Math.min(checklists.length - 1, c + 1));
      const current = checklists[listCursor];
      if (key.return && current) {
        setTaskFilter("all");
        setTaskCursor(0);
        setPhase({ name: "detail", id: current.id });
      }
      if (input === "g") {
        setDraft("");
        setPhase({ name: "prompt" });
      }
      if (input === "n") {
        setDraft("");
        setPhase({ name: "new" });
      }
      if (input === "d" && current) setPhase({ name: "confirmDelete", id: current.id });
      return;
    }
    if (phase.name === "detail" && openChecklist) {
      const rows2 = visibleRows(openChecklist);
      if (key.upArrow || input === "k") setTaskCursor((c) => Math.max(0, c - 1));
      if (key.downArrow || input === "j") setTaskCursor((c) => Math.min(Math.max(0, rows2.length - 1), c + 1));
      if (input === "/") {
        setTaskFilter((f) => f === "all" ? "done" : f === "done" ? "todo" : "all");
        setTaskCursor(0);
        return;
      }
      if (input === " ") {
        const row = rows2[taskCursor];
        if (row) toggleTask(openChecklist.id, row.task.id);
      }
      if (input === "a") {
        setDraft("");
        setPhase({ name: "addTask", id: openChecklist.id });
      }
      if (input === "e") {
        const row = rows2[taskCursor];
        if (row) {
          setDraft(row.task.text);
          setPhase({ name: "editTask", id: openChecklist.id, taskId: row.task.id });
        }
      }
      if (input === "x") {
        const row = rows2[taskCursor];
        if (row) deleteTask(openChecklist.id, row.task.id);
      }
      if (key.escape) {
        if (taskFilter !== "all") setTaskFilter("all");
        else setPhase({ name: "list" });
      }
      return;
    }
  }, { isActive: Boolean(process.stdin.isTTY) });
  const baseHints = phase.name === "genError" ? [["\u21B5", "try again"], ...HINTS.genError] : HINTS[phase.name];
  const hints = phase.name === "list" ? [...baseHints, ["^c", "quit"]] : baseHints;
  if (width < 24) {
    return /* @__PURE__ */ React12.createElement(Screen, null, /* @__PURE__ */ React12.createElement(Text11, { color: theme.muted, dimColor: theme.dimMuted }, "Make the terminal a little wider \u2194"));
  }
  if (showHelp) return /* @__PURE__ */ React12.createElement(HelpOverlay, null);
  return /* @__PURE__ */ React12.createElement(Screen, null, /* @__PURE__ */ React12.createElement(Box7, { flexDirection: "column", flexGrow: 1, flexShrink: 0, minWidth: 0 }, phase.name === "list" && /* @__PURE__ */ React12.createElement(Welcome, { width }), (phase.name === "new" || phase.name === "confirmDelete" || phase.name === "prompt" || phase.name === "generating" || phase.name === "genError") && /* @__PURE__ */ React12.createElement(Logo, null), /* @__PURE__ */ React12.createElement(Gap, null), phase.name === "list" && /* @__PURE__ */ React12.createElement(Dashboard, { checklists, listCursor, width, showBar }), phase.name === "new" && /* @__PURE__ */ React12.createElement(Box7, { flexDirection: "column" }, /* @__PURE__ */ React12.createElement(Text11, { color: theme.text }, "Name your checklist:"), /* @__PURE__ */ React12.createElement(Box7, null, /* @__PURE__ */ React12.createElement(Text11, { color: theme.accent }, "\u276F "), /* @__PURE__ */ React12.createElement(
    TextField,
    {
      value: draft,
      onChange: setDraft,
      onSubmit: submitNew,
      placeholder: "e.g. Plan a weekend trip"
    }
  ))), phase.name === "prompt" && /* @__PURE__ */ React12.createElement(Box7, { flexDirection: "column", width }, /* @__PURE__ */ React12.createElement(Text11, { color: theme.text }, "What do you want to get done?"), /* @__PURE__ */ React12.createElement(Text11, { color: theme.muted, dimColor: theme.dimMuted }, "You'll get a step-by-step checklist."), /* @__PURE__ */ React12.createElement(Gap, null), /* @__PURE__ */ React12.createElement(Box7, null, /* @__PURE__ */ React12.createElement(Text11, { color: theme.accent }, "\u276F "), /* @__PURE__ */ React12.createElement(Box7, { flexGrow: 1, flexShrink: 1, minWidth: 0 }, /* @__PURE__ */ React12.createElement(
    TextField,
    {
      value: draft,
      onChange: setDraft,
      maxLength: MAX_GOAL,
      onSubmit: (value) => {
        const goal = value.trim();
        if (goal && goal.length <= MAX_GOAL) startGenerate(goal);
      },
      placeholder: SUGGESTIONS[suggestionIndex]
    }
  )), !draft ? /* @__PURE__ */ React12.createElement(Box7, { flexShrink: 0, marginLeft: 2 }, /* @__PURE__ */ React12.createElement(Text11, { color: theme.muted, dimColor: theme.dimMuted }, "\u21E5 tab")) : null), /* @__PURE__ */ React12.createElement(Box7, { flexShrink: 0 }, /* @__PURE__ */ React12.createElement(
    Text11,
    {
      color: draft.length > MAX_GOAL ? theme.danger ?? "red" : theme.muted,
      dimColor: draft.length <= MAX_GOAL && theme.dimMuted
    },
    `${String(draft.length).padStart(String(MAX_GOAL).length)}/${MAX_GOAL}`
  ))), phase.name === "generating" && /* @__PURE__ */ React12.createElement(Box7, { flexDirection: "column", width }, /* @__PURE__ */ React12.createElement(Text11, null, /* @__PURE__ */ React12.createElement(Spinner, null), /* @__PURE__ */ React12.createElement(Text11, { color: theme.text }, " Building your checklist\u2026")), /* @__PURE__ */ React12.createElement(Box7, { marginTop: 1 }, /* @__PURE__ */ React12.createElement(Shimmer, { text: `\u201C${phase.goal}\u201D` }))), phase.name === "genError" && /* @__PURE__ */ React12.createElement(Box7, { flexDirection: "column", width }, /* @__PURE__ */ React12.createElement(
    Box7,
    {
      flexDirection: "column",
      width,
      borderStyle: "round",
      borderColor: theme.accent,
      borderDimColor: theme.dimMuted,
      paddingX: 2,
      paddingY: 1
    },
    /* @__PURE__ */ React12.createElement(Text11, { bold: true, color: theme.text, wrap: "wrap" }, `Your checklist \u201C${truncate(phase.goal, 46)}\u201D didn't generate`),
    /* @__PURE__ */ React12.createElement(Text11, { color: theme.muted, dimColor: theme.dimMuted, wrap: "wrap" }, "Something went wrong this time. Give it another try, or head back and add tasks yourself.")
  ), /* @__PURE__ */ React12.createElement(Box7, { marginTop: 1 }, /* @__PURE__ */ React12.createElement(Box7, { borderStyle: "round", borderColor: theme.accent, paddingX: 2 }, /* @__PURE__ */ React12.createElement(Text11, { bold: true, color: theme.accent }, RETRY_LABEL)))), (phase.name === "detail" || phase.name === "addTask" || phase.name === "editTask") && openChecklist && /* @__PURE__ */ React12.createElement(
    DetailView,
    {
      checklist: openChecklist,
      mode: phase.name,
      editTaskId: phase.name === "editTask" ? phase.taskId : void 0,
      taskCursor,
      taskFilter,
      celebrating,
      draft,
      onDraft: setDraft,
      onSubmitTask: submitTask,
      onSubmitEdit: submitEdit,
      width,
      rows,
      showBar,
      scrollTop
    }
  ), phase.name === "confirmDelete" && (() => {
    const target = checklists.find((c) => c.id === phase.id);
    return /* @__PURE__ */ React12.createElement(Box7, { flexDirection: "column" }, /* @__PURE__ */ React12.createElement(Text11, { color: theme.text }, "Delete \u201C", truncate(target?.title ?? "", 40), "\u201D?"), /* @__PURE__ */ React12.createElement(Text11, { color: theme.muted, dimColor: theme.dimMuted }, "This can\u2019t be undone."));
  })()), /* @__PURE__ */ React12.createElement(Shortcuts, { items: hints }));
}

// src/lib/self.ts
import { existsSync, readFileSync } from "fs";
import { createInterface } from "readline/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import os2 from "os";
var PACKAGE = "checklist-tui";
var UPDATE = /* @__PURE__ */ new Set(["update", "upgrade"]);
var UNINSTALL = /* @__PURE__ */ new Set(["uninstall", "unistall", "unintall", "uninstal", "remove"]);
var tty = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
var wrap = (code, s) => tty ? `\x1B[${code}m${s}\x1B[0m` : s;
var blue = (s) => wrap(34, s);
var bold = (s) => wrap(1, s);
var ok = `${bold("[")}${blue("\u2713")}${bold("]")}`;
var HELP2 = '\n  A checklist app for your terminal.\n\n    checklist\n    checklist "trip to sf for 10 days"\n    checklist update\n    checklist uninstall\n\n';
function say(body) {
  process.stdout.write(body.endsWith("\n") ? body : `${body}
`);
}
function dataPath() {
  return DATA_DIR.replace(os2.homedir(), "~");
}
function packageVersion() {
  try {
    const pkg = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    return JSON.parse(readFileSync(pkg, "utf8")).version;
  } catch {
    return "0.1.5";
  }
}
function npmBin() {
  const local = join(dirname(process.execPath), process.platform === "win32" ? "npm.cmd" : "npm");
  return existsSync(local) ? local : process.platform === "win32" ? "npm.cmd" : "npm";
}
function npm(args2) {
  const result = spawnSync(npmBin(), args2, {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    status: result.status,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? "")
  };
}
function npmError(result) {
  return (result.stderr || result.stdout || "npm failed").trim();
}
function globalVersion() {
  const result = npm(["list", "-g", "--json", "--depth=0", PACKAGE]);
  try {
    const json = JSON.parse(result.stdout || "{}");
    return json.dependencies?.[PACKAGE]?.version ?? null;
  } catch {
    return null;
  }
}
function latestVersion() {
  const result = npm(["view", PACKAGE, "version"]);
  if (result.status !== 0) return null;
  const version = (result.stdout || "").trim();
  return version || null;
}
function commandName(args2) {
  const raw = args2[0]?.toLowerCase();
  if (!raw) return null;
  const token = raw.replace(/^--?/, "");
  if (UPDATE.has(token)) return "update";
  if (UNINSTALL.has(token)) return "uninstall";
  return null;
}
function hasFlag(flags, ...names) {
  return flags.some((flag2) => names.includes(flag2));
}
async function confirm(question) {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}
function updateHelp() {
  say("\n  Install the latest Checklist from npm.\n\n    checklist update\n\n");
}
function uninstallHelp() {
  say(
    "\n  Remove the Checklist command. Lists stay on this machine.\n\n    checklist uninstall\n    checklist uninstall -y\n\n"
  );
}
async function update() {
  const installed = globalVersion();
  const latest = latestVersion();
  if (installed && latest && installed === latest) {
    say(`
  ${ok} ${bold("Already the latest")} (${installed})

`);
    return 0;
  }
  say(`
  Updating Checklist\u2026
`);
  const result = npm(["install", "-g", `${PACKAGE}@latest`]);
  if (result.status !== 0) {
    say(`
  Couldn\u2019t update.

    ${npmError(result).split("\n")[0]}

`);
    return 1;
  }
  const next = globalVersion() ?? latest ?? packageVersion();
  say(`
  ${ok} ${bold("Updated to")} ${next}

    ${blue("checklist")}

`);
  return 0;
}
async function uninstall(yes) {
  if (!globalVersion()) {
    say("\n  Checklist isn\u2019t installed as a global command.\n\n");
    return 1;
  }
  if (!yes) {
    if (!process.stdin.isTTY) {
      say("\n  Pass -y to uninstall.\n\n");
      return 1;
    }
    const okToRemove = await confirm("  Remove Checklist from this machine? [y/N] ");
    if (!okToRemove) {
      say("  Kept.\n\n");
      return 0;
    }
  }
  const result = npm(["uninstall", "-g", PACKAGE]);
  if (result.status !== 0) {
    say(`
  Couldn\u2019t uninstall.

    ${npmError(result).split("\n")[0]}

`);
    return 1;
  }
  say(
    `
  ${ok} ${bold("Checklist")} is uninstalled.

    Your lists are still at ${blue(dataPath())}

`
  );
  return 0;
}
async function runSelfCommand(args2) {
  const command = commandName(args2);
  if (!command) return null;
  const flags = args2.slice(1);
  if (hasFlag(flags, "-h", "--help")) {
    if (command === "update") updateHelp();
    else uninstallHelp();
    return 0;
  }
  if (command === "update") return update();
  return uninstall(hasFlag(flags, "-y", "--yes"));
}

// src/cli.tsx
var args = process.argv.slice(2);
var flag = args[0];
if (flag === "-h" || flag === "--help") {
  process.stdout.write(HELP2);
  process.exit(0);
}
if (flag === "-v" || flag === "--version") {
  process.stdout.write(`${packageVersion()}
`);
  process.exit(0);
}
var self = await runSelfCommand(args);
if (self != null) process.exit(self);
var ESC = String.fromCharCode(27);
var isTTY = Boolean(process.stdout.isTTY);
var cleaned = false;
var cleanup = () => {
  if (cleaned || !isTTY) return;
  cleaned = true;
  process.stdout.write(`${ESC}[?1049l`);
};
process.on("exit", cleanup);
var initialGoal = process.argv.slice(2).join(" ").trim() || void 0;
var instance;
if (isTTY) {
  process.stdout.write(`${ESC}[?1049h${ESC}[2J${ESC}[H`);
  let lastCols = process.stdout.columns;
  let lastRows = process.stdout.rows;
  process.stdout.on("resize", () => {
    if (process.stdout.columns === lastCols && process.stdout.rows === lastRows) return;
    lastCols = process.stdout.columns;
    lastRows = process.stdout.rows;
    instance?.clear();
  });
}
instance = render(/* @__PURE__ */ React13.createElement(App, { initialGoal }));
void instance.waitUntilExit().finally(cleanup);
