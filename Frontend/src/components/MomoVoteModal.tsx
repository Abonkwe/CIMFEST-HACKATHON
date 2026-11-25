import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Creation } from '../types'

interface MomoVoteModalProps {
  creation: Creation | null
  defaultPhone?: string
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onConfirmPayAndVote: (payment: { momo_phone: string; amount_xaf: number }) => Promise<void>
}

const VOTE_AMOUNTS = [
  { amount: 100, label: '100 XAF', tag: 'Standard Vote' },
  { amount: 200, label: '200 XAF', tag: 'Fan Boost' },
  { amount: 500, label: '500 XAF', tag: 'Super Fan' },
  { amount: 1000, label: '1,000 XAF', tag: 'VIP Support' },
]

export const MomoVoteModal: React.FC<MomoVoteModalProps> = ({
  creation,
  defaultPhone = '',
  isSubmitting,
  error,
  onClose,
  onConfirmPayAndVote,
}) => {
  const [momoPhone, setMomoPhone] = useState(defaultPhone)
  const [amountXaf, setAmountXaf] = useState<number>(100)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (creation) {
      setMomoPhone(defaultPhone || '')
      setAmountXaf(100)
      setLocalError(null)
    }
  }, [creation, defaultPhone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const cleaned = momoPhone.replace(/[\s\-()]+/g, '').trim()
    if (!cleaned) {
      setLocalError('Please enter your MTN Mobile Money number.')
      return
    }

    await onConfirmPayAndVote({
      momo_phone: cleaned,
      amount_xaf: amountXaf,
    })
  }

  const displayError = localError || error

  return (
    <AnimatePresence>
      {creation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={isSubmitting ? undefined : onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#121212] border border-neutral-800 shadow-2xl overflow-hidden"
          >
            {/* Header with MTN MoMo Branding */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#FFCC00]/20 via-[#FFCC00]/10 to-transparent border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFCC00] text-neutral-950 font-black text-xs flex items-center justify-center shadow-md">
                  MTN
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Pay & Cast Vote
                  </h3>
                  <p className="text-[11px] font-semibold text-[#FFCC00]">
                    MTN Mobile Money (MoMo) Required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Target Creation Summary */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-neutral-400 font-medium">Voting for creation by</p>
                  <p className="text-sm font-bold text-white truncate">
                    {creation.creator_display_name || 'Creator'}
                  </p>
                  <p className="text-xs text-[#FACC15] truncate">
                    {creation.song?.title || 'Challenge Entry'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-[#FFCC00]/15 border border-[#FFCC00]/40 text-[#FFCC00] text-xs font-extrabold">
                    {amountXaf} XAF
                  </span>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Select Vote Contribution (XAF)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {VOTE_AMOUNTS.map((opt) => {
                    const selected = amountXaf === opt.amount
                    return (
                      <button
                        key={opt.amount}
                        type="button"
                        onClick={() => setAmountXaf(opt.amount)}
                        disabled={isSubmitting}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          selected
                            ? 'bg-[#FFCC00]/15 border-[#FFCC00] text-white'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="text-sm font-black">{opt.label}</div>
                        <div className="text-[11px] text-neutral-400">{opt.tag}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* MTN MoMo Phone Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="momo-phone"
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-400"
                >
                  MTN MoMo Phone Number
                </label>
                <input
                  id="momo-phone"
                  type="tel"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  placeholder="+237 670 000 001"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 focus:border-[#FFCC00] focus:outline-none text-sm text-white placeholder-neutral-500"
                />
                <p className="text-[11px] text-neutral-500">
                  Confirm the payment prompt on your MTN MoMo line (*126#). Your vote is only
                  counted after payment is confirmed.
                </p>
              </div>

              {displayError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium">
                  {displayError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#FFCC00] hover:bg-[#f5c400] text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Confirming MTN MoMo...</span>
                    </>
                  ) : (
                    <span>Pay {amountXaf} XAF & Cast Vote</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
