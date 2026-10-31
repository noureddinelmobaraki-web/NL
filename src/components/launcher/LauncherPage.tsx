import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LauncherBackground } from './LauncherBackground';
import { LauncherHeader } from './LauncherHeader';
import { LauncherGraph } from './LauncherGraph';
import { LauncherSound } from './LauncherSound';
import { supportsRefraction, useGlassTier } from './glass/useGlassTier';

const LazyProfileTethers = lazy(() =>
  import('./ProfileTethers').then((module) => ({ default: module.ProfileTethers })),
);

export default function LauncherPage() {
  const { isProfileOpen, isAuthModalOpen } = useAuth();
  const modalOpen = isProfileOpen || isAuthModalOpen;
  const [tethersRequested, setTethersRequested] = useState(modalOpen);
  const glassTier = useGlassTier();
  const canRefract = glassTier === 'liquid' && supportsRefraction();

  useEffect(() => {
    if (modalOpen) setTethersRequested(true);
  }, [modalOpen]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div
      className="nl-launcher-container"
      id="nl-launcher"
      data-glass={glassTier}
      data-refract={canRefract ? '1' : '0'}
    >
      <LauncherBackground />
      <LauncherHeader />
      <LauncherGraph glassTier={glassTier} refract={canRefract} />
      <LauncherSound />
      {tethersRequested ? (
        <Suspense fallback={null}>
          <LazyProfileTethers />
        </Suspense>
      ) : null}
      <footer className="nl-launcher-sign" aria-hidden="true">
        NOUREDDIN EL MOBARAKI
      </footer>
    </div>
  );
}
