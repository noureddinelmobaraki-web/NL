// src/components/launcher/LauncherPage.tsx
// The launcher is a SINGLE, self-contained, full-screen page (phone + desktop).
// No scroll, no name/branding, no hero bleeding through: an opaque base + the
// glass background video sit behind an absolutely-positioned radial mind-map.

import { useEffect } from 'react';
import { LauncherBackground } from './LauncherBackground';
import { LauncherHeader } from './LauncherHeader';
import { LauncherGraph } from './LauncherGraph';
import { LauncherSound } from './LauncherSound';
import { ProfileTethers } from './ProfileTethers';

export default function LauncherPage() {
  // Lock page scroll while the launcher owns the screen, so no stray scrollbar
  // (from the hidden app behind it) can appear — keeps it a true single screen.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  return (
    <div className="nl-launcher-container" id="nl-launcher">
      {/* Opaque base + glass background video (fully covers, darkened) */}
      <LauncherBackground />

      {/* Slim top bar: Accounts / Login / Profile only — no product name */}
      <LauncherHeader />

      {/* The radial branching stage fills the rest of the viewport */}
      <LauncherGraph />

      {/* Enable-sound / intro-music control (glass, same style) */}
      <LauncherSound />

      {/* Glass "tether" rays that clamp onto the profile/auth window corners */}
      <ProfileTethers />

      {/* Subtle signature (not a product name) */}
      <footer className="nl-launcher-sign" aria-hidden="true">
        NOUREDDIN EL MOBARAKI
      </footer>
    </div>
  );
}
