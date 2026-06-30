import { useEffect, useState, useSyncExternalStore, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UserRound } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { useBubbleAvoidance } from '../../system/useBubbleAvoidance';

function useActivePage(): string {
  return useSyncExternalStore(
    (cb) => {
      const el = document.documentElement;
      const obs = new MutationObserver(cb);
      obs.observe(el, { attributes: true, attributeFilter: ['data-active-page'] });
      return () => obs.disconnect();
    },
    () => document.documentElement.dataset.activePage ?? 'welcome',
    () => 'welcome',
  );
}

interface Props { variant?: 'auto' | 'hero' | 'gate' | 'welcome'; }

export function ProfileOrb({ variant = 'auto' }: Props) {
  const { user, openAuthModal, openProfile } = useAuth();
  const activePage = useActivePage();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const docked = variant === 'auto';
  useBubbleAvoidance(btnRef, docked); // PART C — only the fixed docked orb dodges buttons

  useEffect(() => {
    if (!user) { setAvatarUrl(null); setName(''); return; }
    let alive = true;
    supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (!alive || !data) return;
        setAvatarUrl((data as { avatar_url: string | null }).avatar_url);
        setName((data as { display_name: string | null }).display_name ?? '');
      });
    return () => { alive = false; };
  }, [user]);

  // The global (auto) orb is hidden on the welcome screen — the gate handles entry.
  if (variant === 'auto' && activePage === 'welcome') return null;

  const onClick = () => { if (user) openProfile(); else openAuthModal(); };
  const initials = (name || 'NL').slice(0, 2).toUpperCase();
  const cls = variant === 'auto'
    ? ' is-docked'
    : variant === 'gate'
      ? ' profile-orb--gate'
      : variant === 'welcome'
        ? ' profile-orb--welcome'
        : ' profile-orb--hero';

  const orb = (
    <button
      ref={btnRef}
      data-bubble=""
      className={`profile-orb${cls}${user ? '' : ' is-guest'}`}
      onClick={onClick}
      aria-label={user ? 'فتح البروفايل' : 'تسجيل الدخول'}
    >
      <span className="profile-orb-ring" aria-hidden="true" />
      <span className="profile-orb-inner">
        {user && avatarUrl
          ? <img src={avatarUrl} alt="" />
          : user
            ? <span className="profile-orb-initials">{initials}</span>
            : <UserRound className="profile-orb-guest" strokeWidth={1.75} />}
      </span>
    </button>
  );

  return docked ? createPortal(orb, document.body) : orb;
}


