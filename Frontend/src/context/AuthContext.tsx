import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ArtistProfile, User } from '../types'
import { fetchMe, loginWithPhone, updateMyProfile } from '../lib/api'

interface AuthContextType {
  user: User | null
  artistProfile: ArtistProfile | null
  token: string | null
  isGuest: boolean
  isLoginModalOpen: boolean
  loginReason: string | null
  openLoginModal: (reasonMessage?: string) => void
  closeLoginModal: () => void
  login: (phone: string, otp: string, displayName?: string, region?: string) => Promise<User>
  updateProfile: (payload: { display_name?: string; region?: string }) => Promise<User>
  logout: () => void
  refreshMe: () => Promise<{ user: User; artist_profile: ArtistProfile | null } | null>
  setUser: React.Dispatch<React.SetStateAction<User | null>>
  setArtistProfile: React.Dispatch<React.SetStateAction<ArtistProfile | null>>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  artistProfile: null,
  token: null,
  isGuest: true,
  isLoginModalOpen: false,
  loginReason: null,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  login: async () => {
    throw new Error('Not implemented')
  },
  updateProfile: async () => {
    throw new Error('Not implemented')
  },
  logout: () => {},
  refreshMe: async () => null,
  setUser: () => {},
  setArtistProfile: () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('beattoons_user')
    if (savedUser) {
      try {
        return JSON.parse(savedUser)
      } catch {
        return null
      }
    }
    return null
  })

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(() => {
    const savedProfile = localStorage.getItem('beattoons_artist_profile')
    if (savedProfile) {
      try {
        return JSON.parse(savedProfile)
      } catch {
        return null
      }
    }
    return null
  })

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('beattoons_token') || null
  })

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [loginReason, setLoginReason] = useState<string | null>(null)

  useEffect(() => {
    if (user && token) {
      localStorage.setItem('beattoons_user', JSON.stringify(user))
      localStorage.setItem('beattoons_token', token)
    } else {
      localStorage.removeItem('beattoons_user')
      localStorage.removeItem('beattoons_token')
    }
  }, [user, token])

  useEffect(() => {
    if (artistProfile && token) {
      localStorage.setItem('beattoons_artist_profile', JSON.stringify(artistProfile))
    } else {
      localStorage.removeItem('beattoons_artist_profile')
    }
  }, [artistProfile, token])

  const logout = useCallback(() => {
    setUser(null)
    setArtistProfile(null)
    setToken(null)
    localStorage.removeItem('beattoons_user')
    localStorage.removeItem('beattoons_artist_profile')
    localStorage.removeItem('beattoons_token')
  }, [])

  const refreshMe = useCallback(async () => {
    if (!token) return null
    try {
      const data = await fetchMe(token)
      setUser(data.user)
      setArtistProfile(data.artist_profile ?? null)
      return data
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        logout()
      }
      return null
    }
  }, [token, logout])

  useEffect(() => {
    if (token) {
      void refreshMe()
    }
  }, [token, refreshMe])

  const openLoginModal = useCallback((reasonMessage?: string) => {
    const cleanReason =
      typeof reasonMessage === 'string' && reasonMessage.trim() ? reasonMessage.trim() : null
    setLoginReason(cleanReason)
    setIsLoginModalOpen(true)
  }, [])

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false)
    setLoginReason(null)
  }, [])

  const login = async (
    phone: string,
    otp: string,
    displayName?: string,
    region?: string
  ): Promise<User> => {
    const res = await loginWithPhone(phone, otp, displayName, region)
    setUser(res.user)
    setArtistProfile(res.artist_profile ?? null)
    setToken(res.access_token)
    setIsLoginModalOpen(false)
    setLoginReason(null)
    return res.user
  }

  const updateProfile = async (payload: {
    display_name?: string
    region?: string
  }): Promise<User> => {
    if (!token) {
      throw new Error('Authentication required')
    }
    const res = await updateMyProfile(payload, token)
    setUser(res.user)
    if (res.artist_profile !== undefined) {
      setArtistProfile(res.artist_profile ?? null)
    }
    return res.user
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        artistProfile,
        token,
        isGuest: !user,
        isLoginModalOpen,
        loginReason,
        openLoginModal,
        closeLoginModal,
        login,
        updateProfile,
        logout,
        refreshMe,
        setUser,
        setArtistProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
