/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface PageLoaderProps {
  pageType: "cinema" | "tv" | "games" | "retro";
}

export function PageLoader({ pageType }: PageLoaderProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ zIndex: 99999 }}
      className="fixed inset-0 w-full h-full bg-[#0d0d0d] flex flex-col items-center justify-center gap-4 select-none font-sans"
    >
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Modern animated subtle micro rings */}
        <div className="absolute inset-0 border-2 border-red-600/20 rounded-full" />
        <div className="absolute inset-0 border-2 border-t-red-600 border-r-red-600/40 border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>

      <motion.p
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="text-[11px] uppercase tracking-widest text-zinc-400 font-mono"
      >
        {getPageTitle()}
      </motion.p>
    </motion.div>
  );
}
