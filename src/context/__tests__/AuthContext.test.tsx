import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, renderHook } from '@testing-library/react'

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

// عميل supabase وهمي (لا اتصال حقيقي)
function mockSupabaseModule() {
  const getSession = vi.fn().mockResolvedValue({ data: { session: null } })
  const unsubscribe = vi.fn()
  const onAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe } },
  }))
  vi.doMock('../../config/supabase', () => ({
    isSupabaseConfigured: true,
    supabase: { auth: { getSession, onAuthStateChange } },
  }))
  return { getSession, onAuthStateChange, unsubscribe }
}

describe('context/AuthContext', () => {
  it('عند ضبط Supabase: يستعيد الجلسة ثم loading=false', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    const { getSession } = mockSupabaseModule()

    const { AuthProvider, useAuth } = await import('../AuthContext')

    function Probe() {
      const { loading, user } = useAuth()
      return <div>{loading ? 'loading' : `ready:${user ? 'user' : 'guest'}`}</div>
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText('ready:guest')).toBeTruthy())
    expect(getSession).toHaveBeenCalledTimes(1)
  })

  it('بدون ضبط Supabase: loading=false ولا يستدعي getSession', async () => {
    // لا نضبط متغيّرات البيئة → isConfigured=false
    const { getSession } = mockSupabaseModule()

    const { AuthProvider, useAuth } = await import('../AuthContext')

    function Probe() {
      const { loading, isConfigured } = useAuth()
      return <div>{loading ? 'loading' : `ready:${String(isConfigured)}`}</div>
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText('ready:false')).toBeTruthy())
    expect(getSession).not.toHaveBeenCalled()
  })

  it('useAuth خارج المزوّد يرمي خطأ', async () => {
    const { useAuth } = await import('../AuthContext')
    expect(() => renderHook(() => useAuth())).toThrow()
  })
})
