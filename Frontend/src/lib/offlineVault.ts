import type { Song } from '../types'
import { resolveClipUrl } from './audioUtils'

const DB_NAME = 'camvibe_offline_vault'
const DB_VERSION = 1
const STORE_NAME = 'songs'

export interface OfflineSongRecord {
  songId: string
  title: string
  artistName: string
  albumName: string
  genre: string
  coverUrl?: string
  bpm?: number
  durationSec?: number
  clipUrl: string
  encodedBytes: Uint8Array
  key: Uint8Array
  sizeBytes: number
  savedAt: string
}

export interface OfflineSongMeta {
  songId: string
  title: string
  artistName: string
  albumName: string
  genre: string
  coverUrl?: string
  bpm?: number
  durationSec?: number
  clipUrl: string
  sizeBytes: number
  savedAt: string
}

function notifyVaultUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camvibe-vault-updated'))
  }
}

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser.'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'songId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Failed to open Offline Vault DB'))
  })
}

function xorScramble(bytes: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length)
  const kLen = key.length
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ key[i % kLen]
  }
  return out
}

export async function saveSongOffline(song: Song): Promise<OfflineSongMeta> {
  const resolvedUrl = resolveClipUrl(song.clip_url, `${song.id} ${song.title} ${song.genre}`)
  const resp = await fetch(resolvedUrl)
  if (!resp.ok) {
    throw new Error(`Failed to fetch audio for offline vault (HTTP ${resp.status})`)
  }

  const buffer = await resp.arrayBuffer()
  const rawBytes = new Uint8Array(buffer)
  const key = new Uint8Array(32)
  crypto.getRandomValues(key)
  const encodedBytes = xorScramble(rawBytes, key)

  const record: OfflineSongRecord = {
    songId: song.id,
    title: song.title,
    artistName:
      song.artist_name ||
      song.artist?.artist_profile?.artist_name ||
      song.artist?.display_name ||
      'Verified Artist',
    albumName: (song as any).album_name || 'Single',
    genre: song.genre || 'Afropop',
    coverUrl: song.artist?.avatar_url || song.artist?.artist_profile?.avatar_url || undefined,
    bpm: song.bpm,
    durationSec: song.duration_sec,
    clipUrl: resolvedUrl,
    encodedBytes,
    key,
    sizeBytes: rawBytes.byteLength,
    savedAt: new Date().toISOString(),
  }

  const db = await openVaultDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Failed to save song to Offline Vault'))
  })
  db.close()

  notifyVaultUpdated()

  return {
    songId: record.songId,
    title: record.title,
    artistName: record.artistName,
    albumName: record.albumName,
    genre: record.genre,
    coverUrl: record.coverUrl,
    bpm: record.bpm,
    durationSec: record.durationSec,
    clipUrl: record.clipUrl,
    sizeBytes: record.sizeBytes,
    savedAt: record.savedAt,
  }
}

export async function getOfflinePlayableUrl(
  songId: string
): Promise<{ url: string; revoke: () => void } | null> {
  try {
    const db = await openVaultDB()
    const record = await new Promise<OfflineSongRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(songId)
      req.onsuccess = () => resolve(req.result as OfflineSongRecord | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()

    if (!record || !record.encodedBytes || !record.key) return null

    const decoded = xorScramble(
      new Uint8Array(record.encodedBytes),
      new Uint8Array(record.key)
    )
    const blob = new Blob([decoded.buffer as ArrayBuffer], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    return {
      url,
      revoke: () => URL.revokeObjectURL(url),
    }
  } catch {
    return null
  }
}

export async function removeSongOffline(songId: string): Promise<void> {
  const db = await openVaultDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(songId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Failed to remove offline song'))
  })
  db.close()
  notifyVaultUpdated()
}

export async function isSongOffline(songId: string): Promise<boolean> {
  try {
    const db = await openVaultDB()
    const exists = await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).getKey(songId)
      req.onsuccess = () => resolve(req.result !== undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return exists
  } catch {
    return false
  }
}

export async function listOfflineSongs(): Promise<OfflineSongMeta[]> {
  try {
    const db = await openVaultDB()
    const records = await new Promise<OfflineSongRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).getAll()
      req.onsuccess = () => resolve((req.result as OfflineSongRecord[]) || [])
      req.onerror = () => reject(req.error)
    })
    db.close()

    return records
      .map((r) => ({
        songId: r.songId,
        title: r.title,
        artistName: r.artistName,
        albumName: r.albumName,
        genre: r.genre,
        coverUrl: r.coverUrl,
        bpm: r.bpm,
        durationSec: r.durationSec,
        clipUrl: r.clipUrl,
        sizeBytes: r.sizeBytes,
        savedAt: r.savedAt,
      }))
      .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))
  } catch {
    return []
  }
}
