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
  owner:    { label: 'Owner',  color: '#ff7a1a', Icon: Crown },
  admin:    { label: 'Admin',    color: '#ff4d6d', Icon: ShieldCheck },
  mod:      { label: 'Moderator',    color: '#37b6ff', Icon: Shield },
  vip:      { label: 'VIP',     color: '#ffd34d', Icon: Star },
  verified: { label: 'Verified',   color: '#3cdc82', Icon: BadgeCheck },
  lord:        { label: 'The Lord',               color: '#FF2A2A', Icon: Sun },
  god:         { label: 'god',                color: '#FF5C00', Icon: Atom },
  prophet:     { label: 'Prophet',                color: '#FF8A00', Icon: BookOpen },
  tree:        { label: 'Tree',               color: '#FFB000', Icon: TreePine },
  general:     { label: 'General',              color: '#FFD400', Icon: Medal },
  caid:        { label: 'Leader',               color: '#F2FF00', Icon: Swords },
  maalem:      { label: 'Master',               color: '#B4FF00', Icon: GraduationCap },
  molchi:      { label: 'The Boss',           color: '#6EFF00', Icon: Package },
  molchkara:   { label: 'The Funder',        color: '#22FF5D', Icon: Coins },
  darsa:       { label: 'The Tough',             color: '#00FF9C', Icon: Axe },
  rajel:       { label: 'The Man',             color: '#00FFD5', Icon: PersonStanding },
  sardi:       { label: 'The Purebred',             color: '#00E0FF', Icon: Bird },
  charjan:     { label: 'Sergeant',             color: '#00A6FF', Icon: BatteryCharging },
  familyhead:  { label: 'Family Head of the Site', color: '#2D74FF', Icon: Castle },
  mqwed:       { label: 'Badass',               color: '#4A3AFF', Icon: Compass },
  doublehlouf: { label: 'Stubborn',          color: '#7A2BFF', Icon: Beef },
  hlouf:       { label: 'Pig',               color: '#A64DFF', Icon: Drumstick },
  moqaddem:    { label: 'Supervisor',               color: '#D14DFF', Icon: Flag },
};
export const BADGE_DEFS: Record<string, Def> = {
  founder: { label: 'Founder',          color: '#a06bff', Icon: Flame },
  early:   { label: 'Early Member',      color: '#37b6ff', Icon: Sparkles },
  pro:     { label: 'Professional',         color: '#ff7a1a', Icon: Zap },
  legend:  { label: 'Legend',        color: '#ffd34d', Icon: Trophy },
  music:   { label: 'Music Lover', color: '#3cdc82', Icon: Music },
  cinema:  { label: 'Cinephile',       color: '#ff4d6d', Icon: Film },
  laatay:    { label: 'Snitch',      color: '#FF00D4', Icon: Gift },
  zamel:     { label: 'Jerk',        color: '#FF1FA0', Icon: Anchor },
  zlal:      { label: 'Greedy',      color: '#FF2E6E', Icon: Droplet },
  rasharba:  { label: 'Spearhead',  color: '#FF3D5A', Icon: Sword },
  labdlabiq: { label: 'Runaway Slave', color: '#FF6E3D', Icon: Footprints },
  rassouq:   { label: 'Top Market',     color: '#FF9E3D', Icon: Store },
  chiyata:   { label: 'Leftover',       color: '#E8C400', Icon: Brush },
  lion:      { label: 'Lion',       color: '#9CE000', Icon: PawPrint },
  nohasad:   { label: 'No Envy', color: '#26E0A6', Icon: Eye },
  abiqa:     { label: 'Abiqah',       color: '#00C2C7', Icon: Bug },
  si:        { label: 'Mr.',          color: '#1E90FF', Icon: UserCheck },
  elmqwed:   { label: 'Badass',      color: '#6C5CE7', Icon: LifeBuoy },
  khachay:   { label: 'Intruder',      color: '#B15CFF', Icon: Hammer },
  hlouthqba: { label: 'Sweet',  color: '#FF5CE1', Icon: Target },
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
