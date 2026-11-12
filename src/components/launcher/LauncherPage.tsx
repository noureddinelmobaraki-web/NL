import { lazy, Suspense, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { LauncherBackground } from './LauncherBackground';
import { LauncherHeader } from './LauncherHeader';
import { LauncherGraph } from './LauncherGraph';
import { LauncherSound } from './LauncherSound';
import { supportsRefraction, useGlassTier } from './glass/useGlassTier';
import { LauncherIntroContext } from './intro/launcherIntro.context';
import { useLauncherIntroGate } from './intro/useLauncherIntroGate';
import { useLauncherIntroDirector } from './intro/useLauncherIntroDirector';
import { useIntroCamera } from './intro/useIntroCamera';
import { IntroCinemaOverlay } from './intro/IntroCinemaOverlay';
import { CAMERA_INITIAL } from './intro/launcherIntro.timeline';
import './intro/launcher-intro.css';

const LazyProfileTethers = lazy(() =>
  import('./ProfileTethers').then((module) => ({ default: module.ProfileTethers })),
);

export default function LauncherPage() {
  const { isProfileOpen, isAuthModalOpen } = useAuth();
  const modalOpen = isProfileOpen || isAuthModalOpen;
  const [tethersRequested, setTethersRequested] = useState(modalOpen);
  const glassTier = useGlassTier();
  const canRefract = glassTier === 'liquid' && supportsRefraction();

  const introEnabled = useLauncherIntroGate(glassTier);
  const intro = useLauncherIntroDirector(introEnabled);
  const camera = useIntroCamera(intro.phase, intro.anchors);

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
    <LauncherIntroContext.Provider value={intro}>
      <div
        className="nl-launcher-container"
        id="nl-launcher"
        data-glass={glassTier}
        data-refract={canRefract ? '1' : '0'}
        data-intro={intro.active ? 'on' : 'off'}
        data-intro-phase={intro.phase}
      >
        <LauncherBackground />
        <LauncherHeader />
        <m.div
          className="nl-intro-camera"
          initial={introEnabled ? CAMERA_INITIAL : false}
          animate={camera.animate}
          transition={camera.transition}
        >
          <LauncherGraph glassTier={glassTier} refract={canRefract} />
        </m.div>
        <LauncherSound />
        {tethersRequested ? (
          <Suspense fallback={null}>
            <LazyProfileTethers />
          </Suspense>
        ) : null}
        <footer className="nl-launcher-sign" aria-hidden="true">
          NOUREDDIN EL MOBARAKI
        </footer>
        {intro.active ? (
          <IntroCinemaOverlay
            phase={intro.phase}
            anchors={intro.anchors}
            richFx={glassTier === 'liquid'}
            onSkip={intro.skip}
          />
        ) : null}
      </div>
    </LauncherIntroContext.Provider>
  );
}
