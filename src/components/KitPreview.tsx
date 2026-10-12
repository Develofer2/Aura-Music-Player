/** Copyright (c) 2026 Develofer2. MIT License. */
import { useState } from "react"
import { Heart, Plus } from "lucide-react"
import {
  Artwork,
  Button,
  Field,
  Heading,
  IconButton,
  Modal,
  Select,
  Slider,
} from "./ui"
/** Standalone interactive kit specimen. No playback or library providers required. */
export default function KitPreview() {
  const [open, setOpen] = useState(false),
    [value, setValue] = useState(0.5)
  return (
    <div className="page">
      <Heading level={1}>AURA component kit</Heading>
      <section className="chart-card">
        <Heading>Actions</Heading>
        <div className="hero-actions">
          <Button variant="primary">
            <Plus size={16} />
            Import music
          </Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Quiet action</Button>
          <Button variant="danger">Remove</Button>
          <Button disabled>Unavailable</Button>
          <IconButton label="Favorite">
            <Heart size={18} />
          </IconButton>
        </div>
      </section>
      <section className="chart-card form-stack">
        <Heading>Form controls</Heading>
        <label>
          Playlist name
          <Field placeholder="After hours" />
        </label>
        <Select aria-label="Example select">
          <option>Midnight Studio</option>
          <option>Analog Soul</option>
        </Select>
        <Slider
          label="Example volume"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
        />
        <label className="check-label">
          <Field type="checkbox" />
          Reduced motion
        </label>
      </section>
      <section className="chart-card">
        <Heading>Artwork & dialogs</Heading>
        <div className="hero-actions">
          <Artwork title="Generated local fallback" />
          <Button onClick={() => setOpen(true)}>Open accessible dialog</Button>
        </div>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Your space"
        description="Keyboard focus stays inside this dialog. Escape closes it."
      >
        <Button variant="primary" onClick={() => setOpen(false)}>
          Done
        </Button>
      </Modal>
    </div>
  )
}
