import { Component, ReactNode } from 'react';
import { isChunkLoadError } from '../utils/lazyWithRetry';
import { captureError } from '../utils/sentry';

interface Props { children: ReactNode; sectionName?: string; }
interface State { hasError: boolean; retryKey: number; autoAttempts: number; }

// أقصى عدد محاولات إعادة تركيب تلقائية لأخطاء الـ render غير الـ chunk
const MAX_AUTO_ATTEMPTS = 2;
const AUTO_RETRY_DELAY_MS = 250;

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retryKey: 0, autoAttempts: 0 };

  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // سجّل الخطأ الحقيقي دائمًا لتسهيل التشخيص
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${this.props.sectionName || 'Section'}] crashed:`, error, info);
    } else {
      console.warn(`[${this.props.sectionName || 'Section'}] crashed:`, error.message);
    }

    captureError(error, { section: this.props.sectionName });

    // تعافٍ تلقائي من فشل تحميل chunk بعد إعادة نشر: reload مرة واحدة.
    if (isChunkLoadError(error)) {
      const sentinel = 'nl_boundary_chunk_reload';
      let alreadyReloaded = false;
      try { alreadyReloaded = sessionStorage.getItem(sentinel) === '1'; } catch { /* ignore */ }
      if (!alreadyReloaded) {
        try { sessionStorage.setItem(sentinel, '1'); } catch { /* ignore */ }
        window.location.reload();
      }
      return;
    }

    // لأخطاء الـ render غير الـ chunk (وليست App): أعد التركيب تلقائيًا حتى MAX_AUTO_ATTEMPTS
    if (this.props.sectionName !== 'App' && this.state.autoAttempts < MAX_AUTO_ATTEMPTS) {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          retryKey: prev.retryKey + 1,
          autoAttempts: prev.autoAttempts + 1,
        }));
      }, AUTO_RETRY_DELAY_MS);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private handleManualRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      retryKey: prev.retryKey + 1,
      autoAttempts: 0,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.sectionName === 'App') {
        return (
          <div
            role="alert"
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              padding: '24px',
              background: '#ffffff',
              color: '#111111',
              textAlign: 'center',
              direction: 'rtl',
              fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif",
              zIndex: 999999,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(22px, 4vw, 32px)',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: '#111111',
              }}
            >
              عذراً، حدث خطأ ما
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: '420px',
                fontSize: 'clamp(14px, 2.2vw, 16px)',
                lineHeight: 1.7,
                fontWeight: 400,
                color: '#444444',
              }}
            >
              واجه التطبيق مشكلة غير متوقعة. يرجى إعادة تحميل الصفحة للمتابعة.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '8px',
                padding: '12px 28px',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'inherit',
                color: '#ffffff',
                background: '#111111',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              إعادة التحميل
            </button>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span>— section unavailable —</span>
          <button
            onClick={this.handleManualRetry}
            style={{ padding: '4px 14px', borderRadius: '9999px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            retry
          </button>
        </div>
      );
    }
    // مفتاح remount يضمن إعادة تركيب نظيفة للأبناء عند إعادة المحاولة
    return <div key={this.state.retryKey} style={{ display: 'contents' }}>{this.props.children}</div>;
  }
}
