/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { createContext, useContext, useRef } from 'react';
import { type CatalogTier, useCatalogTier } from './hooks/useCatalogTier';
import './catalogShell.css';

const CatalogTierContext = createContext<CatalogTier>('wide');

export function useCatalogShellTier(): CatalogTier {
  return useContext(CatalogTierContext);
}

export interface CatalogShellProps {
  topBar: React.ReactNode;
  leftRail?: React.ReactNode;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CatalogShell({
  topBar,
  leftRail,
  rightRail,
  children,
  className = '',
  style,
}: CatalogShellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tier = useCatalogTier(containerRef);
  const showThreeColumn = tier === 'wide' && Boolean(leftRail || rightRail);

  return (
    <CatalogTierContext.Provider value={tier}>
      <div
        ref={containerRef}
        className={`lg-catalog-shell lg-catalog-shell--${tier} ${
          showThreeColumn ? 'lg-catalog-shell--three-col' : ''
        } ${className}`.trim()}
        data-tier={tier}
        style={style}
      >
        {showThreeColumn ? (
          <>
            {leftRail && <aside className="lg-catalog-shell__left">{leftRail}</aside>}
            <div className="lg-catalog-shell__center">
              <div className="lg-catalog-shell__top lg-catalog-shell__header">{topBar}</div>
              <main className="lg-catalog-shell__main lg-catalog-shell__content">{children}</main>
            </div>
            {rightRail && <aside className="lg-catalog-shell__right">{rightRail}</aside>}
          </>
        ) : (
          <>
            <div className="lg-catalog-shell__top lg-catalog-shell__header">{topBar}</div>
            <main className="lg-catalog-shell__main lg-catalog-shell__content">{children}</main>
          </>
        )}
      </div>
    </CatalogTierContext.Provider>
  );
}
