/** Install and service-worker update state for the production PWA. */
import { useSyncExternalStore } from "react"
import { registerSW } from "virtual:pwa-register"

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}
type PwaState = {
  offlineReady: boolean
  updateReady: boolean
  installPrompt?: InstallPromptEvent
  installed: boolean
  error?: string
}
let state: PwaState = {
  offlineReady: false,
  updateReady: false,
  installed:
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches,
}
const listeners = new Set<() => void>()
const patch = (next: Partial<PwaState>) => {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}
const updateSW = registerSW({
  immediate: true,
  onOfflineReady: () => patch({ offlineReady: true }),
  onNeedRefresh: () => patch({ updateReady: true }),
  onRegisterError: (error) =>
    patch({
      error:
        error instanceof Error
          ? error.message
          : "Offline support could not be registered.",
    }),
})
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    patch({ installPrompt: event as InstallPromptEvent })
  })
  window.addEventListener("appinstalled", () =>
    patch({ installed: true, installPrompt: undefined }),
  )
}
export function usePwa() {
  const value = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
  return {
    ...value,
    install: async () => {
      if (!state.installPrompt) return false
      await state.installPrompt.prompt()
      const choice = await state.installPrompt.userChoice
      if (choice.outcome === "accepted")
        patch({ installed: true, installPrompt: undefined })
      return choice.outcome === "accepted"
    },
    applyUpdate: () => updateSW(true),
  }
}
