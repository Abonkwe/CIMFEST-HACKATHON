import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { donateViaFapshi, fetchFapshiPaymentStatus } from '../lib/api'
import type { FapshiMedium } from '../types'

export interface FapshiDonateModalProps {
  isOpen: boolean
  onClose: () => void
  artistId: string
  artistName: string
  songTitle?: string
  creationId?: string
}

const QUICK_AMOUNTS = [200, 500, 1000, 2500] as const

type ModalStep = 'form' | 'pending' | 'success' | 'error'

export const FapshiDonateModal: React.FC<FapshiDonateModalProps> = ({
  isOpen,
  onClose,
  artistId,
  artistName,
  songTitle,
  creationId,
}) => {
  const { user, token, openLoginModal } = useAuth()

  const [medium, setMedium] = useState<FapshiMedium>('mobile money')
  const [amountXaf, setAmountXaf] = useState<number>(500)
  const [customAmount, setCustomAmount] = useState<string>('500')
  const [phone, setPhone] = useState<string>('')

  const [step, setStep] = useState<ModalStep>('form')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [txId, setTxId] = useState<string | null>(null)
  const [fapshiTransId, setFapshiTransId] = useState<string | null>(null)
  const [netCreditedXaf, setNetCreditedXaf] = useState<number>(500)

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setErrorMsg(null)
      setTxId(null)
      setFapshiTransId(null)
      setAmountXaf(500)
      setCustomAmount('500')
      setPhone(user?.phone || '+237')
    } else if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [isOpen, user?.phone])

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  const startPollingStatus = (transactionId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetchFapshiPaymentStatus(transactionId)
        const statusUpper = String(res.status || '').toUpperCase()
        if (statusUpper === 'SUCCESSFUL') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
          }
          if (res.net_amount_xaf) {
            setNetCreditedXaf(res.net_amount_xaf)
          }
          setStep('success')
        } else if (statusUpper === 'FAILED' || statusUpper === 'EXPIRED') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
          }
          setErrorMsg('Mobile Money payment was cancelled or expired. Please try again.')
          setStep('error')
        }
      } catch {
        // Keep polling transiently if a single check fails
      }
    }, 2000)
  }

  const handleSelectQuickAmount = (val: number) => {
    setAmountXaf(val)
    setCustomAmount(String(val))
  }

  const handleCustomAmountChange = (raw: string) => {
    setCustomAmount(raw)
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      setAmountXaf(parsed)
    } else {
      setAmountXaf(0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!user || !token) {
      openLoginModal('Sign in to tip an artist via Mobile Money')
      return
    }

    if (!amountXaf || amountXaf < 100) {
      setErrorMsg('Minimum tip is 100 XAF.')
      return
    }

    const digits = phone.replace(/\D/g, '')
    if (digits.length < 9) {
      setErrorMsg('Enter a valid 9-digit Cameroon Mobile Money number.')
      return
    }

    setSubmitting(true)
    try {
      const res = await donateViaFapshi(
        {
          artist_id: artistId,
          creation_id: creationId,
          amount_xaf: amountXaf,
          phone,
          medium,
        },
        token
      )
      setTxId(res.transaction_id)
      setFapshiTransId(res.fapshi_trans_id)
      setNetCreditedXaf(res.net_amount_xaf || amountXaf)
      setStep('pending')
      startPollingStatus(res.transaction_id)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not initiate Mobile Money donation.')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#121212] border border-[#536D56]/50 shadow-2xl text-white my-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#536D56]/30 via-neutral-900 to-[#FACC15]/15 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#FACC15]">
              Fapshi Mobile Money Tip
            </div>
            <h3 className="text-lg font-black text-white truncate">
              Support {artistName}
            </h3>
            {songTitle && (
              <p className="text-xs text-neutral-400 truncate">Track: {songTitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Medium Picker: MTN MoMo vs Orange Money */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  1. Choose Mobile Money Network
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMedium('mobile money')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-2.5 ${
                      medium === 'mobile money'
                        ? 'border-[#FFCC00] bg-[#FFCC00]/15 shadow-[0_0_15px_rgba(255,204,0,0.2)]'
                        : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                    }`}
                  >
                    <span className="w-8 h-8 rounded-xl bg-[#FFCC00] text-neutral-950 font-black text-xs flex items-center justify-center shrink-0">
                      MTN
                    </span>
                    <div>
                      <div className="text-xs font-black text-white">MTN MoMo</div>
                      <div className="text-[10px] text-neutral-400">67 / 68 / 650–654</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMedium('orange money')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-2.5 ${
                      medium === 'orange money'
                        ? 'border-[#FF7900] bg-[#FF7900]/15 shadow-[0_0_15px_rgba(255,121,0,0.2)]'
                        : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                    }`}
                  >
                    <span className="w-8 h-8 rounded-xl bg-[#FF7900] text-white font-black text-xs flex items-center justify-center shrink-0">
                      OM
                    </span>
                    <div>
                      <div className="text-xs font-black text-white">Orange Money</div>
                      <div className="text-[10px] text-neutral-400">69 / 655–659</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quick XAF Pills + Custom Amount */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  2. Tip Amount (XAF)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((val) => {
                    const active = amountXaf === val
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectQuickAmount(val)}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                          active
                            ? 'bg-[#FACC15] text-neutral-950 border-[#FACC15] shadow'
                            : 'bg-neutral-900 text-neutral-200 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {val.toLocaleString()}
                      </button>
                    )
                  })}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="Custom amount (min 100 XAF)"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-2.5 pr-14 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#FACC15]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    XAF
                  </span>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  3. Mobile Money Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+237 670 000 000"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#536D56]"
                />
                <p className="text-[10px] text-neutral-400">
                  100% goes to the artist&apos;s Vault (voting remains free for everyone).
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                  medium === 'mobile money'
                    ? 'bg-[#FFCC00] hover:bg-[#ffd633] text-neutral-950'
                    : 'bg-[#FF7900] hover:bg-[#ff8c24] text-white'
                }`}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Sending Prompt...</span>
                  </>
                ) : (
                  <>
                    <span>💛</span>
                    <span>Send {amountXaf ? amountXaf.toLocaleString() : 0} XAF Tip</span>
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'pending' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#FACC15]/15 border-2 border-[#FACC15] flex items-center justify-center">
                <span className="w-8 h-8 border-4 border-[#FACC15] border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-white">
                  Waiting for Mobile Money PIN Confirmation...
                </h4>
                <p className="text-xs text-neutral-400">
                  Approve the{' '}
                  <strong className="text-white">
                    {medium === 'mobile money' ? 'MTN MoMo' : 'Orange Money'}
                  </strong>{' '}
                  prompt of <strong className="text-[#FACC15]">{amountXaf.toLocaleString()} XAF</strong> on{' '}
                  <span className="font-mono text-white">{phone}</span>.
                </p>
              </div>
              {fapshiTransId && (
                <div className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-3 py-1.5 rounded-xl inline-block border border-neutral-800">
                  Ref: {fapshiTransId}
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl">
                ✓
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Payment Confirmed
                </div>
                <h4 className="text-xl font-black text-white mt-0.5">
                  {netCreditedXaf.toLocaleString()} XAF Deposited!
                </h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Your tip was credited directly to <strong className="text-white">{artistName}</strong>&apos;s Vault.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Network</span>
                  <span className="font-bold text-white capitalize">{medium}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Vault Credit</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{netCreditedXaf.toLocaleString()} XAF
                  </span>
                </div>
                {fapshiTransId && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Fapshi ID</span>
                    <span className="font-mono text-neutral-300">{fapshiTransId}</span>
                  </div>
                )}
                {txId && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Receipt</span>
                    <span className="font-mono text-neutral-400 truncate max-w-[180px]">{txId}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-[#536D56] hover:bg-[#607d64] text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="py-5 text-center space-y-4">
              <div className="text-3xl">⚠️</div>
              <p className="text-xs text-red-300">{errorMsg}</p>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
