import { useEffect, useState } from 'react'

interface HealthResponse {
  status: string
  service: string
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const checkHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${apiUrl}/health`)
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }
      const data: HealthResponse = await response.json()
      setHealth(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex justify-center p-4">
      <main className="w-full max-w-[430px] flex flex-col items-center pt-10 pb-8 px-6 bg-neutral-950/80 border border-neutral-800 rounded-3xl shadow-2xl my-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4 shadow-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">BeatToons</h1>
          <p className="text-sm text-neutral-400">Mobile-First Music Challenge Platform</p>
        </div>

        {/* Status card */}
        <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
              Backend Status
            </span>
            <span className="text-xs text-neutral-500 font-mono">{apiUrl}</span>
          </div>

          <div className="flex items-center justify-center py-4">
            {loading ? (
              <div className="flex items-center gap-2 text-neutral-400 text-sm">
                <span className="inline-block w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                Checking API connection...
              </div>
            ) : health ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium text-sm shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                API Connected
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  Connection Failed
                </div>
                {error && (
                  <p className="text-xs text-rose-300/90 max-w-[280px] break-words mt-1">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>

          {health && (
            <div className="mt-2 pt-3 border-t border-neutral-800 text-xs text-neutral-400 flex justify-between">
              <span>Service:</span>
              <span className="text-neutral-200 font-mono font-medium">{health.service}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={checkHealth}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Recheck Connection
        </button>

        {/* Footer info */}
        <p className="text-xs text-neutral-500 text-center mt-6">
          Step 1 Scaffolding · CIMFEST Hackathon 2026
        </p>
      </main>
    </div>
  )
}
