/** Audio enhancement chain: 5-band equaliser, preamp, bass/treble, loudness compressor, room reverb and stereo width. Copyright (c) 2026 Develofer2. MIT License. */
export interface AudioSettings {
  enabled: boolean
  preset: string
  bands: number[]
  preamp: number
  bass: number
  treble: number
  room: number
  width: number
  loudness: boolean
}
export const bandFrequencies = [60, 230, 910, 3600, 14000]
export const bandLabels = ["60 Hz", "230 Hz", "910 Hz", "3.6 kHz", "14 kHz"]
type PresetValues = Partial<Omit<AudioSettings, "enabled" | "preset">>
export const flat: AudioSettings = {
  enabled: true,
  preset: "Flat",
  bands: [0, 0, 0, 0, 0],
  preamp: 0,
  bass: 0,
  treble: 0,
  room: 0,
  width: 0,
  loudness: false,
}
export const presets: Record<string, PresetValues> = {
  Flat: {},
  Studio: { bands: [1, 0, 0, 1.5, 2], room: 0.18, width: 0.35, loudness: true },
  "Bass boost": { bands: [6, 4, 0, 0, 0], bass: 4, loudness: true },
  "Vocal clarity": { bands: [-2, 0, 3, 3, 1], width: 0.1 },
  "Treble lift": { bands: [-1, 0, 0, 3, 6], treble: 3 },
  Cinema: { bands: [4, 2, -1, 1, 3], room: 0.35, width: 0.7, loudness: true },
  "Concert hall": { bands: [1, 0, 1, 2, 2], room: 0.6, width: 0.5 },
  "Late night": { bands: [-3, -1, 1, 1, -2], loudness: true },
  "Warm lo-fi": { bands: [3, 2, 0, -3, -7], treble: -4, room: 0.1 },
}
export function applyPreset(name: string, base: AudioSettings): AudioSettings {
  return { ...flat, ...presets[name], enabled: base.enabled, preset: name }
}
export function normalise(value?: Partial<AudioSettings>): AudioSettings {
  const v = { ...flat, ...value }
  const clamp = (n: unknown, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, Number.isFinite(Number(n)) ? Number(n) : 0))
  return {
    enabled: v.enabled !== false,
    preset: typeof v.preset === "string" ? v.preset.slice(0, 40) : "Custom",
    bands: bandFrequencies.map((_, i) => clamp(v.bands?.[i], -12, 12)),
    preamp: clamp(v.preamp, -12, 6),
    bass: clamp(v.bass, -8, 8),
    treble: clamp(v.treble, -8, 8),
    room: clamp(v.room, 0, 1),
    width: clamp(v.width, 0, 1),
    loudness: !!v.loudness,
  }
}
function impulse(context: AudioContext) {
  const length = Math.floor(context.sampleRate * 1.8),
    buffer = context.createBuffer(2, length, context.sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3)
  }
  return buffer
}
export class AudioChain {
  readonly input: GainNode
  readonly output: GainNode
  private preamp: GainNode
  private filters: BiquadFilterNode[]
  private bass: BiquadFilterNode
  private treble: BiquadFilterNode
  private compressor: DynamicsCompressorNode
  private dry: GainNode
  private wet: GainNode
  private splitter: ChannelSplitterNode
  private merger: ChannelMergerNode
  private cross: GainNode[]
  private direct: GainNode[]
  constructor(private context: AudioContext) {
    this.input = context.createGain()
    this.output = context.createGain()
    this.preamp = context.createGain()
    this.filters = bandFrequencies.map((f, i) => {
      const n = context.createBiquadFilter()
      n.type = i === 0 ? "lowshelf" : i === 4 ? "highshelf" : "peaking"
      n.frequency.value = f
      n.Q.value = 1
      return n
    })
    this.bass = context.createBiquadFilter()
    this.bass.type = "lowshelf"
    this.bass.frequency.value = 120
    this.treble = context.createBiquadFilter()
    this.treble.type = "highshelf"
    this.treble.frequency.value = 8000
    this.compressor = context.createDynamicsCompressor()
    this.dry = context.createGain()
    this.wet = context.createGain()
    const convolver = context.createConvolver()
    convolver.buffer = impulse(context)
    this.splitter = context.createChannelSplitter(2)
    this.merger = context.createChannelMerger(2)
    this.direct = [context.createGain(), context.createGain()]
    this.cross = [context.createGain(), context.createGain()]
    let node: AudioNode = this.input
    for (const n of [this.preamp, ...this.filters, this.bass, this.treble]) {
      node.connect(n)
      node = n
    }
    node.connect(this.compressor)
    this.compressor.connect(this.splitter)
    this.splitter.connect(this.direct[0], 0)
    this.splitter.connect(this.direct[1], 1)
    this.splitter.connect(this.cross[0], 1)
    this.splitter.connect(this.cross[1], 0)
    this.direct[0].connect(this.merger, 0, 0)
    this.direct[1].connect(this.merger, 0, 1)
    this.cross[0].connect(this.merger, 0, 0)
    this.cross[1].connect(this.merger, 0, 1)
    this.merger.connect(this.dry)
    this.merger.connect(convolver)
    convolver.connect(this.wet)
    this.dry.connect(this.output)
    this.wet.connect(this.output)
  }
  apply(settings: AudioSettings) {
    const s = normalise(settings),
      on = s.enabled,
      t = this.context.currentTime,
      set = (p: AudioParam, v: number) => p.setTargetAtTime(v, t, 0.03)
    set(this.preamp.gain, Math.pow(10, (on ? s.preamp : 0) / 20))
    this.filters.forEach((f, i) => set(f.gain, on ? s.bands[i] : 0))
    set(this.bass.gain, on ? s.bass : 0)
    set(this.treble.gain, on ? s.treble : 0)
    const comp = on && s.loudness
    set(this.compressor.threshold, comp ? -26 : 0)
    set(this.compressor.ratio, comp ? 4 : 1)
    set(this.compressor.knee, comp ? 20 : 0)
    const room = on ? s.room : 0
    set(this.wet.gain, room * 0.6)
    set(this.dry.gain, 1 - room * 0.25)
    const width = on ? s.width : 0
    set(this.cross[0].gain, -width * 0.35)
    set(this.cross[1].gain, -width * 0.35)
    set(this.direct[0].gain, 1 + width * 0.15)
    set(this.direct[1].gain, 1 + width * 0.15)
  }
}
