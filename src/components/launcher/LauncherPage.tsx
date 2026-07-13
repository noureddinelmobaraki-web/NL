import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LauncherBackground } from './LauncherBackground';
import { LauncherHeader } from './LauncherHeader';
import { LauncherGraph } from './LauncherGraph';
import { LauncherSound } from './LauncherSound';

const LazyProfileTethers = lazy(() =>
  import('./ProfileTethers').then((module) => ({ default: module.ProfileTethers })),
);

export default function LauncherPage() {
  const { isProfileOpen, isAuthModalOpen } = useAuth();
  const modalOpen = isProfileOpen || isAuthModalOpen;
  const [tethersRequested, setTethersRequested] = useState(modalOpen);

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
    <div className="nl-launcher-container" id="nl-launcher">
      <LauncherBackground />
      <LauncherHeader />
      <LauncherGraph />
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
