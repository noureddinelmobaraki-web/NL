import { describe, it, expect, vi } from 'vitest'

// منع أي اتصال حقيقي: نستبدل createClient بنسخة وهمية
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {},
    from: vi.fn(),
  })),
}))

describe('config/supabase', () => {
  it('يصدّر عميلًا معرّفًا', async () => {
    const mod = await import('../supabase')
    expect(mod.supabase).toBeDefined()
  })

  it('يصدّر علم isSupabaseConfigured كقيمة منطقية', async () => {
    const mod = await import('../supabase')
    expect(typeof mod.isSupabaseConfigured).toBe('boolean')
  })
})
