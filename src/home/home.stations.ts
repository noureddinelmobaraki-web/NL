// src/home/home.stations.ts
// سجلّ الخريطة: ترتيب المحطّات وجهة كل نافذة/خيط. البيانات (node) تُمرَّر وقت
// التشغيل من MainApp، فنكتفي هنا بالأنواع + خريطة الجهات + دالة اختيار الجهة.
import type { ReactNode } from 'react';

export type StationSide = 'left' | 'right';

export interface HomeStationInput {
  // معرّف مستقر: profile | streaming | highlights | gallery | songs | contact | drawings ...
  id: string;
  // عقدة القسم الأصلية كما هي (تُغلَّف، لا تُعاد كتابتها).
  node: ReactNode;
  // بلا كروم نافذة (للفواصل/العناصر العارية).
  bare?: boolean;
}

// الجهة الافتراضية لكل محطّة معروفة (يمين/يسار العمود المركزي).
export const STATION_SIDES: Record<string, StationSide> = {
  profile: 'right',
  bio: 'left',
  streaming: 'left',
  social: 'right',
  highlights: 'left',
  gallery: 'right',
  songs: 'left',
  contact: 'right',
  drawings: 'left',
};

export function sideFor(id: string, index: number): StationSide {
  return STATION_SIDES[id] ?? (index % 2 === 0 ? 'right' : 'left');
}
