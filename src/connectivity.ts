/** Shared browser connectivity hints. Local features never depend on this state. */
import { useSyncExternalStore } from "react"

export type ConnectivityState = "online" | "offline" | "reconnecting"
let state: ConnectivityState =
  typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online"
const listeners = new Set<() => void>()
let timer: number | undefined
const emit = () => listeners.forEach((listener) => listener())
function set(next: ConnectivityState) {
  state = next
  emit()
}
if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    if (timer) clearTimeout(timer)
    set("offline")
  })
  window.addEventListener("online", () => {
    set("reconnecting")
    timer = window.setTimeout(() => set("online"), 1500)
  })
}
export function useConnectivity() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => "online",
  )
}
