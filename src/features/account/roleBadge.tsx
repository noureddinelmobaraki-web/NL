import type { CSSProperties, ComponentType } from 'react';
import {
  Crown, ShieldCheck, Shield, Star, BadgeCheck,
  Flame, Sparkles, Zap, Trophy, Music, Film,
} from 'lucide-react';

interface Def { label: string; color: string; Icon: ComponentType<{ size?: number }>; }

export const ROLE_DEFS: Record<string, Def> = {
  owner:    { label: 'المالك',  color: '#ff7a1a', Icon: Crown },
  admin:    { label: 'أدمن',    color: '#ff4d6d', Icon: ShieldCheck },
  mod:      { label: 'مشرف',    color: '#37b6ff', Icon: Shield },
  vip:      { label: 'VIP',     color: '#ffd34d', Icon: Star },
  verified: { label: 'موثّق',   color: '#3cdc82', Icon: BadgeCheck },
};
export const BADGE_DEFS: Record<string, Def> = {
  founder: { label: 'مؤسس',          color: '#a06bff', Icon: Flame },
  early:   { label: 'عضو مبكر',      color: '#37b6ff', Icon: Sparkles },
  pro:     { label: 'محترف',         color: '#ff7a1a', Icon: Zap },
  legend:  { label: 'أسطورة',        color: '#ffd34d', Icon: Trophy },
  music:   { label: 'عاشق الموسيقى', color: '#3cdc82', Icon: Music },
  cinema:  { label: 'سينيفيل',       color: '#ff4d6d', Icon: Film },
};
export const ROLE_OPTIONS = Object.keys(ROLE_DEFS);
export const BADGE_OPTIONS = Object.keys(BADGE_DEFS);

export function RoleBadgeChips({ role, badge }: { role?: string | null; badge?: string | null }) {
  if (!role && !badge) return null;
  const r = role ? ROLE_DEFS[role] : null;
  const b = badge ? BADGE_DEFS[badge] : null;
  return (
    <span className="rb-chips">
      {role && (
        <span className="rb-chip" style={{ '--rb': r?.color ?? '#8b909a' } as CSSProperties}>
          {r ? <r.Icon size={12} /> : null}{r?.label ?? role}
        </span>
      )}
      {badge && (
        <span className="rb-chip" style={{ '--rb': b?.color ?? '#8b909a' } as CSSProperties}>
          {b ? <b.Icon size={12} /> : null}{b?.label ?? badge}
        </span>
      )}
    </span>
  );
}
