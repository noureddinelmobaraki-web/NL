import React from 'react';
import { useForceDesktopViewport } from '../hooks/useForceDesktopViewport';

interface DesktopViewportProviderProps {
  desktopWidth?: number;
  children: React.ReactNode;
}

/** غلاف يُفعّل "وضع سطح المكتب" طوال عرض ما بداخله. */
export const DesktopViewportProvider: React.FC<DesktopViewportProviderProps> = ({
  desktopWidth = 1024,
  children,
}) => {
  useForceDesktopViewport(desktopWidth, true);
  return <>{children}</>;
};
