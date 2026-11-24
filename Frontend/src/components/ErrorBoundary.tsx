import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in BeatToons:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F43F5E]/20 flex items-center justify-center text-[#F43F5E] text-3xl mb-4">
            ⚠️
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-neutral-400 max-w-md mb-6 text-sm">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-full bg-[#F43F5E] hover:bg-[#e11d48] text-white font-medium text-sm transition"
            >
              Refresh App
            </button>
            <button
              onClick={() => {
                localStorage.clear()
                window.location.href = '/'
              }}
              className="px-5 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm transition"
            >
              Reset Cache & Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
