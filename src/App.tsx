/** Application shell: navigation, routing between pages, global dialogs and theme application. Copyright (c) 2026 Develofer2. MIT License. */
import { useEffect, useState } from "react"
import {
  AudioLines,
  Home as HomeIcon,
  Library as LibraryIcon,
  ListMusic,
  ChartNoAxesColumnIncreasing,
  Palette,
  Search,
  Plus,
  X,
  Menu,
  ShieldCheck,
  Sparkles,
  WifiOff,
  RefreshCw,
  Download,
  CircleHelp,
} from "lucide-react"
import Provider, { useAura } from "./state"
import {
  Button,
  Field,
  Heading,
  IconButton,
  Select,
  Modal,
} from "./components/ui"
import Navigation from "./components/Navigation"
import MiniPlayer, { NowPlaying, QueuePanel } from "./components/Listening"
import SoundStudio from "./components/SoundStudio"
import ImportDialog from "./components/ImportDialog"
import Guide from "./components/Guide"
import Home from "./pages/Home"
import Library from "./pages/Library"
import Playlists from "./pages/Playlists"
import Stats from "./pages/Stats"
import Appearance from "./pages/Appearance"
import Settings from "./pages/Settings"
import Discover from "./pages/Discover"
import { accessibleAccent, themes, themeStyle } from "./themes"
import { player } from "./playback"
import type { Theme, Track } from "./models"
import { useConnectivity } from "./connectivity"
import { usePwa } from "./pwa"
const links = [
  { id: "home", name: "Home", icon: HomeIcon },
  { id: "library", name: "Your library", short: "Library", icon: LibraryIcon },
  { id: "playlists", name: "Playlists", icon: ListMusic },
  {
    id: "discover",
    name: "Mood & discovery",
    short: "Discover",
    icon: Sparkles,
  },
  {
    id: "stats",
    name: "Listening stats",
    short: "Stats",
    icon: ChartNoAxesColumnIncreasing,
  },
]
function Shell() {
  const aura = useAura()
  const connectivity = useConnectivity()
  const pwa = usePwa()
  const [page, setPage] = useState(location.hash.slice(1) || "home"),
    [search, setSearch] = useState(""),
    [importOpen, setImportOpen] = useState(false),
    [relink, setRelink] = useState<Track>(),
    [nowPlaying, setNowPlaying] = useState(false),
    [queue, setQueue] = useState(false),
    [sound, setSound] = useState(false),
    [guide, setGuide] = useState(false),
    [preview, setPreview] = useState<Theme>(),
    [mobileMenu, setMobileMenu] = useState(false),
    [drawer, setDrawer] = useState(false),
    [offlineIntro, setOfflineIntro] = useState(
      !aura.prefs.offlineIntroDismissed,
    )
  useEffect(() => {
    if (!drawer) return
    const close = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false)
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [drawer])
  useEffect(() => {
    if (aura.prefs.offlineIntroDismissed) setOfflineIntro(false)
  }, [aura.prefs.offlineIntroDismissed])
  function navigate(id: string) {
    location.hash = id
    setPage(id)
    setMobileMenu(false)
    setDrawer(false)
    window.scrollTo({ top: 0, behavior: "instant" })
  }
  function onImport() {
    setRelink(undefined)
    setImportOpen(true)
  }
  function onRelink(track: Track) {
    setRelink(track)
    setImportOpen(true)
  }
  useEffect(() => {
    document.title = "AURA — Your personal sound space"
    document.documentElement.lang = "en"
  }, [])
  useEffect(() => {
    const root = document.documentElement
    root.dataset.inputMode = "pointer"
    const pointer = () => {
      root.dataset.inputMode = "pointer"
    }
    const keyboard = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey)
        root.dataset.inputMode = "keyboard"
    }
    document.addEventListener("pointerdown", pointer, true)
    document.addEventListener("keydown", keyboard, true)
    return () => {
      document.removeEventListener("pointerdown", pointer, true)
      document.removeEventListener("keydown", keyboard, true)
    }
  }, [])
  useEffect(() => {
    const changed = () => setPage(location.hash.slice(1) || "home")
    window.addEventListener("hashchange", changed)
    return () => window.removeEventListener("hashchange", changed)
  }, [])
  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 650px)")
    const closeOnDesktop = () => {
      if (!viewport.matches) setMobileMenu(false)
    }
    viewport.addEventListener("change", closeOnDesktop)
    return () => viewport.removeEventListener("change", closeOnDesktop)
  }, [])
  useEffect(() => {
    function keys(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        navigate("library")
        setTimeout(
          () =>
            (document.querySelector(
              '[aria-label="Search your library"]',
            ) as HTMLInputElement)?.focus(),
          0,
        )
        return
      }
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable="true"],[role="slider"],[role="combobox"],[role="listbox"]',
        )
      )
        return
      if (
        e.code === "Space" &&
        !(e.target as HTMLElement).closest('button,[role="dialog"]')
      ) {
        e.preventDefault()
        void player.toggle()
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault()
        void player.next()
      }
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault()
        player.previous()
      }
    }
    window.addEventListener("keydown", keys)
    return () => window.removeEventListener("keydown", keys)
  }, [])
  const activeTheme =
    preview ||
    [...themes, ...aura.prefs.customs].find((t) => t.id === aura.prefs.theme) ||
    themes[0]
  useEffect(() => {
    const style = {
      ...themeStyle(activeTheme),
      "--accent-ink": accessibleAccent(activeTheme.accent),
    }
    Object.entries(style).forEach(([key, value]) =>
      document.documentElement.style.setProperty(key, String(value)),
    )
    document.documentElement.dataset.material = activeTheme.material || "studio"
    document.documentElement.style.colorScheme =
      accessibleAccent(activeTheme.bg) === "#101719" ? "light" : "dark"
    document.documentElement.style.setProperty(
      "--spin-duration",
      activeTheme.motion === "gentle" ? "32s" : "18s",
    )
    document.documentElement.classList.toggle(
      "reduced-motion",
      aura.prefs.reducedMotion || activeTheme.motion === "none",
    )
  }, [activeTheme, aura.prefs.reducedMotion])
  if (aura.error)
    return (
      <div className="recovery-screen">
        <ShieldCheck size={40} />
        <Heading level={1}>Your library needs attention.</Heading>
        <p>{aura.error}</p>
        <p>
          Check that browser storage is enabled. AURA will not silently replace
          your saved library with temporary data.
        </p>
        <Button onClick={() => location.reload()}>Retry storage</Button>
      </div>
    )
  if (!aura.ready)
    return (
      <div className="loading-screen">
        <AudioLines size={40} />
        <span>Opening your space...</span>
      </div>
    )
  return (
    <div
      data-material={activeTheme.material || "studio"}
      className={`app theme-${activeTheme.id} background-${activeTheme.background || "solid"} ${
        aura.prefs.reducedMotion || activeTheme.motion === "none"
          ? "reduced-motion"
          : ""
      }`}
      style={
        {
          ...themeStyle(activeTheme),
          "--accent-ink": accessibleAccent(activeTheme.accent),
        } as React.CSSProperties
      }
    >
      <div className="ambient-backdrop" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
      <Button
        variant="primary"
        className="skip-link"
        onClick={() => document.getElementById("main-content")?.focus()}
      >
        Skip to content
      </Button>
      {drawer && (
        <Button
          variant="ghost"
          className="drawer-scrim"
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={() => setDrawer(false)}
        />
      )}
      <aside className={`sidebar rail ${drawer ? "expanded" : ""}`}>
        <Navigation
          page={page}
          links={links}
          navigate={navigate}
          rail
          expanded={drawer}
          onToggle={() => setDrawer(!drawer)}
          onImport={() => {
            setDrawer(false)
            onImport()
          }}
          onExpand={() => {
            setDrawer(false)
            setNowPlaying(true)
          }}
        />
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <IconButton
              label={mobileMenu ? "Close navigation" : "Open navigation"}
              id="mobile-navigation-trigger"
              aria-expanded={mobileMenu}
              aria-controls={mobileMenu ? "mobile-navigation-panel" : undefined}
              className="mobile-menu-button"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </IconButton>
            <span>AURA</span>
            <strong>
              {page.startsWith("playlist")
                ? "Playlists"
                : page === "themes"
                  ? "Appearance"
                  : links.find((l) => l.id === page)?.name || "Settings"}
            </strong>
          </div>
          <div className="topbar-actions">
            <div className="quick-theme">
              <Palette size={15} />
              <Select
                aria-label="App theme"
                icon={<Palette size={20} />}
                title={`Change theme: ${activeTheme.name}`}
                value={aura.prefs.theme}
                onValueChange={(value) =>
                  void aura.preferences({ theme: value })
                }
              >
                {[...themes, ...aura.prefs.customs].map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="top-search">
              <Search size={16} />
              <Field
                aria-label="Search all music"
                placeholder="Search your music"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  if (page !== "library") navigate("library")
                }}
              />
            </div>
            <span className="topbar-divider" />
            <span
              className="local-status"
              role="status"
              aria-label={`Connection: ${connectivity}`}
            >
              <span className="status-dot" />
              {connectivity === "offline"
                ? "Offline · local features ready"
                : connectivity === "reconnecting"
                  ? "Reconnecting"
                  : "Online · local & private"}
            </span>
            {pwa.installPrompt && !pwa.installed && (
              <IconButton
                label="Install AURA"
                onClick={() => void pwa.install()}
              >
                <Download size={19} />
              </IconButton>
            )}
            <IconButton label="How AURA works" onClick={() => setGuide(true)}>
              <CircleHelp size={19} />
            </IconButton>
            <IconButton label="Import music" onClick={onImport}>
              <Plus size={20} />
            </IconButton>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {page === "home" && (
            <Home
              navigate={navigate}
              onImport={onImport}
              onRelink={onRelink}
              onExpand={() => setNowPlaying(true)}
            />
          )}
          {page === "library" && (
            <Library
              onImport={onImport}
              onRelink={onRelink}
              search={search}
              setSearch={setSearch}
              navigate={navigate}
            />
          )}
          {(page === "playlists" || page.startsWith("playlist/")) && (
            <Playlists
              id={page.split("/")[1]}
              navigate={navigate}
              onRelink={onRelink}
            />
          )}
          {page === "stats" && <Stats />}
          {page === "discover" && (
            <Discover
              onImport={onImport}
              onRelink={onRelink}
              navigate={navigate}
            />
          )}
          {page === "themes" && <Appearance preview={setPreview} />}
          {page === "settings" && <Settings />}
          {![
            "home",
            "library",
            "playlists",
            "stats",
            "discover",
            "themes",
            "settings",
          ].includes(page) &&
            !page.startsWith("playlist/") && (
              <div className="page">
                <Heading>That space isn’t here.</Heading>
                <Button onClick={() => navigate("home")}>Back home</Button>
              </div>
            )}
        </main>
      </div>
      <MiniPlayer
        onExpand={() => setNowPlaying(true)}
        onQueue={() => setQueue(true)}
        onSound={() => setSound(true)}
      />
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          ...links.filter((link) => link.id !== "discover"),
          { id: "themes", name: "Appearance", icon: Palette },
        ].map((l) => (
          <Button
            variant="ghost"
            key={l.id}
            className={page === l.id ? "active" : ""}
            onClick={() => navigate(l.id)}
          >
            <l.icon size={20} />
            <span>
              {l.name === "Your library"
                ? "Library"
                : l.name === "Listening stats"
                  ? "Stats"
                  : l.name}
            </span>
          </Button>
        ))}
      </nav>
      {mobileMenu && (
        <Button
          variant="ghost"
          className="mobile-navigation-scrim"
          aria-label="Dismiss navigation"
          tabIndex={-1}
          onClick={() => setMobileMenu(false)}
        />
      )}
      <Modal
        open={mobileMenu}
        onClose={() => setMobileMenu(false)}
        title="Your space"
        className="navigation-modal"
        modal={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const focused = document.activeElement
          if (
            !focused ||
            focused === document.body ||
            focused.closest(".navigation-modal")
          )
            document.getElementById("mobile-navigation-trigger")?.focus()
        }}
      >
        <div id="mobile-navigation-panel" className="navigation-panel">
          <Navigation
            page={page}
            links={links}
            navigate={navigate}
            showBrand={false}
            onImport={() => {
              setMobileMenu(false)
              onImport()
            }}
            onExpand={() => {
              setMobileMenu(false)
              setNowPlaying(true)
            }}
          />
        </div>
      </Modal>
      <ImportDialog
        open={importOpen}
        onClose={() => {
          setImportOpen(false)
          setRelink(undefined)
        }}
        relink={relink}
      />
      <NowPlaying
        open={nowPlaying}
        onClose={() => setNowPlaying(false)}
        onQueue={() => {
          setNowPlaying(false)
          setQueue(true)
        }}
        onSound={() => setSound(true)}
      />
      <Guide open={guide} onClose={() => setGuide(false)} />
      <SoundStudio open={sound} onClose={() => setSound(false)} />
      <QueuePanel open={queue} onClose={() => setQueue(false)} />
      {aura.toast && (
        <div className="toast" role="status">
          <span>{aura.toast.message}</span>
          {aura.toast.action && (
            <Button variant="primary" onClick={aura.toast.action}>
              {aura.toast.label}
            </Button>
          )}
        </div>
      )}
      {pwa.updateReady && (
        <div className="toast pwa-toast" role="status">
          <RefreshCw size={18} />
          <span>
            An AURA update is ready. Your library and saved music stay in this
            browser.
          </span>
          <Button
            variant="primary"
            onClick={() => {
              if (
                !player.state.playing ||
                window.confirm(
                  "Updating reloads AURA and stops current playback. Update now?",
                )
              )
                void pwa.applyUpdate()
            }}
          >
            Update
          </Button>
        </div>
      )}
      {offlineIntro && (
        <div className="offline-intro" role="status">
          <WifiOff size={19} />
          <span>
            <strong>Prepare for offline listening.</strong> Open AURA online
            once, then save music as offline copies or retain access to original
            files. Browser storage and installation support vary.
          </span>
          <Button
            variant="primary"
            onClick={() => {
              setOfflineIntro(false)
              void aura.preferences({ offlineIntroDismissed: true })
            }}
          >
            Got it
          </Button>
        </div>
      )}
      {aura.prefs.companion && (
        <div className="companion" aria-label="Decorative AURA companion">
          <span />
          <span />
        </div>
      )}
    </div>
  )
}
export default function App() {
  return (
    <Provider>
      <Shell />
    </Provider>
  )
}
