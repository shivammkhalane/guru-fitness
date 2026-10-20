import { useSyncExternalStore } from 'react'

const storageKey = 'guru-fitness-theme'
const listeners = new Set()

const getInitialTheme = () => {
  const storedTheme = window.localStorage.getItem(storageKey)
  return storedTheme === 'dark' ? 'dark' : 'light'
}

let currentTheme = getInitialTheme()

const notify = () => {
  listeners.forEach((listener) => listener())
}

const applyTheme = (theme) => {
  currentTheme = theme
  document.documentElement.classList.toggle('dark', theme === 'dark')
  window.localStorage.setItem(storageKey, theme)
  notify()
}

document.documentElement.classList.toggle('dark', currentTheme === 'dark')

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => currentTheme

export default function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'light')

  return {
    theme,
    setTheme: applyTheme,
    toggleTheme: () => applyTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}
