import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

// App-wide error boundary. A render error in any screen would otherwise white-screen
// the whole PWA for a driver parked at a truck stop; this catches it and offers a
// one-tap reload instead.
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced in the console for field debugging; a real logger (Sentry) can hook in here later.
    console.error('App error boundary caught:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f0f0f0' }}>
        <div
          className="w-full max-w-sm p-6 text-center"
          style={{ background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '8px', boxShadow: '4px 4px 0 #1a1a2e' }}
        >
          <p className="font-mono uppercase tracking-widest text-xs mb-2" style={{ color: '#c0392b' }}>
            Something went wrong
          </p>
          <h1 className="font-extrabold text-2xl mb-3" style={{ color: '#1a1a2e' }}>
            TruckPay hit a snag
          </h1>
          <p className="font-mono text-sm mb-5" style={{ color: '#555' }}>
            Your data is safe. Reload to get back to work.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full font-extrabold uppercase tracking-wide"
            style={{
              background: '#f0a500',
              color: '#1a1a2e',
              border: '2px solid #1a1a2e',
              borderRadius: '4px',
              minHeight: '48px',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
