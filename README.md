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

- **↑ ↓** move · **↵** open a checklist · **g** generate with AI · **n** new · **d** delete
- inside a checklist: **↑ ↓** move · **space** toggle done · **a** add task · **esc** back
- **^t** cycle theme (auto → dark → light) · **^c** quit
- **Mouse:** click a checklist to open it, click a task to toggle it, click the
  footer hints. (While the app runs, use Option/Shift-drag to select text.)

## AI generation (optional)

Press **g**, type a goal, and it becomes a full checklist with phases and steps.
This calls [OpenRouter](https://openrouter.ai) directly, so it needs your own key
in the environment:

```bash
export OPENROUTER_API_KEY="your-key"   # add to ~/.zshrc to persist, then restart
```

The key never leaves your machine. Without it, everything else still works — you
just create checklists by hand. If generation ever fails (offline, hiccup), the
app tells you what happened and offers a **Try again**.

## Develop

```bash
npm install
npm run dev        # run from source with tsx
npm run typecheck  # type-check
npm run build      # bundle to dist/cli.js with tsup
```

## Status

Built step by step as a learning project. Dashboard, local storage,
create/open/add/toggle/delete, mouse support, theming, responsive layout,
animated launch card, and AI-generated checklists from a one-line goal.

## License

MIT
