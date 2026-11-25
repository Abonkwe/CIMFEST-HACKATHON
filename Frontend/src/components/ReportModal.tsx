import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { submitReport } from '../lib/api'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  targetType: 'creation' | 'song'
  targetId: string
  targetTitle?: string
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}) => {
  const { user, token, openLoginModal } = useAuth()
  const { t } = useLanguage()

  const [reason, setReason] = useState('Inappropriate or offensive content')
  const [customNotes, setCustomNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !user) {
      openLoginModal('Sign in to report content')
      return
    }

    setLoading(true)
    setError(null)

    const finalReason = customNotes.trim()
      ? `${reason} - ${customNotes.trim()}`
      : reason

    try {
      await submitReport(
        {
          target_type: targetType,
          target_id: targetId,
          reason: finalReason,
        },
        token
      )
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-[#121212] border border-[#536D56]/50 rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/30 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{t('reportModalTitle')}</h3>
            <p className="text-xs text-neutral-400 capitalize">
              {targetType}: {targetTitle || targetId.slice(0, 8)}
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-white">Report Submitted</h4>
            <p className="text-xs text-neutral-400">Our Cameroon moderation team has received your report.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                {t('reportReasonLabel')}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56]"
              >
                <option value="Inappropriate or offensive content">{t('reasonInappropriate')}</option>
                <option value="Copyright infringement / unlicensed audio">{t('reasonCopyright')}</option>
                <option value="Spam or malicious behavior">{t('reasonSpam')}</option>
                <option value="Other violation">{t('reasonOther')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Additional Notes (Optional)
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={3}
                placeholder="Describe any specifics..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#536D56]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs font-semibold cursor-pointer transition"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-full bg-[#F43F5E] hover:bg-rose-600 text-white text-xs font-semibold shadow-md cursor-pointer transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : t('submitReport')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

