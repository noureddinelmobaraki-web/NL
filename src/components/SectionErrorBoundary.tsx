import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; sectionName?: string; }
interface State { hasError: boolean; }

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // FIXED: Issue #10 — Added detailed logging for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${this.props.sectionName || 'Section'}] crashed:`, error, info);
    } else {
      console.warn(`[${this.props.sectionName || 'Section'}] crashed:`, error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.sectionName === 'App') {
        return (
          <div style={{ 
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            padding: '20px',
            textAlign: 'center',
            background: '#080a14',
            color: '#fff',
            fontFamily: 'sans-serif'
          }}>
            <h2 style={{ fontSize: '24px', margin: 0 }}>عذراً، حدث خطأ ما</h2>
            <p style={{ opacity: 0.7, maxWidth: '400px' }}>
              واجه التطبيق مشكلة غير متوقعة. يرجى محاولة إعادة تحميل الصفحة.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                background: '#fff',
                color: '#080a14',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              إعادة التحميل
            </button>
          </div>
        );
      }

      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          — section unavailable —
        </div>
      );
    }
    return this.props.children;
  }
}
