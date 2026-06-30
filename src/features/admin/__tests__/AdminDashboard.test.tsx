import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup }           from '@testing-library/react';

const { OWNER_EMAIL, OTHER_EMAIL } = vi.hoisted(() => ({
  OWNER_EMAIL: 'noureddinelmobaraki@gmail.com',
  OTHER_EMAIL: 'other@example.com'
}));

vi.mock('../../../config/admin', () => ({
  ADMIN_EMAIL: OWNER_EMAIL,
  isAdmin: (email: string | null | undefined) => email === OWNER_EMAIL,
}));

vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../useAdminStats', () => ({
  useAdminStats: () => ({
    stats: {
      total_users: 42, total_song_favorites: 100,
      total_movie_favorites: 25, total_watched: 18,
      total_watchlist: 12, total_playlists: 7,
    },
    topSongs:  [],
    topMovies: [],
    loading:   false,
    error:     null,
  }),
}));

import { useAuth }         from '../../../context/AuthContext';
import { AdminDashboard }  from '../AdminDashboard';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('AdminDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders nothing when user is not admin', () => {
    mockUseAuth.mockReturnValue({ user: { email: OTHER_EMAIL } });
    const { container } = render(<AdminDashboard onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { container } = render(<AdminDashboard onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dashboard for admin user', () => {
    mockUseAuth.mockReturnValue({ user: { email: OWNER_EMAIL } });
    render(<AdminDashboard onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Admin Dashboard')).toBeTruthy();
  });

  it('displays all stat cards for admin', () => {
    mockUseAuth.mockReturnValue({ user: { email: OWNER_EMAIL } });
    render(<AdminDashboard onClose={() => {}} />);
    expect(screen.getByText('Total Users')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Song Favorites')).toBeTruthy();
    expect(screen.getByText('Movie Favorites')).toBeTruthy();
  });

  it('calls onClose when X button is clicked', async () => {
    const onClose = vi.fn();
    mockUseAuth.mockReturnValue({ user: { email: OWNER_EMAIL } });
    const { getByRole } = render(<AdminDashboard onClose={onClose} />);
    getByRole('button', { name: /close admin/i }).click();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
