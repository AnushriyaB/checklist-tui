# checklist-tui

A local, keyboard-first checklist manager that lives in your terminal — the
terminal companion to *Make Me A Checklist*. No accounts, no cloud: everything
is saved to a single JSON file at `~/.config/checklist/data.json`.

## Install

Once published to npm, run it without installing:

```bash
npx checklist-tui
```

…or install it globally to get the `checklist` command:

```bash
npm install -g checklist-tui
checklist
```

Requires Node 18+.

## Keys

- **↑ ↓** move · **↵** open a checklist · **n** new · **d** delete
- inside a checklist: **↑ ↓** move · **space** toggle done · **a** add task · **esc** back
- **^t** cycle theme (auto → dark → light) · **^c** quit
- **Mouse:** click a checklist to open it, click a task to toggle it, click the
  footer hints. (While the app runs, use Option/Shift-drag to select text.)

## Develop

```bash
npm install
npm run dev        # run from source with tsx
npm run typecheck  # type-check
npm run build      # bundle to dist/cli.js with tsup
```

## Status

Built step by step as a learning project. Done: dashboard, local storage,
create/open/add/toggle/delete, mouse support, theming, responsive layout,
animated launch card. Next: AI-generated checklists from a one-line goal.

## License

MIT
