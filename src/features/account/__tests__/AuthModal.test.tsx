import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const mockSignInWithPassword = vi.fn().mockResolvedValue({ error: null })
const mockSignUp = vi.fn().mockResolvedValue({ error: null })
const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null })
const mockVerifyOtp = vi.fn().mockResolvedValue({ error: null })
const mockSignInWithOAuth = vi.fn().mockResolvedValue({ error: null })
const mockResetPasswordForEmail = vi.fn().mockResolvedValue({ error: null })
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } })
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      signInWithOAuth: mockSignInWithOAuth,
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
    from: vi.fn(),
  })),
}))

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
})

afterEach(() => {
  cleanup()
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

async function renderModal() {
  const { AuthProvider } = await import('../../../context/AuthContext')
  const AuthModal = (await import('../AuthModal')).default
  render(
    <AuthProvider>
      <AuthModal />
    </AuthProvider>,
  )
}

describe('features/account/AuthModal', () => {
  it('يعرض النافذة وأزرار المزوّدين', async () => {
    await renderModal()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('المتابعة عبر Google')).toBeTruthy()
    expect(screen.getByText('المتابعة عبر GitHub')).toBeTruthy()
  })

  it('دخول بالبريد وكلمة السر يستدعي signInWithPassword', async () => {
    await renderModal()
    fireEvent.change(screen.getByPlaceholderText('البريد الإلكتروني'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('كلمة السر'), {
      target: { value: 'secret123' },
    })
    const submitBtn = screen.getAllByRole('button', { name: 'دخول' }).find(btn => btn.getAttribute('type') === 'submit')!
    fireEvent.click(submitBtn)
    await waitFor(() =>
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'secret123',
      }),
    )
  })

  it('إرسال رمز OTP ثم تأكيده', async () => {
    await renderModal()
    fireEvent.change(screen.getByPlaceholderText('البريد الإلكتروني'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.click(
      screen.getByText('الدخول برمز عبر البريد بدل كلمة السر'),
    )
    await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByPlaceholderText('••••••'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الرمز' }))
    await waitFor(() =>
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'a@b.com',
        token: '123456',
        type: 'email',
      }),
    )
  })

  it('أزرار OAuth تستدعي signInWithOAuth', async () => {
    await renderModal()
    fireEvent.click(screen.getByText('المتابعة عبر Google'))
    await waitFor(() =>
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' }),
      ),
    )
  })

  it('نسيت كلمة السر يستدعي resetPasswordForEmail', async () => {
    await renderModal()
    fireEvent.change(screen.getByPlaceholderText('البريد الإلكتروني'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.click(screen.getByText('نسيت كلمة السر؟'))
    await waitFor(() =>
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.objectContaining({ redirectTo: expect.any(String) }),
      ),
    )
  })
})
