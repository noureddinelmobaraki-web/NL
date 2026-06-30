import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

const mockOpenAuthModal = vi.fn()
let mockUser: { id: string } | null = null

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    openAuthModal: mockOpenAuthModal,
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUser = null
})

async function renderLauncher() {
  const AuthLauncher = (await import('../AuthLauncher')).default
  render(<AuthLauncher />)
}

describe('features/account/AuthLauncher', () => {
  it('يظهر للزائر ويفتح نافذة الدخول عند النقر', async () => {
    mockUser = null
    await renderLauncher()
    const btn = screen.getByRole('button', { name: 'تسجيل الدخول' })
    fireEvent.click(btn)
    expect(mockOpenAuthModal).toHaveBeenCalledTimes(1)
  })

  it('لا يظهر للمستخدم المسجَّل', async () => {
    mockUser = { id: 'u1' }
    await renderLauncher()
    expect(screen.queryByRole('button', { name: 'تسجيل الدخول' })).toBeNull()
  })
})
