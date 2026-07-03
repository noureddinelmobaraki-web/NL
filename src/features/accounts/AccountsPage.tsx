import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Star, Users } from 'lucide-react';
import { AvatarFrame } from '../account/components/AvatarFrame';
import { RoleBadgeChips } from '../account/roleBadge';
import { useAccountsDirectory } from './useAccountsDirectory';
import { PublicProfilePanel } from './PublicProfilePanel';
import { AccountsBackgroundVideo } from './AccountsBackgroundVideo';
import '../../styles/components/accounts.css';
import './accounts-aero.css';

export default function AccountsPage({ onClose }: { onClose: () => void }) {
  const { rows, loading, error, search, setSearch, reload } = useAccountsDirectory();
  const [openId, setOpenId] = useState<string | null>(null);

  return createPortal(
    <div className="nl-accounts" dir="rtl">
      <AccountsBackgroundVideo />
      <header className="nl-accounts__bar">
        <div className="nl-accounts__title"><Users size={20} /> Accounts</div>
        <label className="nl-accounts__search">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for user..." />
        </label>
        <button type="button" className="nl-accounts__close" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </header>

      {error && <p className="nl-accounts__error">{error}</p>}
      {loading ? (
        <p className="nl-accounts__hint">Loading...…</p>
      ) : rows.length === 0 ? (
        <p className="nl-accounts__hint">No matching accounts.</p>
      ) : (
        <div className="nl-accounts__grid">
          {rows.map((u) => (
            <button type="button" key={u.id} className="nl-acc-card nl-acct-card" onClick={() => setOpenId(u.id)}>
              <AvatarFrame frame={u.frame} size={72}>
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" />
                  : <span className="nl-acc-card__ph">{(u.display_name || 'NL').slice(0, 2).toUpperCase()}</span>}
              </AvatarFrame>
              <span className="nl-acc-card__name">{u.display_name || 'User'}</span>
              <RoleBadgeChips role={u.role} badge={u.badge} />
              <span className={`nl-acc-card__stars${u.starred_by_me ? ' is-on' : ''}`}>
                <Star size={13} fill={u.starred_by_me ? 'currentColor' : 'none'} /> {u.star_count}
              </span>
            </button>
          ))}
        </div>
      )}

      {openId && <PublicProfilePanel id={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </div>,
    document.body,
  );
}
