import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockSingle = vi.fn().mockResolvedValue({
  data: { display_name: 'نور', avatar_url: null, bio: 'مرحبا' },
  error: null,
})
const mockUpload = vi.fn().mockResolvedValue({ error: null })
const mockGetPublicUrl = vi.fn(() => ({
  data: { publicUrl: 'https://x.supabase.co/storage/v1/object/public/avatars/u1/1.png' },
}))

vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
      update: mockUpdate,
    })),
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
  isSupabaseConfigured: true,
}))

const mockCloseProfile = vi.fn()
const mockSignOut = vi.fn().mockResolvedValue({ ok: true })

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'noureddinelmobaraki@gmail.com' },
    closeProfile: mockCloseProfile,
    signOut: mockSignOut,
  }),
}))

vi.mock('../../music/store/musicStore', () => ({
  useMusicStore: (selector: (s: any) => any) =>
    selector({
      favorites: ['fv-1', 'fv-2'],
      playlists: [
        { id: 'pl-1', name: 'تجربة', trackIds: [], createdAt: 0 },
      ],
    }),
}))

vi.mock('../useMovieItems', () => ({
  useMovieItems: () => ({
    favoriteCount: 5,
    watchedCount: 0,
    watchlistCount: 0,
    has: () => false,
    toggle: vi.fn(),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(() => {
  cleanup()
})

async function renderProfile() {
  const ProfilePage = (await import('../ProfilePage')).default
  render(<ProfilePage />)
}

describe('features/account/ProfilePage', () => {
  it('يعرض الهوية ويحمّل بيانات الملف', async () => {
    await renderProfile()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('noureddinelmobaraki@gmail.com')).toBeTruthy()
    await waitFor(() =>
      expect((screen.getByLabelText('الاسم الظاهر') as HTMLInputElement).value).toBe('نور'),
    )
  })

  it('الحفظ يستدعي update على جدول profiles', async () => {
    await renderProfile()
    await waitFor(() => expect(mockSingle).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'u1')
  })

  it('رفع صورة يحدّث avatar_url', async () => {
    await renderProfile()
    await waitFor(() => expect(mockSingle).toHaveBeenCalled())
    const file = new File(['x'], 'pic.png', { type: 'image/png' })
    const input = document.querySelector('.profile-avatar__input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ avatar_url: expect.any(String) }),
      ),
    )
  })

  it('تسجيل الخروج يستدعي signOut ثم يغلق', async () => {
    await renderProfile()
    await waitFor(() => expect(screen.getByLabelText('الاسم الظاهر')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockCloseProfile).toHaveBeenCalled())
  })

  it('يعرض عدادات الإحصائيات من المتجر', async () => {
    await renderProfile()
    await waitFor(() => expect(screen.getByLabelText('الاسم الظاهر')).toBeTruthy())

    // favCount = 2 (من الـ mock)
    expect(screen.getByText('2')).toBeTruthy()
    // plCount = 1 (من الـ mock)
    expect(screen.getByText('1')).toBeTruthy()
    // favoriteCount = 5 (من الـ mock)
    expect(screen.getByText('5')).toBeTruthy()

    // التحقق من التسميات
    expect(screen.getByText('أغنية مفضلة')).toBeTruthy()
    expect(screen.getByText('قائمة تشغيل')).toBeTruthy()
    expect(screen.getByText('فيلم مفضل')).toBeTruthy()
  })
})
