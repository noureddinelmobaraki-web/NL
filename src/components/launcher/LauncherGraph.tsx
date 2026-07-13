import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { setGenieOriginFromElement } from '../../transitions/genieOrigin';
import { useReducedMotion } from '../../motion/tokens';
import type { Theme } from '../../utils/userPrefs';
import { ROOTS, type NodeAction, type OpenHandler } from './graph.config';
import { introAudioController } from '../../audio/introAudioController';
import { computeGraph, type Layout, type PlacedNode } from './graph.geometry';
import { useStageSize } from './useStageSize';
import { ConnectorLayer } from './ConnectorLayer';
import { NodePill } from './NodePill';
import { warmLauncherAction } from './launcher.prefetch';
import { useMotionProfile } from '../../quality/motion/useMotionProfile';

export function LauncherGraph() {
  const { ref, size } = useStageSize<HTMLDivElement>();
  const reduced = useReducedMotion();
  const motionProfile = useMotionProfile();
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

  const graph = useMemo(
    () => computeGraph(size, layout, ROOTS, activeRoot, activeBranch),
    [size, layout, activeRoot, activeBranch],
  );

  const runAction = useCallback((action: NodeAction) => {
    const handlers: Record<OpenHandler, () => void> = {
      openMusic,
      openMovies,
      openTv,
      openXp,
      openRetro,
      openGames,
      openAccounts,
    };
    introAudioController.fadeOut(600);
    if (action.kind === 'open') {
      handlers[action.handler]?.();
      setTheme('midnight');
      setLoaded(true);
    } else if (action.kind === 'me') {
      setTheme('midnight');
      setLoaded(true);
    } else if (action.kind === 'theme') {
      setTheme(action.theme as Theme);
      setLoaded(true);
    }
  }, [
    openAccounts,
    openGames,
    openMovies,
    openMusic,
    openRetro,
    openTv,
    openXp,
    setLoaded,
    setTheme,
  ]);

  const handleNodeClick = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    placed: PlacedNode,
  ) => {
    const { node, level } = placed;
    if (node.children?.length) {
      if (level === 0) {
        setActiveBranch(null);
        setActiveRoot((previous) => previous === node.id ? null : node.id);
      } else if (level === 1) {
        setActiveBranch((previous) => previous === node.id ? null : node.id);
      }
      return;
    }
    setGenieOriginFromElement(event.currentTarget);
    runAction(node.action);
  }, [runAction]);

  const handleIntent = useCallback((placed: PlacedNode) => {
    if (!placed.hasChildren) warmLauncherAction(placed.node.action);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || graph.edges.length === 0) return;
    void import('../../quality/diagnostics/connectionDiagnostics').then(({ reportConnectionDiagnostics }) => {
      reportConnectionDiagnostics({
        surface: 'launcher',
        nodeIds: graph.nodes.map((placed) => placed.node.id),
        connectionIds: graph.edges.map((edge) => edge.id),
      });
    });
  }, [graph.edges, graph.nodes]);

  return (
    <div ref={ref} className="nl-graph-stage">
      <ConnectorLayer
        edges={graph.edges}
        size={size}
        reduced={reduced}
        motionProfile={motionProfile.name}
      />
      <AnimatePresence initial={false}>
        {graph.nodes.map((placed) => (
          <NodePill
            key={placed.node.id}
            placed={placed}
            onClick={handleNodeClick}
            onIntent={handleIntent}
            motionProfile={motionProfile.name}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
