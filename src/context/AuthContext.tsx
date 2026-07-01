import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
  lazy,
  Suspense,
  type ReactNode,
} from 'react'
import type { Session, User, SupabaseClient } from '@supabase/supabase-js'
import AuthLauncher from '../features/account/AuthLauncher'
import { startKeepAlive, stopKeepAlive } from '../config/supabaseKeepAlive'

// النافذتان تُحمّلان كسولًا — خارج الحزمة الأولية
const AuthModal = lazy(() => import('../features/account/AuthModal'))
const ProfilePage = lazy(() => import('../features/account/ProfilePage'))
const SongFavoritesSync = lazy(() => import('../features/account/SongFavoritesSync'))
import '../styles/components/profile-orb.css';
import '../styles/components/bubble-system.css';

// فحص خفيف لا يستورد supabase-js
const isConfigured: boolean = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    (import.meta.env.MODE !== 'test' ||
      import.meta.env.VITE_SUPABASE_URL === 'https://example.supabase.co'),
)

// عنوان العودة بعد OAuth / تأكيد البريد = جذر الموقع مع مسار القاعدة (/NL/)
function getRedirectTo(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}`
}

export type OAuthProvider = 'google' | 'github'

export interface AuthResult {
  ok: boolean
  error?: string
}

export interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  isConfigured: boolean
  // تحكّم نافذة الدخول
  isAuthModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  // تحكّم نافذة الملف الشخصي
  isProfileOpen: boolean
  openProfile: () => void
  closeProfile: () => void
  // دوال المصادقة
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>
  signUpWithPassword: (email: string, password: string) => Promise<AuthResult>
  sendEmailOtp: (email: string) => Promise<AuthResult>
  verifyEmailOtp: (email: string, token: string) => Promise<AuthResult>
  signInWithOAuth: (provider: OAuthProvider) => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  signOut: () => Promise<AuthResult>
}

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  error: 'ميزات الحساب غير مفعّلة حاليًا.',
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(isConfigured)
  const [isAuthModalOpen, setAuthModalOpen] = useState(false)
  const [isProfileOpen, setProfileOpen] = useState(false)

  // عميل supabase محمّل كسولًا ومخزّن في ref
  const clientRef = useRef<SupabaseClient | null>(null)
  const playlistsSyncStopRef = useRef<null | (() => void)>(null)
  const getClient = useCallback(async (): Promise<SupabaseClient | null> => {
    if (!isConfigured) return null
    if (clientRef.current) return clientRef.current
    const { supabase } = await import('../config/supabase')
    clientRef.current = supabase
    return supabase
  }, [])

  // استعادة الجلسة + الاستماع للتغيّرات
  useEffect(() => {
    if (!isConfigured) return
    let mounted = true
    let unsubscribe: (() => void) | undefined

    void (async () => {
      try {
        const client = await getClient()
        if (!client) return
        const { data } = await client.auth.getSession()
        if (!mounted) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
        
        if (data.session?.user) {
          startKeepAlive()
        }

        const { data: sub } = client.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession)
          setUser(newSession?.user ?? null)
          if (newSession?.user) {
            startKeepAlive()
          } else {
            stopKeepAlive()
          }
        })
        unsubscribe = () => sub.subscription.unsubscribe()
      } catch (err) {
        console.warn('[Auth] تعذّر تهيئة جلسة Supabase:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
      unsubscribe?.()
      stopKeepAlive()
    }
  }, [getClient])

  // Warm the auth UI chunks + supabase client so the modal opens instantly.
  useEffect(() => {
    if (!isConfigured) return;
    const warm = () => {
      import('../features/account/AuthModal').catch(() => {});
      import('../features/account/ProfilePage').catch(() => {});
      void getClient();
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (ric) { const id = ric(warm); return () => (window as unknown as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(id); }
    const t = window.setTimeout(warm, 1200); return () => window.clearTimeout(t);
  }, [getClient]);

  // إغلاق نافذة الدخول تلقائيًا عند نجاح تسجيل الدخول
  useEffect(() => {
    if (user) setAuthModalOpen(false)
  }, [user])

  // إغلاق الملف الشخصي تلقائيًا عند الخروج (user أصبح null)
  useEffect(() => {
    if (!user) setProfileOpen(false)
  }, [user])

  // [P-Playlists] تفعيل مزامنة قوائم تشغيل الموسيقى حسب دورة حياة المستخدم
  useEffect(() => {
    let cancelled = false

    if (playlistsSyncStopRef.current) {
      try { playlistsSyncStopRef.current() } catch { /* تجاهل */ }
      playlistsSyncStopRef.current = null
    }

    if (!user) return

    ;(async () => {
      try {
        const mod = await import('../features/account/sync/musicPlaylistsSync')
        if (cancelled) return
        console.debug('[sync] starting musicPlaylistsSync for user', user.id)
        const stop = await mod.startMusicPlaylistsSync(user.id)
        if (cancelled) {
          if (typeof stop === 'function') stop()
          return
        }
        if (typeof stop === 'function') playlistsSyncStopRef.current = stop
      } catch (err) {
        console.warn('[sync] musicPlaylistsSync فشل في البدء:', err)
      }
    })()

    return () => {
      cancelled = true
      if (playlistsSyncStopRef.current) {
        try { playlistsSyncStopRef.current() } catch { /* تجاهل */ }
        playlistsSyncStopRef.current = null
      }
    }
  }, [user])

  const openAuthModal = useCallback(() => setAuthModalOpen(true), [])
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), [])
  const openProfile = useCallback(() => setProfileOpen(true), [])
  const closeProfile = useCallback(() => setProfileOpen(false), [])

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const client = await getClient()
      if (!client) return NOT_CONFIGURED
      const { error } = await client.auth.signInWithPassword({ email, password })
      return error ? { ok: false, error: error.message } : { ok: true }
    },
    [getClient],
  )

  const signUpWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const client = await getClient()
      if (!client) return NOT_CONFIGURED
      const { error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: getRedirectTo() },
      })
      return error ? { ok: false, error: error.message } : { ok: true }
    },
    [getClient],
  )

  const sendEmailOtp = useCallback(
    async (email: string): Promise<AuthResult> => {
      const client = await getClient()
      if (!client) return NOT_CONFIGURED
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: getRedirectTo() },
      })
      return error ? { ok: false, error: error.message } : { ok: true }
    },
    [getClient],
  )

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<AuthResult> => {
      const client = await getClient()
      if (!client) return NOT_CONFIGURED
      const { error } = await client.auth.verifyOtp({ email, token, type: 'email' })
      return error ? { ok: false, error: error.message } : { ok: true }
    },
    [getClient],
  )

  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider): Promise<AuthResult> => {
      const client = await getClient()
      if (!client) return NOT_CONFIGURED
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: getRedirectTo() },
      })
      return error ? { ok: false, error: error.message } : { ok: true }
    },
    [getClient],
  )

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      const client = await getClient()
      if (!client) return NOT_CONFIGURED
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectTo(),
      })
      return error ? { ok: false, error: error.message } : { ok: true }
    },
    [getClient],
  )

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const client = await getClient()
    if (!client) return NOT_CONFIGURED
    const { error } = await client.auth.signOut()
    return error ? { ok: false, error: error.message } : { ok: true }
  }, [getClient])

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      loading,
      isConfigured,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      isProfileOpen,
      openProfile,
      closeProfile,
      signInWithPassword,
      signUpWithPassword,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithOAuth,
      resetPassword,
      signOut,
    }),
    [
      session,
      user,
      loading,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      isProfileOpen,
      openProfile,
      closeProfile,
      signInWithPassword,
      signUpWithPassword,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithOAuth,
      resetPassword,
      signOut,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isConfigured && (
        <>
          <AuthLauncher />
        </>
      )}
      {isConfigured && (
        <Suspense fallback={null}>
          <SongFavoritesSync />
        </Suspense>
      )}
      {isConfigured && isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      )}
      {isConfigured && isProfileOpen && (
        <Suspense fallback={null}>
          <ProfilePage />
        </Suspense>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// نسخة اختيارية لا ترمي خطأً إن غاب المزوّد (تستخدمها الفقاعة بأمان داخل اختباراتها).
export function useAuthOptional(): AuthContextType | undefined {
  return useContext(AuthContext)
}
