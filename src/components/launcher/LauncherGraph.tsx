// src/components/launcher/LauncherGraph.tsx
// The interactive radial mind-map. Holds the open-path state (one root open at
// a time; one branch open within it), computes geometry from the measured
// stage size, and renders the glass rays + node pills.
//
// Behaviour (per spec):
//  - Tap a root  -> its children fan out on curved rays. Tapping another root
//    collapses the previous one back to a single pill.
//  - Tap a branch (level 1) -> its remaining choices fan out; siblings dim.
//  - Tap a leaf  -> genie-navigate into the matching full-screen page / theme.

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { audioManager } from '../../audio/audioManager';
import { setGenieOriginFromElement } from '../../transitions/genieOrigin';
import { useReducedMotion } from '../../motion/tokens';
import type { Theme } from '../../utils/userPrefs';
import { ROOTS, type NodeAction, type OpenHandler } from './graph.config';
import { computeGraph, type Layout, type PlacedNode } from './graph.geometry';
import { useStageSize } from './useStageSize';
import { ConnectorLayer } from './ConnectorLayer';
import { NodePill } from './NodePill';

function play(source: 'lens' | 'mebit') {
  try {
    audioManager.play(source);
  } catch {
    /* audio is best-effort */
  }
}

export function LauncherGraph() {
  const { ref, size } = useStageSize<HTMLDivElement>();
  const reduced = useReducedMotion();

  const {
    setTheme,
    setLoaded,
    openMusic,
    openMovies,
    openTv,
    openXp,
    openRetro,
    openGames,
    openAccounts,
  } = useAppContext();

  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);

  const layout: Layout = size.w > 0 && size.w < 768 ? 'mobile' : 'desktop';

  const { nodes, edges } = useMemo(
    () => computeGraph(size, layout, ROOTS, activeRoot, activeBranch),
    [size, layout, activeRoot, activeBranch],
  );

  const navMap: Record<OpenHandler, () => void> = {
    openMusic,
    openMovies,
    openTv,
    openXp,
    openRetro,
    openGames,
    openAccounts,
  };

  const runAction = (action: NodeAction) => {
    if (action.kind === 'open') {
      play('lens');
      navMap[action.handler]?.();
      setTheme('midnight');
      setLoaded(true);
    } else if (action.kind === 'me') {
      play('mebit');
      setTheme('midnight');
      setLoaded(true);
    } else if (action.kind === 'theme') {
      play('mebit');
      setTheme(action.theme as Theme);
      setLoaded(true);
    }
  };

  const handleNodeClick = (e: React.MouseEvent<HTMLButtonElement>, placed: PlacedNode) => {
    const { node, level } = placed;

    // Expandable node -> toggle its branch open/closed.
    if (node.children?.length) {
      play('lens');
      if (level === 0) {
        setActiveBranch(null);
        setActiveRoot((prev) => (prev === node.id ? null : node.id));
      } else if (level === 1) {
        setActiveBranch((prev) => (prev === node.id ? null : node.id));
      }
      return;
    }

    // Leaf -> navigate, capturing the genie origin from the tapped pill.
    setGenieOriginFromElement(e.currentTarget);
    runAction(node.action);
  };

  return (
    <div ref={ref} className="nl-graph-stage">
      <ConnectorLayer edges={edges} size={size} reduced={reduced} />
      <AnimatePresence>
        {nodes.map((placed) => (
          <NodePill key={placed.node.id} placed={placed} onClick={handleNodeClick} />
        ))}
      </AnimatePresence>
    </div>
  );
}
