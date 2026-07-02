import type { CSSProperties, ComponentType } from 'react';
import {
  Crown, ShieldCheck, Shield, Star, BadgeCheck,
  Flame, Sparkles, Zap, Trophy, Music, Film,
  Sun, Atom, BookOpen, TreePine, Medal, Swords, GraduationCap, Package, Coins, Axe,
  PersonStanding, Bird, BatteryCharging, Castle, Compass, Beef, Drumstick, Flag,
  Gift, Anchor, Droplet, Sword, Footprints, Store, Brush, PawPrint, Eye, Bug,
  UserCheck, LifeBuoy, Hammer, Target,
} from 'lucide-react';

interface Def { label: string; color: string; Icon: ComponentType<{ size?: number }>; }

export const ROLE_DEFS: Record<string, Def> = {
  owner:    { label: 'المالك',  color: '#ff7a1a', Icon: Crown },
  admin:    { label: 'أدمن',    color: '#ff4d6d', Icon: ShieldCheck },
  mod:      { label: 'مشرف',    color: '#37b6ff', Icon: Shield },
  vip:      { label: 'VIP',     color: '#ffd34d', Icon: Star },
  verified: { label: 'موثّق',   color: '#3cdc82', Icon: BadgeCheck },
  lord:        { label: 'الرب',               color: '#FF2A2A', Icon: Sun },
  god:         { label: 'god',                color: '#FF5C00', Icon: Atom },
  prophet:     { label: 'نبي',                color: '#FF8A00', Icon: BookOpen },
  tree:        { label: 'شجرة',               color: '#FFB000', Icon: TreePine },
  general:     { label: 'جنرال',              color: '#FFD400', Icon: Medal },
  caid:        { label: 'قايد',               color: '#F2FF00', Icon: Swords },
  maalem:      { label: 'معلم',               color: '#B4FF00', Icon: GraduationCap },
  molchi:      { label: 'مول الشي',           color: '#6EFF00', Icon: Package },
  molchkara:   { label: 'مول الشكارة',        color: '#22FF5D', Icon: Coins },
  darsa:       { label: 'الضرسة',             color: '#00FF9C', Icon: Axe },
  rajel:       { label: 'الراجل',             color: '#00FFD5', Icon: PersonStanding },
  sardi:       { label: 'الصردي',             color: '#00E0FF', Icon: Bird },
  charjan:     { label: 'شارجان',             color: '#00A6FF', Icon: BatteryCharging },
  familyhead:  { label: 'رب العائلة د السيت', color: '#2D74FF', Icon: Castle },
  mqwed:       { label: 'مقود',               color: '#4A3AFF', Icon: Compass },
  doublehlouf: { label: 'دوبل حلوف',          color: '#7A2BFF', Icon: Beef },
  hlouf:       { label: 'حلوف',               color: '#A64DFF', Icon: Drumstick },
  moqaddem:    { label: 'مقدم',               color: '#D14DFF', Icon: Flag },
};
export const BADGE_DEFS: Record<string, Def> = {
  founder: { label: 'مؤسس',          color: '#a06bff', Icon: Flame },
  early:   { label: 'عضو مبكر',      color: '#37b6ff', Icon: Sparkles },
  pro:     { label: 'محترف',         color: '#ff7a1a', Icon: Zap },
  legend:  { label: 'أسطورة',        color: '#ffd34d', Icon: Trophy },
  music:   { label: 'عاشق الموسيقى', color: '#3cdc82', Icon: Music },
  cinema:  { label: 'سينيفيل',       color: '#ff4d6d', Icon: Film },
  laatay:    { label: 'العطاي',      color: '#FF00D4', Icon: Gift },
  zamel:     { label: 'زامل',        color: '#FF1FA0', Icon: Anchor },
  zlal:      { label: 'الزلال',      color: '#FF2E6E', Icon: Droplet },
  rasharba:  { label: 'راس الحربة',  color: '#FF3D5A', Icon: Sword },
  labdlabiq: { label: 'العبد الابق', color: '#FF6E3D', Icon: Footprints },
  rassouq:   { label: 'راس سوق',     color: '#FF9E3D', Icon: Store },
  chiyata:   { label: 'شياطة',       color: '#E8C400', Icon: Brush },
  lion:      { label: 'الاسد',       color: '#9CE000', Icon: PawPrint },
  nohasad:   { label: 'الهم لا حسد', color: '#26E0A6', Icon: Eye },
  abiqa:     { label: 'عبيقة',       color: '#00C2C7', Icon: Bug },
  si:        { label: 'سي',          color: '#1E90FF', Icon: UserCheck },
  elmqwed:   { label: 'المقود',      color: '#6C5CE7', Icon: LifeBuoy },
  khachay:   { label: 'الخشاي',      color: '#B15CFF', Icon: Hammer },
  hlouthqba: { label: 'حلو الثقبة',  color: '#FF5CE1', Icon: Target },
};
export const ROLE_OPTIONS = Object.keys(ROLE_DEFS);
export const BADGE_OPTIONS = Object.keys(BADGE_DEFS);

/** Split a stored badge value into individual badge keys.
 * Supports a single key ("lion") or many comma-separated keys ("lion,si,pro").
 * Backward compatible: an existing single-value string yields one chip. */
export function parseBadges(badge?: string | null): string[] {
  return (badge ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function RoleBadgeChips({ role, badge }: { role?: string | null; badge?: string | null }) {
  const badges = parseBadges(badge);
  if (!role && badges.length === 0) return null;
  const r = role ? ROLE_DEFS[role] : null;
  return (
    <span className="rb-chips">
      {role && (
        <span className="rb-chip" style={{ '--rb': r?.color ?? '#8b909a' } as CSSProperties}>
          {r ? <r.Icon size={12} /> : null}{r?.label ?? role}
        </span>
      )}
      {badges.map((key) => {
        const b = BADGE_DEFS[key];
        return (
          <span key={key} className="rb-chip" style={{ '--rb': b?.color ?? '#8b909a' } as CSSProperties}>
            {b ? <b.Icon size={12} /> : null}{b?.label ?? key}
          </span>
        );
      })}
    </span>
  );
}
