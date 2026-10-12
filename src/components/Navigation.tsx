/** Sidebar and mobile navigation. Copyright (c) 2026 Develofer2. MIT License. */
import {
  AudioLines,
  Menu,
  Palette,
  Settings as SettingsIcon,
  ListMusic,
  Plus,
  ShieldCheck,
} from "lucide-react"
import { Button, IconButton } from "./ui"
import { useAura } from "../state"
interface NavigationLink {
  id: string
  name: string
  icon: typeof AudioLines
  short?: string
}
interface NavigationProps {
  page: string
  links: NavigationLink[]
  navigate: (page: string) => void
  onImport: () => void
  onExpand: () => void
  showBrand?: boolean
  rail?: boolean
  expanded?: boolean
  onToggle?: () => void
}
export default function Navigation({
  page,
  links,
  navigate,
  onImport,
  onExpand,
  showBrand = true,
  rail = false,
  expanded = false,
  onToggle,
}: NavigationProps) {
  const aura = useAura()
  const label = (long: string, short: string) => (
    <>
      <span className="nav-text">{long}</span>
      {rail && <span className="nav-short">{short}</span>}
    </>
  )
  return (
    <>
      {onToggle && (
        <div className="rail-head">
          <IconButton
            label={expanded ? "Close navigation" : "Open navigation"}
            className="rail-toggle"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <Menu size={22} />
          </IconButton>
          <Button
            variant="ghost"
            className="brand"
            onClick={() => navigate("home")}
            aria-label="AURA home"
          >
            <span className="brand-mark">
              <AudioLines size={22} />
            </span>
            <span>AURA</span>
          </Button>
        </div>
      )}
      {showBrand && !onToggle && (
        <Button
          variant="ghost"
          className="brand"
          onClick={() => navigate("home")}
          aria-label="AURA home"
        >
          <span className="brand-mark">
            <AudioLines size={24} />
          </span>
          <span>AURA</span>
        </Button>
      )}
      <div className="navigation-body">
        {" "}
        <span className="nav-label">YOUR SPACE</span>
        <nav className="main-nav" aria-label="Primary navigation">
          {links.map((l) => (
            <Button
              variant="ghost"
              key={l.id}
              aria-label={l.name}
              className={`nav-link ${
                page.split("/")[0] === l.id ||
                (l.id === "playlists" && page.startsWith("playlist/"))
                  ? "selected"
                  : ""
              }`}
              onClick={() => navigate(l.id)}
            >
              <l.icon size={19} />
              {label(l.name, l.short ?? l.name)}
              {page === l.id && <span className="nav-dot" />}
            </Button>
          ))}
        </nav>
        <Button
          variant="ghost"
          aria-label="Listening canvas"
          className="nav-link canvas-nav"
          onClick={onExpand}
        >
          <AudioLines size={19} />
          {label("Listening canvas", "Canvas")}
          <span className="new-label">NEW</span>
        </Button>
        <div className="nav-separator" />
        <span className="nav-label">MAKE IT YOURS</span>
        <nav className="main-nav" aria-label="Preferences">
          <Button
            variant="ghost"
            aria-label="Themes & appearance"
            className={`nav-link ${page === "themes" ? "selected" : ""}`}
            onClick={() => navigate("themes")}
          >
            <Palette size={19} />
            {label("Themes & appearance", "Themes")}
          </Button>
          <Button
            variant="ghost"
            aria-label="Settings"
            className={`nav-link ${page === "settings" ? "selected" : ""}`}
            onClick={() => navigate("settings")}
          >
            <SettingsIcon size={19} />
            {label("Settings", "Settings")}
          </Button>
        </nav>
        <div className="sidebar-playlists">
          <div className="section-heading">
            <span className="nav-label">YOUR PLAYLISTS</span>
            <IconButton
              label="Create playlist"
              onClick={() => navigate("playlists")}
            >
              <Plus size={16} />
            </IconButton>
          </div>
          {aura.playlists.slice(0, 5).map((p) => (
            <Button
              className="sidebar-playlist"
              variant="ghost"
              key={p.id}
              onClick={() => navigate(`playlist/${p.id}`)}
            >
              <ListMusic size={15} />
              {p.name}
            </Button>
          ))}
          {!aura.playlists.length && (
            <p>
              Your next soundtrack
              <br />
              starts with a playlist.
            </p>
          )}
        </div>
      </div>
      <div className="sidebar-bottom">
        <div className="local-badge">
          <ShieldCheck size={19} />
          <div>
            <strong>Just you & your music.</strong>
            <span>100% local. Always personal.</span>
          </div>
        </div>
        <Button onClick={onImport} className="sidebar-import">
          <Plus size={17} />
          {label("Import music", "Import")}
        </Button>
        <div className="sidebar-version">
          <span>AURA / PERSONAL PLAYER</span>
          <span>v1.0</span>
        </div>
      </div>
    </>
  )
}
