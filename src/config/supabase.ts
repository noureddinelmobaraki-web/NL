import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * عميل Supabase المفرد (singleton) لكامل التطبيق.
 *
 * - المفاتيح تُحقن وقت البناء من أسرار GitHub Actions عبر import.meta.env.
 * - المفتاح المستخدم هو "publishable" (آمن للمتصفح). لا تستخدم مفتاح secret هنا أبدًا.
 * - لا نوقف الموقع لو غابت المتغيّرات؛ يبقى الزائر يعمل بكامل الميزات،
 *   وتُعطَّل ميزات الحساب فقط (نتحقق عبر isSupabaseConfigured).
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** هل تم ضبط بيانات الاتصال بشكل صحيح؟ */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && supabaseAnonKey,
)

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // تحذير في وضع التطوير فقط — لا يظهر للمستخدم النهائي
  console.warn(
    '[Supabase] VITE_SUPABASE_URL أو VITE_SUPABASE_ANON_KEY غير مضبوطين — ميزات الحساب معطّلة.',
  )
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      // تخزين الجلسة محليًا حتى يبقى المستخدم مسجّلًا بعد إعادة التحميل
      persistSession: true,
      // تحديث رمز الجلسة تلقائيًا قبل انتهائه
      autoRefreshToken: true,
      // ضروري لإكمال تدفّق OAuth (Google/GitHub) عند العودة إلى الموقع
      detectSessionInUrl: true,
      // تدفّق PKCE هو الأنسب لتطبيقات SPA الثابتة على GitHub Pages
      flowType: 'pkce',
    },
    global: {
      fetch: (...args) => fetch(...args),
    },
  },
)
