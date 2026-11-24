/**
 * Audio Utilities & Web Audio API Demo Safety Net (NFR-2, NFR-8)
 *
 * Provides:
 * 1. resolveClipUrl: maps backend placeholder URLs to local offline assets (/assets/audio/song1.mp3, song2.mp3)
 * 2. AfrobeatsSynthEngine: lightweight procedural drum & bass synthesizer using pure Web Audio API
 *    guaranteeing playable rhythmic audio even if external MP3 files fail to load during live hackathon demos.
 */

export function resolveClipUrl(url?: string, songIdOrTitle?: string): string {
  if (!url) return '/assets/audio/song1.mp3'

  // If already pointing to a local public asset
  if (url.startsWith('/assets/audio/')) {
    return url
  }

  const str = `${url} ${songIdOrTitle || ''}`.toLowerCase()

  // Map placeholders, non-existent domains, or external Pixabay URLs to local demo songs
  if (
    str.includes('assets.beattoons.app') ||
    str.includes('placeholder') ||
    str.includes('pixabay') ||
    str.includes('example.com')
  ) {
    if (
      str.includes('yaounde') ||
      str.includes('bikutsi') ||
      str.includes('song2') ||
      str.includes('0002')
    ) {
      return '/assets/audio/song2.mp3'
    }
    return '/assets/audio/song1.mp3'
  }

  return url
}

/**
 * Procedural Web Audio API Afrobeats / Makossa Synthesizer
 * Zero external audio files required. Uses native browser AudioContext oscillators and noise buffers.
 */
export class AfrobeatsSynthEngine {
  private ctx: AudioContext | null = null
  private isRunning: boolean = false
  private timerId: ReturnType<typeof setTimeout> | null = null
  private nextNoteTime: number = 0
  private step: number = 0
  private bpm: number = 115

  start(bpm: number = 115) {
    this.bpm = bpm || 115
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (!this.ctx) return

    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    if (this.isRunning) return
    this.isRunning = true
    this.step = 0
    this.nextNoteTime = this.ctx.currentTime + 0.05
    this.scheduler()
  }

  stop() {
    this.isRunning = false
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  private scheduler = () => {
    if (!this.isRunning || !this.ctx) return

    // Schedule up to 100ms in advance
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.playStep(this.step, this.nextNoteTime)
      // Step duration is a 16th note = 60 / (bpm * 4)
      const secondsPerBeat = 60.0 / Math.max(this.bpm, 60)
      const stepDuration = secondsPerBeat / 4
      this.nextNoteTime += stepDuration
      this.step = (this.step + 1) % 16
    }
    this.timerId = setTimeout(this.scheduler, 25)
  }

  private playStep(step: number, time: number) {
    if (!this.ctx) return

    // Makossa / Afrobeats 16-step rhythmic pattern:
    // Kick: Beat 1 (0), Beat 2.5 syncopation (6), Beat 3.5 syncopation (10)
    const isKick = step === 0 || step === 6 || step === 10

    // Snare / Rimshot: Beat 2 (4), Beat 4 (12), light ghost note (14)
    const isSnare = step === 4 || step === 12
    const isGhostSnare = step === 14

    // Shaker / Hi-Hat: Every 8th/16th off-beat
    const isShaker = step % 2 === 1

    // Bassline: Syncopated Makossa root/fourth/fifth groove
    const isBass = step === 0 || step === 4 || step === 8 || step === 10

    if (isKick) {
      this.playKick(time)
    }
    if (isSnare) {
      this.playSnare(time, 0.28)
    } else if (isGhostSnare) {
      this.playSnare(time, 0.1)
    }
    if (isShaker) {
      this.playShaker(time)
    }
    if (isBass) {
      // Makossa Bass Frequencies (C2 ~65Hz, F2 ~87Hz, G2 ~98Hz, Eb2 ~77Hz)
      const pitches = [65.4, 87.3, 98.0, 77.8]
      const freq = pitches[Math.floor(step / 4) % pitches.length]
      this.playBass(time, freq)
    }
  }

  private playKick(time: number) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'

    // Pitch sweep for deep punchy Cameroon kick
    osc.frequency.setValueAtTime(140, time)
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.16)

    gain.gain.setValueAtTime(0.35, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(time)
    osc.stop(time + 0.22)
  }

  private playSnare(time: number, volume: number) {
    if (!this.ctx) return

    // Tonal body
    const osc = this.ctx.createOscillator()
    const toneGain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(190, time)
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1)

    toneGain.gain.setValueAtTime(volume * 0.45, time)
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11)

    osc.connect(toneGain)
    toneGain.connect(this.ctx.destination)
    osc.start(time)
    osc.stop(time + 0.12)

    // Noise crack
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.1)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(1100, time)

    const noiseGain = this.ctx.createGain()
    noiseGain.gain.setValueAtTime(volume * 0.55, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12)

    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(this.ctx.destination)

    noise.start(time)
    noise.stop(time + 0.13)
  }

  private playShaker(time: number) {
    if (!this.ctx) return
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(7500, time)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.12, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)

    noise.start(time)
    noise.stop(time + 0.05)
  }

  private playBass(time: number, freq: number) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, time)

    gain.gain.setValueAtTime(0.24, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(time)
    osc.stop(time + 0.28)
  }
}

