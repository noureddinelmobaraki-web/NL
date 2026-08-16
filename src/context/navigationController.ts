export type PageId = 'home' | 'games' | 'cinema' | 'tv' | 'retro' | 'xp' | 'music' | 'accounts' | 'portrait';
export type CinemaTab = 'movies' | 'series';

export interface NavState {
  activePage: PageId;        // صفحة واحدة فقط دائماً (home = لا صفحة)
  cinemaTab: CinemaTab;      // movies | series داخل صفحة cinema
  transitioning: boolean;    // قفل أثناء الانتقال لمنع التعارض
}

export type NavAction =
  | { type: 'NAVIGATE'; page: PageId; cinemaTab?: CinemaTab }
  | { type: 'TRANSITION_END' }
  | { type: 'RESET' };

export const initialNavState: NavState = {
  activePage: 'home',
  cinemaTab: 'movies',
  transitioning: false,
};

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'NAVIGATE': {
      // قفل الانتقال: تجاهل الطلبات المتتالية السريعة (يمنع السباق)
      if (state.transitioning) return state;
      const nextTab = action.cinemaTab ?? state.cinemaTab;
      const same =
        state.activePage === action.page &&
        (action.page !== 'cinema' || state.cinemaTab === nextTab);
      if (same) return state; // لا تغيير
      return { activePage: action.page, cinemaTab: nextTab, transitioning: true };
    }
    case 'TRANSITION_END':
      return state.transitioning ? { ...state, transitioning: false } : state;
    case 'RESET':
      return initialNavState;
    default:
      return state;
  }
}
