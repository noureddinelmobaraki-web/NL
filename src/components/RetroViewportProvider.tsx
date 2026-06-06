import React from 'react';
import { useRetroViewport } from '../hooks/useRetroViewport';

interface RetroViewportProviderProps {
  /** العرض المنطقي للصفحة الـ Retro (افتراضي 1024px). */
  desktopWidth?: number;
  children: React.ReactNode;
}

/**
 * مكوّن غلاف يُفعّل سلوك "وضع سطح المكتب" تلقائياً طوال فترة عرض المحتوى بداخله.
 * 
 * الاستخدام:
 *   <RetroViewportProvider>
 *     <YourRetroPage />
 *   </RetroViewportProvider>
 */
export const RetroViewportProvider: React.FC<RetroViewportProviderProps> = ({
  desktopWidth = 1024,
  children,
}) => {
  useRetroViewport(desktopWidth, true);
  return <>{children}</>;
};
