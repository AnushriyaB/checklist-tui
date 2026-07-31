# checklist-tui

A local, keyboard-first checklist manager that lives in your terminal — the
terminal companion to *Make Me A Checklist*. No accounts, no cloud: everything
is saved to a single JSON file at `~/.config/checklist/data.json`.

## Run it

```bash
npm install
npm run dev
```

## Keys

- **↑ ↓** move · **↵** open a checklist · **n** new · **d** delete
- inside a checklist: **↑ ↓** move · **space** toggle done · **a** add task · **esc** back
- **^t** cycle theme (auto → dark → light) · **^c** quit

## Status

Step 1 of 4: dashboard, local storage, create / open / add / toggle / delete.
Coming next: nicer nested phases + mouse, then AI generation from a goal.
