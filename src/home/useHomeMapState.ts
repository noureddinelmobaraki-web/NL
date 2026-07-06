// src/home/useHomeMapState.ts
// حالة خفيفة للخريطة: المحطّة النشطة حالياً (للوصولية/الروابط العميقة مستقبلاً).
import { create } from 'zustand';

interface HomeMapState {
  activeStationId: string | null;
  setActiveStation: (id: string | null) => void;
}

export const useHomeMapState = create<HomeMapState>((set) => ({
  activeStationId: null,
  setActiveStation: (id) =>
    set((s) => (s.activeStationId === id ? s : { activeStationId: id })),
}));
