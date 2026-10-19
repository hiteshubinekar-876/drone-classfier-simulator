import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Simulator ErrorBoundary] Uncaught error caught by boundary:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleSafeRecovery = (): void => {
    try {
      // Clear potentially corrupted transient settings while preserving IndexedDB session history
      localStorage.removeItem('drone_sim_settings');
    } catch {}
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0c1417 0%, #131f24 50%, #070c0e 100%)',
            color: '#e4efec',
            fontFamily: "'Inter', sans-serif",
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              background: 'rgba(23, 35, 41, 0.95)',
              border: '1px solid #d96c6c',
              borderRadius: '8px',
              padding: '32px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.75rem',
                color: '#d96c6c',
                letterSpacing: '0.12em',
                marginBottom: '8px'
              }}
            >
              SUBSYSTEM ERROR // AUTOMATED FAILSAFE ENGAGED
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px' }}>
              Simulator Recovery Mode
            </h2>

            <p style={{ fontSize: '0.86rem', color: '#b9c8c7', lineHeight: 1.5, marginBottom: '20px' }}>
              The application encountered an unexpected runtime exception. You can reload the simulator or restart in clean recovery mode.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: 'rgba(12, 20, 23, 0.8)',
                  border: '1px solid rgba(217, 108, 108, 0.3)',
                  borderRadius: '4px',
                  padding: '12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.72rem',
                  color: '#d96c6c',
                  textAlign: 'left',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  marginBottom: '24px'
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: '#8dd9c0',
                  color: '#0c1417',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                RELOAD APPLICATION
              </button>
              <button
                onClick={this.handleSafeRecovery}
                style={{
                  background: 'rgba(36, 57, 64, 0.85)',
                  color: '#e4efec',
                  border: '1px solid rgba(141, 217, 192, 0.2)',
                  borderRadius: '4px',
                  padding: '10px 18px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                SAFE RECOVERY RESTART
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
