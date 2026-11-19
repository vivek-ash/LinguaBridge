import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ErrorBoundary:', error, info); }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200 mb-1">Something went wrong</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-sm hover:bg-white/[0.08] transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
