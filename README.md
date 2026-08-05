# checklist-tui

A local, keyboard-first checklist manager that lives in your terminal — the
terminal companion to *Make Me A Checklist*. Type a goal, let AI turn it into a
step-by-step checklist, and check things off without leaving your shell. No
accounts, no cloud: everything is saved to a single JSON file at
`~/.config/checklist/data.json`.

## Install

Run it without installing:

```bash
npx checklist-tui
```

…or install globally to get the `checklist` command:

```bash
npm install -g checklist-tui
checklist
```

You can also generate straight from the shell:

```bash
checklist "plan a 3-day trip to Lisbon"
```

Requires **Node 18+**.

## Keys

**Dashboard**
- **↑ ↓ / j k** move · **↵** open · **g** generate with AI · **n** new · **d** delete

**Inside a checklist**
- **↑ ↓ / j k** move · **space** toggle done · **e** edit · **a** add · **x** delete
- **/** filter (all → done → to-do) · **esc** back

**Anywhere**
- **?** shortcut help · **^t** cycle theme (dark → light → auto) · **^c** quit

**In text fields:** **← →** by character · **⌥ ← →** by word · **⌃a / ⌃e** line start / end · **⇥** use a suggestion.

## AI generation

Press **g**, type a goal, and it becomes a full checklist with phases and steps.
This calls [OpenRouter](https://openrouter.ai) directly, so it needs **your own
API key** in the environment:

```bash
export OPENROUTER_API_KEY="your-key"   # add to ~/.zshrc to persist, then restart
```

Your key stays on your machine. **Everything else works without it** — you can
create, edit, and check off checklists by hand offline. If generation fails
(no key, offline, a hiccup), the app says so and offers a **Try again**.

## Develop

```bash
git clone https://github.com/AnushriyaB/checklist-tui.git
cd checklist-tui
npm install        # installs deps and builds
npm run dev        # run from source with tsx
npm run typecheck  # type-check
npm run build      # bundle to dist/cli.js with tsup
```

## Status

An early, still-evolving project. Today: AI-generated checklists from a one-line
goal, local storage, create / open / add / edit / delete / toggle, filtering,
scrolling, theming, a responsive layout, and an animated launch card. Terminal
UI built with [Ink](https://github.com/vadimdemedes/ink).

## License

MIT
