/**
 * Audio Utilities & Web Audio Story SFX Engine (NFR-2, NFR-8)
 *
 * Provides:
 * 1. resolveClipUrl: maps backend placeholder URLs to local offline assets (/assets/audio/song1.mp3, song2.mp3)
 * 2. StorySFXEngine: crisp, high-fidelity Web Audio API sound effects for short storytelling cues
 *    (phone_ding, gasp, comedy_slip, applause) layered cleanly over real MP3 song playback.
 */

import type { StorySFX } from '../types'

export function resolveClipUrl(url?: string, songIdOrTitle?: string): string {
  const str = `${url || ''} ${songIdOrTitle || ''}`.toLowerCase()

  // Prioritize Kocee — We Di Go Na Go demo audio
  if (
    str.includes('kocee') ||
    str.includes('go na go') ||
    str.includes('we di go')
  ) {
    return '/assets/audio/kocee_we_di_go_na_go.mp3'
  }

  if (!url) return '/assets/audio/kocee_we_di_go_na_go.mp3'

  // If already pointing to a local public asset
  if (url.startsWith('/assets/audio/')) {
    return url
  }

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
 * Storytelling Sound Effects (SFX) Engine using Web Audio API
 * Generates instant, clean, zero-latency acoustic cues for comic animations.
 */
class StorySFXEngine {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  play(sfx?: StorySFX) {
    if (!sfx || sfx === 'none') return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime

    switch (sfx) {
      case 'phone_ding':
        this.playPhoneDing(ctx, now)
        break
      case 'gasp':
        this.playGasp(ctx, now)
        break
      case 'comedy_slip':
        this.playComedySlip(ctx, now)
        break
      case 'applause':
        this.playApplause(ctx, now)
        break
    }
  }

  private playPhoneDing(ctx: AudioContext, time: number) {
    // Dual bell crystal chime (E6 ~1318.5Hz + B6 ~1975.5Hz)
    const pitches = [1318.5, 1975.5]
    pitches.forEach((freq, idx) => {
      const t = time + idx * 0.08
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)

      gain.gain.setValueAtTime(0, time)
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(t)
      osc.stop(t + 0.6)
    })
  }

  private playGasp(ctx: AudioContext, time: number) {
    // Quick breathy noise inhalation swell
    const dur = 0.35
    const bufferSize = Math.floor(ctx.sampleRate * dur)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI)
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(700, time)
    filter.frequency.exponentialRampToValueAtTime(1700, time + dur * 0.8)
    filter.Q.setValueAtTime(3.5, time)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.02, time)
    gain.gain.linearRampToValueAtTime(0.28, time + dur * 0.5)
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(time)
    noise.stop(time + dur + 0.02)
  }

  private playComedySlip(ctx: AudioContext, time: number) {
    // Cartoon slide-whistle downward swoop + floor bounce
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'

    // Swoop down from 880Hz to 130Hz
    osc.frequency.setValueAtTime(880, time)
    osc.frequency.exponentialRampToValueAtTime(130, time + 0.42)

    gain.gain.setValueAtTime(0.3, time)
    gain.gain.linearRampToValueAtTime(0.35, time + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(time)
    osc.stop(time + 0.48)

    // Comedic floor thud
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thud.type = 'triangle'
    thud.frequency.setValueAtTime(85, time + 0.4)
    thud.frequency.exponentialRampToValueAtTime(32, time + 0.58)

    thudGain.gain.setValueAtTime(0.35, time + 0.4)
    thudGain.gain.exponentialRampToValueAtTime(0.001, time + 0.6)

    thud.connect(thudGain)
    thudGain.connect(ctx.destination)

    thud.start(time + 0.4)
    thud.stop(time + 0.62)
  }

  private playApplause(ctx: AudioContext, time: number) {
    // Multi-burst cheering and clapping simulation
    const clapCount = 16
    for (let c = 0; c < clapCount; c++) {
      const clapTime = time + Math.random() * 0.85
      const clapDur = 0.045 + Math.random() * 0.03
      const bufferSize = Math.floor(ctx.sampleRate * clapDur)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1200 + Math.random() * 1400, clapTime)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.16 + Math.random() * 0.12, clapTime)
      gain.gain.exponentialRampToValueAtTime(0.001, clapTime + clapDur)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start(clapTime)
      noise.stop(clapTime + clapDur + 0.01)
    }
  }
}

export const storySFX = new StorySFXEngine()
