/** Settings: storage, backup/restore, about and data reset. Copyright (c) 2026 Develofer2. MIT License. */
import { useEffect, useState } from "react"
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  Trash2,
  HardDrive,
  LockKeyhole,
  AlertTriangle,
  Eye,
  History,
  Sparkles,
} from "lucide-react"
import { Button, Field, Heading, Modal } from "../components/ui"
import { useAura } from "../state"
import {
  clearDatabase,
  clearListeningHistory,
  storageMessage,
  copiedAudioSummary,
} from "../storage"
import {
  createBackup,
  downloadJSON,
  restoreBackup,
  validateBackup,
  type Backup,
} from "../backup"
import { player } from "../playback"
import { defaults } from "../models"
import {
  APP_NAME,
  COPYRIGHT,
  DEVELOPER,
  LICENSE_NAME,
  USAGE_NOTICE,
} from "../about"
import { usePwa } from "../pwa"
export default function Settings() {
  const aura = useAura(),
    pwa = usePwa(),
    [estimate, setEstimate] = useState<StorageEstimate>(),
    [audioStorage, setAudioStorage] = useState({ count: 0, bytes: 0 }),
    [persistent, setPersistent] = useState<boolean>(),
    [backup, setBackup] = useState<Backup>(),
    [clear, setClear] = useState(false),
    [clearHistory, setClearHistory] = useState(false),
    [confirmText, setConfirmText] = useState("")
  useEffect(() => {
    navigator.storage?.estimate?.().then(setEstimate)
    navigator.storage?.persisted?.().then(setPersistent)
    void copiedAudioSummary().then(setAudioStorage)
  }, [aura.tracks.length])
  const mb = (bytes = 0) =>
    bytes >= 1024 ** 3
      ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
      : `${(bytes / 1024 ** 2).toFixed(1)} MB`
  async function loadBackup(file?: File) {
    if (!file) return
    try {
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Backup exceeds the 50 MB metadata limit.")
      setBackup(validateBackup(JSON.parse(await file.text())))
    } catch (e) {
      aura.notify(storageMessage(e))
    }
  }
  async function restore() {
    if (!backup) return
    try {
      const preferences = await restoreBackup(backup)
      await aura.refresh()
      await aura.preferences(preferences)
      setBackup(undefined)
      aura.notify(
        "Metadata restored. Tracks without saved audio need relinking.",
      )
    } catch (e) {
      aura.notify(storageMessage(e))
    }
  }
  return (
    <div className="page">
      <div className="page-intro">
        <span className="eyebrow">A LITTLE HOUSEKEEPING</span>
        <Heading level={1}>
          Your space. Your control<span className="accent">.</span>
        </Heading>
        <p className="muted">Know what’s saved. Keep what matters.</p>
      </div>
      <div className="settings-grid">
        <section className="chart-card">
          <div className="section-heading">
            <Heading>Device storage</Heading>
            <HardDrive size={22} />
          </div>
          <div className="storage-total">
            {estimate ? mb(estimate.usage) : "Estimate unavailable"}
            <span className="muted">
              {estimate?.quota
                ? `of approximately ${mb(estimate.quota)}`
                : "Browser storage"}
            </span>
          </div>
          <div className="storage-meter">
            <div
              style={{
                width: `${
                  estimate?.quota
                    ? Math.min(
                        100,
                        ((estimate.usage || 0) / estimate.quota) * 100,
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="muted">
            Estimates cover this site’s storage and are not a guaranteed
            allocation. {audioStorage.count} offline audio{" "}
            {audioStorage.count === 1 ? "copy uses" : "copies use"}{" "}
            approximately {mb(audioStorage.bytes)}. Your library has{" "}
            {aura.tracks.length} tracks.
          </p>
          <div className="info-line">
            <ShieldCheck size={18} />
            <span>
              {persistent
                ? "Persistent storage permission is granted. This helps protect against automatic eviction."
                : "Browser storage may be evicted. Request protection and keep your original music files."}
            </span>
          </div>
          {aura.tracks.some((t) => t.access === "reference") && (
            <div className="info-line">
              <ShieldCheck size={18} />
              <span>
                {aura.tracks.filter((t) => t.access === "reference").length}{" "}
                tracks only point to your original files and can need
                reconnecting. Saving offline copies avoids needing the original
                file while that browser storage remains available.
              </span>
              <Button
                onClick={async () => {
                  const n = await aura.makePermanent()
                  aura.notify(
                    n
                      ? `${n} tracks saved permanently.`
                      : "Nothing could be converted. Relink those tracks first.",
                  )
                }}
              >
                Save all available offline
              </Button>
            </div>
          )}
          <Button
            disabled={persistent}
            onClick={async () => {
              const result = await navigator.storage?.persist?.()
              setPersistent(result)
              aura.notify(
                result
                  ? "Storage protection granted."
                  : "Your browser did not grant protection. Music can still be saved normally.",
              )
            }}
          >
            Request storage protection
          </Button>
          {!pwa.installed && pwa.installPrompt && (
            <Button onClick={() => void pwa.install()}>
              <Download size={17} />
              Install AURA
            </Button>
          )}
          <p className="muted">
            {pwa.installed
              ? "AURA is running as an installed app."
              : pwa.installPrompt
                ? "This browser currently offers app installation."
                : "Install support depends on your browser and operating system. On browsers without an install prompt, use the browser’s Add to Home Screen or Install command when available."}
          </p>
        </section>
        <section className="chart-card">
          <div className="section-heading">
            <Heading>Keep a copy of your world</Heading>
            <Database size={22} />
          </div>
          <p className="muted">
            Export playlists, favorites, listening history, themes and settings
            as a metadata backup.
          </p>
          <div className="info-line">
            <AlertTriangle size={19} />
            <span>
              Backups do not include audio files or file permissions. Keep your
              original music, and relink if you restore on another browser.
            </span>
          </div>
          <div className="form-stack">
            <Button
              onClick={() =>
                void createBackup()
                  .then((b) =>
                    downloadJSON(
                      b,
                      `aura-backup-${new Date().toISOString().slice(0, 10)}.json`,
                    ),
                  )
                  .catch((e) => aura.notify(storageMessage(e)))
              }
            >
              <Download size={17} />
              Export metadata backup
            </Button>
            <label className="button secondary">
              <Upload size={17} />
              Restore a backup
              <Field
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  void loadBackup(e.target.files?.[0])
                  e.target.value = ""
                }}
              />
            </label>
          </div>
        </section>
      </div>
      <section className="chart-card">
        <div className="section-heading">
          <Heading>Private, by design</Heading>
          <LockKeyhole size={22} />
        </div>
        <p className="muted">
          Audio is read and played locally. There are no accounts, cloud
          uploads, or tracking-based recommendations. Library storage belongs to
          this browser and site address—not your other devices.
        </p>
        <p className="muted">
          Clearing site data, private browsing, or browser eviction can remove
          your library. File references may need permission again. The app shell
          can reopen offline after its first successful online load and caching.
          Referenced files can still require permission; offline copies remain
          subject to browser quotas and eviction. Background playback on mobile
          depends on your browser and operating system.
        </p>
        <p className="muted">
          Shortcuts: Space to play/pause · Alt + ← / → to skip · Ctrl/Cmd + K to
          search. Text fields and sliders keep their normal keyboard behavior.
        </p>
      </section>
      <section className="chart-card">
        <div className="section-heading">
          <div>
            <Heading>Privacy & listening data</Heading>
            <p className="muted">
              Each signal is optional. These settings stay in this browser.
            </p>
          </div>
          <Eye size={22} />
        </div>
        <label className="settings-row privacy-setting">
          <div>
            <strong>Keep listening history</strong>
            <p className="muted">
              Record qualified plays and listening time for your stats.
            </p>
          </div>
          <Field
            type="checkbox"
            checked={aura.prefs.trackListeningHistory}
            onChange={(event) =>
              void aura.preferences({
                trackListeningHistory: event.target.checked,
              })
            }
          />
        </label>
        <label className="settings-row privacy-setting">
          <div>
            <strong>Personalize Mood & discovery</strong>
            <p className="muted">
              Use local favorites, play counts, and recency to rank mixes.
            </p>
          </div>
          <Field
            type="checkbox"
            checked={aura.prefs.personalizedRecommendations}
            onChange={(event) =>
              void aura.preferences({
                personalizedRecommendations: event.target.checked,
              })
            }
          />
        </label>
        <label className="settings-row privacy-setting">
          <div>
            <strong>Remember playback position</strong>
            <p className="muted">
              Save where you stopped so the queue can resume after a reload.
            </p>
          </div>
          <Field
            type="checkbox"
            checked={aura.prefs.rememberPlaybackPosition}
            onChange={(event) =>
              void aura.preferences({
                rememberPlaybackPosition: event.target.checked,
              })
            }
          />
        </label>
        <div className="privacy-actions">
          <Button variant="danger" onClick={() => setClearHistory(true)}>
            <History size={17} />
            Delete listening history
          </Button>
          <Button onClick={() => (location.hash = "discover")}>
            <Sparkles size={17} />
            Open Mood & discovery
          </Button>
        </div>
      </section>
      <section className="chart-card">
        <div className="section-heading">
          <Heading>About {APP_NAME}</Heading>
        </div>
        {USAGE_NOTICE.map((line) => (
          <p className="muted" key={line}>
            {line}
          </p>
        ))}
        <p className="muted">
          Developed by {DEVELOPER}. {COPYRIGHT}. Released under the{" "}
          {LICENSE_NAME} license.
        </p>
      </section>
      <section className="chart-card danger-zone">
        <div className="section-heading">
          <div>
            <Heading>Start fresh</Heading>
            <p className="muted">
              Remove all AURA data from this browser. Original external files
              are never deleted.
            </p>
          </div>
          <Button variant="danger" onClick={() => setClear(true)}>
            <Trash2 size={17} />
            Clear app data
          </Button>
        </div>
      </section>
      <Modal
        open={!!backup}
        onClose={() => setBackup(undefined)}
        title="Restore your world"
        description="This merges metadata without replacing existing saved audio."
      >
        <div className="form-stack">
          <p>
            {backup?.tracks.length} tracks · {backup?.playlists.length}{" "}
            playlists · {backup?.events.length} listening events
          </p>
          <p className="muted">
            Tracks match by fingerprint. New tracks will require relinking.
            Playlists are added with new IDs, listening events are deduplicated,
            and imported preferences are applied.
          </p>
          <Button variant="primary" onClick={() => void restore()}>
            Merge backup
          </Button>
        </div>
      </Modal>
      <Modal
        open={clearHistory}
        onClose={() => setClearHistory(false)}
        title="Delete listening history?"
        description="This removes listening events, play counts, last-played dates, and listening-time statistics. Your tracks, favorites, and playlists stay intact."
      >
        <div className="form-stack">
          <p className="muted">
            This action only affects AURA data in this browser and cannot be
            undone.
          </p>
          <Button
            variant="danger"
            onClick={async () => {
              try {
                player.forgetCurrentListening()
                await clearListeningHistory()
                await aura.refresh()
                setClearHistory(false)
                aura.notify("Listening history deleted.")
              } catch (error) {
                aura.notify(storageMessage(error))
              }
            }}
          >
            Delete history
          </Button>
        </div>
      </Modal>
      <Modal
        open={clear}
        onClose={() => setClear(false)}
        title="Clear all app data?"
        description="This removes saved audio copies, playlists, favorites, listening history and appearance settings. This cannot be undone."
      >
        <div className="form-stack">
          <label>
            Type CLEAR to confirm
            <Field
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </label>
          <Button
            variant="danger"
            disabled={confirmText !== "CLEAR"}
            onClick={async () => {
              try {
                player.stop()
                await clearDatabase()
                await aura.refresh()
                await aura.preferences(defaults)
                setClear(false)
                setConfirmText("")
                aura.notify(
                  "App data cleared. Your original files are untouched.",
                )
              } catch (e) {
                aura.notify(storageMessage(e))
              }
            }}
          >
            Permanently clear AURA data
          </Button>
        </div>
      </Modal>
    </div>
  )
}
