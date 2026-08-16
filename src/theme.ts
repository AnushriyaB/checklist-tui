import React, {createContext, useContext, type ReactNode} from 'react'

export const THEME_MODES = ['auto', 'dark', 'light'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export type Theme = {
  mode: ThemeMode
  /** Undefined = use the terminal's own foreground/accent colours. */
  accent?: string
  text?: string
  muted?: string
  /** Over-limit / error. Undefined in `auto` so we fall back to ANSI red. */
  danger?: string
  /** When true, render muted text via ANSI `dim` instead of a hex colour. */
  dimMuted: boolean
  /**
   * A faint fill for surfaces (the footer bar). Left undefined in `auto`
   * because we can't know the terminal's background there — a hardcoded gray
   * would clash. Only painted when the theme pins its own colours.
   */
  barBg?: string
}

// `auto` leaves colours unset so the terminal's own palette wins — detecting
// whether a terminal is light or dark is unreliable, and ANSI defaults already
// match it. `dark`/`light` pin exact colours for people who want them.
const themes: Record<ThemeMode, Theme> = {
  auto: {mode: 'auto', accent: undefined, text: undefined, muted: undefined, danger: undefined, dimMuted: true, barBg: undefined},
  dark: {mode: 'dark', accent: '#8aa2ff', text: '#f4f4f5', muted: '#a1a1aa', danger: '#f87171', dimMuted: false, barBg: '#242429'},
  light: {mode: 'light', accent: '#3b5bdb', text: '#18181b', muted: '#52525b', danger: '#e03131', dimMuted: false, barBg: '#ededf0'},
}

const ThemeContext = createContext<Theme>(themes.auto)

export const useTheme = (): Theme => useContext(ThemeContext)

export function ThemeProvider({mode, children}: {mode: ThemeMode; children: ReactNode}) {
  return React.createElement(ThemeContext.Provider, {value: themes[mode]}, children)
}

export const nextThemeMode = (mode: ThemeMode): ThemeMode =>
  THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length]!
