import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '../types'
import { loginWithPhone } from '../lib/api'

interface AuthContextType {
  user: User | null
  token: string | null
  isGuest: boolean
  isLoginModalOpen: boolean
  openLoginModal: () => void
  closeLoginModal: () => void
  login: (phone: string, otp: string, displayName?: string, region?: string) => Promise<User>
  logout: () => void
  setUser: React.Dispatch<React.SetStateAction<User | null>>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isGuest: true,
  isLoginModalOpen: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  login: async () => {
    throw new Error('Not implemented')
  },
  logout: () => {},
  setUser: () => {},
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

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('beattoons_token') || null
  })

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  useEffect(() => {
    if (user && token) {
      localStorage.setItem('beattoons_user', JSON.stringify(user))
      localStorage.setItem('beattoons_token', token)
    } else {
      localStorage.removeItem('beattoons_user')
      localStorage.removeItem('beattoons_token')
    }
  }, [user, token])

  const openLoginModal = () => setIsLoginModalOpen(true)
  const closeLoginModal = () => setIsLoginModalOpen(false)

  const login = async (
    phone: string,
    otp: string,
    displayName?: string,
    region?: string
  ): Promise<User> => {
    const res = await loginWithPhone(phone, otp, displayName, region)
    setUser(res.user)
    setToken(res.access_token)
    setIsLoginModalOpen(false)
    return res.user
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('beattoons_user')
    localStorage.removeItem('beattoons_token')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isGuest: !user,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
