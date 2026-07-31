import {defineConfig} from 'tsup'

// Bundle the whole app into a single executable at dist/cli.js. The shebang in
// src/cli.tsx is preserved and the file is marked executable, so `checklist`
// (the bin) runs directly. react/ink/ink-text-input stay external — they're
// runtime dependencies, installed from node_modules when the package is added.
export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
})
