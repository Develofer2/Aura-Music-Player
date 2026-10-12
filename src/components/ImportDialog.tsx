/** Import and relink dialog for audio files and folders. Copyright (c) 2026 Develofer2. MIT License. */
import { useRef, useState } from "react"
import {
  Upload,
  FolderOpen,
  FileAudio,
  ShieldCheck,
  ArrowUpRight,
  Link2,
  ChevronDown,
} from "lucide-react"
import { Button, Field, Modal, Heading } from "./ui"
import { useAura } from "../state"
import { inspectFile } from "../importer"
import { database, saveTrack, storageMessage } from "../storage"
import type { Track } from "../models"
type PickerWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
}
interface ImportFile {
  file: File
  handle?: FileSystemFileHandle
  path?: string
  copy?: boolean
}
const audioName = /\.(mp3|wav|flac|m4a|ogg|aac|opus)$/i
const isAudio = (file: File) =>
  file.type.startsWith("audio/") || audioName.test(file.name)
async function collectDropped(items: DataTransferItemList) {
  const entries = Array.from(items)
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => !!entry)
  const files: ImportFile[] = []
  let hasFolder = false
  async function walk(entry: FileSystemEntry, path: string) {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      )
      if (isAudio(file)) files.push({ file, path: `${path}${file.name}` })
    } else if (entry.isDirectory) {
      hasFolder = true
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject),
        )
        if (!batch.length) break
        for (const child of batch) await walk(child, `${path}${entry.name}/`)
      }
    }
  }
  for (const entry of entries) await walk(entry, "")
  return { files, hasFolder }
}
interface Candidate extends ImportFile {
  id: string
  title: string
  artist: string
  duplicate: boolean
  selected: boolean
  error?: string
}
export default function ImportDialog({
  open,
  onClose,
  relink,
}: {
  open: boolean
  onClose: () => void
  relink?: Track
}) {
  const aura = useAura(),
    cancel = useRef(false)
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [messages, setMessages] = useState<string[]>([]),
    [duplicates, setDuplicates] = useState(false),
    [review, setReview] = useState<Candidate[]>([]),
    [folderMode, setFolderMode] = useState<"copy" | "reference">("copy"),
    [protectedStorage, setProtectedStorage] = useState<boolean>(),
    [linkUrl, setLinkUrl] = useState(""),
    [guide, setGuide] = useState(false)
  async function verifySaved(id: string, size: number) {
    const stored = await (await database()).get("sources", id)
    if (!stored?.blob || stored.blob.size !== size)
      throw new Error("The copy could not be verified. Please try again.")
  }
  async function importFiles(files: ImportFile[], forceDuplicates = false) {
    if (!files.length) return
    const persisted = await navigator.storage?.persist?.().catch(() => false)
    setProtectedStorage(!!persisted)
    const bytes = files.reduce((sum, f) => sum + f.file.size, 0)
    const estimate = await navigator.storage
      ?.estimate?.()
      .catch(() => undefined)
    const free = estimate?.quota
      ? estimate.quota - (estimate.usage || 0)
      : Infinity
    if (
      (bytes > 100 * 1024 * 1024 || bytes > free * 0.5) &&
      !window.confirm(
        "This import uses a substantial amount of browser storage. Audio copies can be cleared or evicted, and estimated capacity is not guaranteed. Continue?",
      )
    )
      return
    setBusy(true)
    setMessages([])
    cancel.current = false
    const results: string[] = []
    let saved = 0,
      reconnected = 0
    try {
      for (const [i, item] of files.entries()) {
        if (cancel.current) break
        setProgress(`Reading ${i + 1} of ${files.length} · ${item.file.name}`)
        try {
          const { track, source } = await inspectFile(
            item.file,
            item.handle,
            item.copy,
          )
          if (relink) {
            if (
              !window.confirm(
                `Reconnect “${relink.title}” with “${track.title}”? Playlists, favorites and history will be preserved.`,
              )
            )
              break
            await saveTrack(
              {
                ...relink,
                duration: track.duration,
                size: track.size,
                fingerprint: track.fingerprint,
                filename: track.filename,
                access: source.blob ? "copy" : track.access,
                missing: false,
              },
              { ...source, id: relink.id },
            )
          } else {
            const existing = (await (await database()).getAll("tracks")).find(
              (t) => t.fingerprint === track.fingerprint,
            )
            if (existing?.missing) {
              await saveTrack(
                {
                  ...existing,
                  duration: track.duration,
                  size: track.size,
                  filename: track.filename,
                  access: source.blob ? "copy" : "reference",
                  missing: false,
                },
                { ...source, id: existing.id },
              )
              if (source.blob) await verifySaved(existing.id, item.file.size)
              reconnected++
              saved++
              continue
            }
            if (existing && !duplicates && !forceDuplicates) {
              results.push(`${item.file.name}: duplicate skipped`)
              continue
            }
            await saveTrack(track, source)
            if (source.blob) await verifySaved(track.id, item.file.size)
          }
          saved++
        } catch (e) {
          results.push(`${item.file.name}: ${storageMessage(e)}`)
          if (e instanceof DOMException && e.name === "QuotaExceededError")
            break
        }
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      await aura.refresh()
      if (saved) {
        aura.notify(
          `${saved} ${saved === 1 ? "track" : "tracks"} saved locally.`,
        )
      }
      setMessages([
        `${saved} saved${reconnected ? ` (${reconnected} reconnected)` : ""}. ${
          cancel.current
            ? "Import stopped; completed saves are retained."
            : "Your music never leaves this device."
        }`,
        ...results,
      ])
      if (!cancel.current) setReview([])
    } catch (e) {
      setMessages([storageMessage(e)])
    } finally {
      setBusy(false)
      setProgress("")
    }
  }
  async function scanFolder(files: ImportFile[]) {
    setBusy(true)
    setMessages([])
    setProgress(`Scanning ${files.length} audio files…`)
    try {
      const existing = await (await database()).getAll("tracks")
      const found: Candidate[] = []
      for (const [index, item] of files.entries()) {
        setProgress(
          `Inspecting ${index + 1} of ${files.length} · ${item.path || item.file.name}`,
        )
        try {
          const { track } = await inspectFile(item.file)
          found.push({
            ...item,
            id: crypto.randomUUID(),
            title: track.title,
            artist: track.artist,
            duplicate: existing.some(
              (saved) => saved.fingerprint === track.fingerprint,
            ),
            selected: !existing.some(
              (saved) => saved.fingerprint === track.fingerprint,
            ),
          })
        } catch (error) {
          found.push({
            ...item,
            id: crypto.randomUUID(),
            title: item.file.name,
            artist: "Could not read metadata",
            duplicate: false,
            selected: false,
            error: storageMessage(error),
          })
        }
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      setReview(found)
      if (!found.length) setMessages(["No supported audio files were found."])
    } catch (error) {
      setMessages([storageMessage(error)])
    } finally {
      setBusy(false)
      setProgress("")
    }
  }
  async function importFromLink() {
    let url: URL
    try {
      url = new URL(linkUrl.trim())
      if (!/^https?:$/.test(url.protocol)) throw new Error()
    } catch {
      setMessages(["Paste a full web address that starts with http or https."])
      return
    }
    setBusy(true)
    setMessages([])
    setProgress(`Fetching ${url.hostname}…`)
    let file: File | undefined
    try {
      const response = await fetch(url)
      if (!response.ok)
        throw new Error(`The server answered ${response.status}.`)
      const blob = await response.blob()
      const name =
        decodeURIComponent(url.pathname.split("/").pop() || "") || "audio-link"
      const candidate = new File([blob], name, {
        type: blob.type || response.headers.get("content-type") || "",
      })
      if (!isAudio(candidate))
        throw new Error("That link is not a direct audio file.")
      file = candidate
    } catch (e) {
      setMessages([
        e instanceof TypeError
          ? "That site does not allow direct downloads. Download the file yourself, then drop it here."
          : e instanceof Error
            ? e.message
            : "The link could not be read.",
      ])
    } finally {
      setBusy(false)
      setProgress("")
    }
    if (file) {
      await importFiles([{ file }])
      setLinkUrl("")
    }
  }
  async function pickFolder() {
    try {
      const directory = await (window as PickerWindow).showDirectoryPicker?.()
      if (!directory) return
      const files: ImportFile[] = []
      async function walk(dir: FileSystemDirectoryHandle, path = "") {
        for await (const handle of (dir as unknown as {
          values(): AsyncIterable<FileSystemHandle>
        }).values()) {
          if (handle.kind === "directory")
            await walk(
              handle as FileSystemDirectoryHandle,
              `${path}${handle.name}/`,
            )
          else {
            const file = await (handle as FileSystemFileHandle).getFile()
            if (
              file.type.startsWith("audio/") ||
              /\.(mp3|wav|flac|m4a|ogg|aac|opus)$/i.test(file.name)
            )
              files.push({
                file,
                handle: handle as FileSystemFileHandle,
                path: `${path}${file.name}`,
              })
          }
        }
      }
      await walk(directory)
      await scanFolder(files)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setMessages([storageMessage(e)])
    }
  }
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) {
          setReview([])
          setMessages([])
          onClose()
        }
      }}
      title={relink ? "Reconnect your music" : "Make yourself at home"}
      description="Import your own audio. No uploads, no accounts, just your music."
    >
      <Field
        className="hidden"
        type="file"
        id="folder-import"
        accept="audio/*,.flac,.m4a,.opus"
        multiple
        {...{ webkitdirectory: "" }}
        onChange={(event) => {
          void scanFolder(
            Array.from(event.target.files || []).map((file) => ({
              file,
              path: file.webkitRelativePath || file.name,
            })),
          )
          event.target.value = ""
        }}
      />
      <Field
        className="hidden"
        type="file"
        id="audio-import"
        accept="audio/*,.flac,.m4a,.opus"
        multiple={!relink}
        onChange={(e) => {
          void importFiles(
            Array.from(e.target.files || []).map((file) => ({ file })),
          )
          e.target.value = ""
        }}
      />
      {!review.length ? (
        <div
          className="drop-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (busy) return
            const plain = Array.from(e.dataTransfer.files).map((file) => ({
              file,
            }))
            if (relink || !e.dataTransfer.items?.[0]?.webkitGetAsEntry) {
              void importFiles(plain)
              return
            }
            void collectDropped(e.dataTransfer.items).then(
              ({ files, hasFolder }) => {
                if (hasFolder) void scanFolder(files)
                else void importFiles(files.length ? files : plain)
              },
            )
          }}
        >
          <div className="import-symbol">
            <Upload size={28} />
          </div>
          <Heading level={3}>
            {relink ? "Drop your music here" : "Drop files or folders here"}
          </Heading>
          <p className="muted">MP3, FLAC, WAV, M4A, OGG & more</p>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() =>
              (document.getElementById(
                "audio-import",
              ) as HTMLInputElement)?.click()
            }
          >
            <FileAudio size={17} />
            Choose files
            <ArrowUpRight size={16} />
          </Button>
          {!relink && (
            <Button
              disabled={busy}
              variant="ghost"
              onClick={() => {
                if ((window as PickerWindow).showDirectoryPicker)
                  void pickFolder()
                else
                  (document.getElementById(
                    "folder-import",
                  ) as HTMLInputElement)?.click()
              }}
            >
              <FolderOpen size={16} />
              Import a folder
            </Button>
          )}
        </div>
      ) : (
        <div className="folder-review">
          <div className="folder-review-head">
            <div>
              <Heading level={3}>Review before importing</Heading>
              <p className="muted">
                {review.length} audio files found ·{" "}
                {review.filter((file) => file.selected).length} selected
              </p>
            </div>
            <div className="folder-review-actions">
              <Button
                variant="ghost"
                onClick={() =>
                  setReview((items) =>
                    items.map((item) => ({
                      ...item,
                      selected: !item.error,
                    })),
                  )
                }
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setReview((items) =>
                    items.map((item) => ({ ...item, selected: false })),
                  )
                }
              >
                Clear
              </Button>
            </div>
          </div>
          {review.some((file) => file.handle) && (
            <div className="import-mode" role="group" aria-label="Storage mode">
              <Button
                variant={folderMode === "copy" ? "primary" : "secondary"}
                aria-pressed={folderMode === "copy"}
                onClick={() => setFolderMode("copy")}
              >
                Save permanent copies
              </Button>
              <Button
                variant={folderMode === "reference" ? "primary" : "secondary"}
                aria-pressed={folderMode === "reference"}
                onClick={() => setFolderMode("reference")}
              >
                Reference original files
              </Button>
            </div>
          )}
          <div className="folder-file-list">
            {review.map((item) => (
              <label
                className={`folder-file ${item.error ? "has-error" : ""}`}
                key={item.id}
              >
                <Field
                  type="checkbox"
                  checked={item.selected}
                  disabled={!!item.error}
                  onChange={(event) =>
                    setReview((items) =>
                      items.map((file) =>
                        file.id === item.id
                          ? { ...file, selected: event.target.checked }
                          : file,
                      ),
                    )
                  }
                />
                <FileAudio size={18} />
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.artist} · {item.path || item.file.name}
                  </small>
                  {(item.duplicate || item.error) && (
                    <small className={item.error ? "error-text" : "muted"}>
                      {item.error || "Already in your library"}
                    </small>
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="folder-review-footer">
            <Button variant="ghost" onClick={() => setReview([])}>
              Back
            </Button>
            <Button
              variant="primary"
              disabled={busy || !review.some((candidate) => candidate.selected)}
              onClick={() =>
                void importFiles(
                  review
                    .filter((candidate) => candidate.selected)
                    .map((candidate) => ({
                      file: candidate.file,
                      path: candidate.path,
                      handle: candidate.handle,
                      copy: folderMode === "copy",
                    })),
                  true,
                )
              }
            >
              Import selected
            </Button>
          </div>
        </div>
      )}
      {!review.length && !relink && (
        <form
          className="link-import"
          onSubmit={(e) => {
            e.preventDefault()
            if (!busy && linkUrl.trim()) void importFromLink()
          }}
        >
          <Link2 size={16} />
          <Field
            type="url"
            aria-label="Direct link to an audio file"
            placeholder="Or paste a direct link to an audio file"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <Button type="submit" disabled={busy || !linkUrl.trim()}>
            Add from link
          </Button>
          <small className="muted">
            Only add audio you own or have permission to use.
          </small>
        </form>
      )}
      {!review.length && (
        <div className="import-guide" data-open={guide || undefined}>
          <Button
            variant="ghost"
            aria-expanded={guide}
            onClick={() => setGuide(!guide)}
          >
            How to add music
            <ChevronDown size={15} />
          </Button>
          {guide && (
            <ol>
              <li>Drop songs or whole folders into the box above.</li>
              <li>
                Have a direct link to an audio file? Paste it and choose Add
                from link.
              </li>
              <li>
                Big collection? Use Import a folder, review the list, then pick
                Save permanent copies so it works offline.
              </li>
            </ol>
          )}
        </div>
      )}
      {!review.length && (
        <label className="check-label">
          <Field
            type="checkbox"
            checked={duplicates}
            onChange={(e) => setDuplicates(e.target.checked)}
          />
          Import duplicates instead of skipping
        </label>
      )}
      <div className="info-line">
        <ShieldCheck size={18} />
        <span>
          {protectedStorage === false
            ? "Your browser did not grant permanent storage. Music is still saved here, but keep a metadata backup and your original files. "
            : "Imported music is saved permanently in this app, so you import once and it stays after reload. "}
          Clearing site data removes it. Original files are never modified.
        </span>
      </div>
      {busy && (
        <div role="status" className="import-status">
          {progress}
          <Button
            onClick={() => {
              cancel.current = true
            }}
          >
            Stop import
          </Button>
        </div>
      )}
      {!!messages.length && (
        <div role="status" className="import-status">
          {messages.map((m, i) => (
            <p key={i}>{m}</p>
          ))}
        </div>
      )}
    </Modal>
  )
}
