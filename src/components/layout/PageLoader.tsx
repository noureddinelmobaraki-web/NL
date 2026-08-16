/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { m } from "framer-motion";
import { useTranslation } from "react-i18next";

interface PageLoaderProps {
  pageType: "cinema" | "tv" | "games" | "retro";
}

/**
 * Unified app loader shown for every page transition / Suspense wait.
 * Three Uiverse.io spinner variants; one is picked at random on each mount.
 * Each variant's CSS is scoped under nl-pl-v1/v2/v3 so it never leaks into the
 * rest of the site, and keyframes are namespaced with nl-pl-*.
 */
const VARIANT_COUNT = 3;

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: "easeInOut" as const },
};

const labelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.15, duration: 0.4 },
};

const LOADER_CSS = `
/* shared, namespaced keyframes */
@keyframes nl-pl-circle { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.5} 100%{transform:scale(1);opacity:1} }
@keyframes nl-pl-dot { 0%{transform:scale(1)} 50%{transform:scale(0)} 100%{transform:scale(1)} }
@keyframes nl-pl-outline { 0%{transform:scale(0);outline:solid 20px var(--nl-pl-color);outline-offset:0;opacity:1} 100%{transform:scale(1);outline:solid 0 transparent;outline-offset:20px;opacity:0} }
@keyframes nl-pl-pound { to{transform:scale(1.2);box-shadow:1px 2px 3px 0 rgba(0,0,0,.65),2px 6px 12px 0 rgba(0,0,0,.5),3px 8px 15px 0 rgba(0,0,0,.45)} }
@keyframes nl-pl-follow { 0%{transform:rotate(0deg) translateY(-200%)} 60%,100%{transform:rotate(360deg) translateY(-200%)} }

/* ===== Variant 1 — Uiverse.io by Li-Deheng ===== */
.nl-pl-v1 { display:flex; justify-content:center; align-items:center; --nl-pl-color:hsl(0,0%,87%); --nl-pl-anim:2s ease-in-out infinite; }
.nl-pl-v1 .circle { display:flex; align-items:center; justify-content:center; position:relative; width:20px; height:20px; border:solid 2px var(--nl-pl-color); border-radius:50%; margin:0 10px; background-color:transparent; animation:nl-pl-circle var(--nl-pl-anim); }
.nl-pl-v1 .dot { position:absolute; transform:translate(-50%,-50%); width:16px; height:16px; border-radius:50%; background-color:var(--nl-pl-color); animation:nl-pl-dot var(--nl-pl-anim); }
.nl-pl-v1 .outline { position:absolute; transform:translate(-50%,-50%); width:20px; height:20px; border-radius:50%; animation:nl-pl-outline var(--nl-pl-anim); }
.nl-pl-v1 .circle:nth-child(2){animation-delay:.3s}
.nl-pl-v1 .circle:nth-child(3){animation-delay:.6s}
.nl-pl-v1 .circle:nth-child(4){animation-delay:.9s}
.nl-pl-v1 .circle:nth-child(2) .dot{animation-delay:.3s}
.nl-pl-v1 .circle:nth-child(3) .dot{animation-delay:.6s}
.nl-pl-v1 .circle:nth-child(4) .dot{animation-delay:.9s}
.nl-pl-v1 .circle:nth-child(1) .outline{animation-delay:.9s}
.nl-pl-v1 .circle:nth-child(2) .outline{animation-delay:1.2s}
.nl-pl-v1 .circle:nth-child(3) .outline{animation-delay:1.5s}
.nl-pl-v1 .circle:nth-child(4) .outline{animation-delay:1.8s}

/* ===== Variant 2 — Uiverse.io by Pradeepsaranbishnoi ===== */
.nl-pl-v2 { display:block; position:relative; width:5em; margin:0; padding:0; list-style:none; }
.nl-pl-v2 li { list-style:none; display:block; float:left; width:.5em; height:3em; margin:0 .5em 0 0; background:linear-gradient(to bottom,#635863 0%,#3d353b 100%); box-shadow:1px 1px 1px 0 rgba(0,0,0,0); animation:nl-pl-pound .7s ease-in-out infinite alternate; animation-delay:.05s; transform-origin:center; }
.nl-pl-v2 li:nth-child(2){animation-delay:.20s}
.nl-pl-v2 li:nth-child(3){animation-delay:.35s}
.nl-pl-v2 li:nth-child(4){animation-delay:.50s}
.nl-pl-v2 li:nth-child(5){animation-delay:.65s}

/* ===== Variant 3 — Uiverse.io by boryanakrasteva ===== */
.nl-pl-v3 { height:14px; position:relative; width:14px; }
.nl-pl-v3 div { animation:nl-pl-follow 1.25s infinite backwards; background-color:#fff; border-radius:100%; height:100%; width:100%; }
.nl-pl-v3 div:nth-child(1){animation-delay:.15s;background-color:rgba(255,255,255,.9)}
.nl-pl-v3 div:nth-child(2){animation-delay:.30s;background-color:rgba(255,255,255,.8)}
.nl-pl-v3 div:nth-child(3){animation-delay:.45s;background-color:rgba(255,255,255,.7)}
.nl-pl-v3 div:nth-child(4){animation-delay:.60s;background-color:rgba(255,255,255,.6)}
.nl-pl-v3 div:nth-child(5){animation-delay:.75s;background-color:rgba(255,255,255,.5)}
`;

function LoaderVariant({ variant }: { variant: number }) {
  if (variant === 1) {
    return (
      <ul className="nl-pl-v2" aria-hidden="true">
        <li /><li /><li /><li /><li />
      </ul>
    );
  }
  if (variant === 2) {
    return (
      <div className="nl-pl-v3" aria-hidden="true">
        <div /><div /><div /><div /><div />
      </div>
    );
  }
  return (
    <div className="nl-pl-v1" aria-hidden="true">
      <div className="circle"><div className="dot" /><div className="outline" /></div>
      <div className="circle"><div className="dot" /><div className="outline" /></div>
      <div className="circle"><div className="dot" /><div className="outline" /></div>
      <div className="circle"><div className="dot" /><div className="outline" /></div>
    </div>
  );
}

export function PageLoader({ pageType }: PageLoaderProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  // Pick one variant at random, stable for the lifetime of this loader instance.
  const [variant] = useState(() => Math.floor(Math.random() * VARIANT_COUNT));

  const getPageTitle = () => {
    switch (pageType) {
      case "cinema":
        return isRtl ? "Loading Cinema......" : "Loading Cinema...";
      case "tv":
        return isRtl ? "Loading TV......" : "Loading NL TV...";
      case "games":
        return isRtl ? "Preparing Games......" : "Loading Games...";
      case "retro":
        return isRtl ? "Loading Retro World......" : "Loading Retro World...";
      default:
        return isRtl ? "Loading......" : "Loading...";
    }
  };

  return (
    <m.div
      {...overlayMotion}
      className="fixed inset-0 w-full h-full bg-[#0d0d0d] flex flex-col items-center justify-center gap-6 select-none font-sans"
    >
      <style>{LOADER_CSS}</style>

      <LoaderVariant variant={variant} />

      <m.p
        {...labelMotion}
        className="text-[11px] uppercase tracking-widest text-zinc-400 font-mono"
      >
        {getPageTitle()}
      </m.p>
    </m.div>
  );
}
