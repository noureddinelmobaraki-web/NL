import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { setGenieOriginFromElement } from '../../transitions/genieOrigin';
import { useReducedMotion } from '../../motion/tokens';
import type { Theme } from '../../utils/userPrefs';
import { ROOTS, type NodeAction, type OpenHandler } from './graph.config';
import { introAudioController } from '../../audio/introAudioController';
import { computeGraph, type Layout, type PlacedNode, type Pt } from './graph.geometry';
import { useStageSize } from './useStageSize';
import { ConnectorLayer } from './ConnectorLayer';
import { NodePill } from './NodePill';
import { warmLauncherAction } from './launcher.prefetch';
import { useMotionProfile } from '../../quality/motion/useMotionProfile';
import { LiquidGlassFilter } from './glass/LiquidGlassFilter';
import { supportsRefraction, useGlassTier, type GlassTier } from './glass/useGlassTier';
import { useGlassPointer } from './glass/useGlassPointer';

interface LauncherGraphProps {
  glassTier?: GlassTier;
  refract?: boolean;
}

export function LauncherGraph({ glassTier: propTier, refract: propRefract }: LauncherGraphProps = {}) {
  const { ref, size } = useStageSize<HTMLDivElement>();
  const pointerRootRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const motionProfile = useMotionProfile();
  const hookTier = useGlassTier();
  const glassTier = propTier ?? hookTier;
  const canRefract = propRefract ?? (glassTier === 'liquid' && supportsRefraction());

  useEffect(() => {
    const stageEl = ref.current;
    pointerRootRef.current =
      stageEl?.closest<HTMLElement>('.nl-launcher-container') ?? stageEl ?? null;
  }, [ref]);

  useGlassPointer(pointerRootRef, glassTier);

  const {
    setTheme,
    setLoaded,
    openMusic,
    openMovies,
    openTv,
    openAnime,
    openCartoon,
    openXp,
    openRetro,
    openGames,
    openAccounts,
    openLiquidGlass,
    openArt,
  } = useAppContext();
  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [activeSubBranch, setActiveSubBranch] = useState<string | null>(null);
  const layout: Layout = size.w > 0 && size.w < 768 ? 'mobile' : 'desktop';

  const graph = useMemo(
    () => computeGraph(size, layout, ROOTS, activeRoot, activeBranch, activeSubBranch),
    [size, layout, activeRoot, activeBranch, activeSubBranch],
  );

  const { siblingIndexByNodeId, edgeStaggerMap, nodePositions } = useMemo(() => {
    const nodeIdxMap = new Map<string, number>();
    const posMap = new Map<string, Pt>();
    let l1Idx = 0;
    let l2Idx = 0;
    let l3Idx = 0;

    for (const placed of graph.nodes) {
      posMap.set(placed.node.id, placed.pos);
      if (placed.level === 1) {
        nodeIdxMap.set(placed.node.id, l1Idx++);
      } else if (placed.level === 2) {
        nodeIdxMap.set(placed.node.id, l2Idx++);
      } else if (placed.level === 3) {
        nodeIdxMap.set(placed.node.id, l3Idx++);
      } else {
        nodeIdxMap.set(placed.node.id, 0);
      }
    }

    const edgeMap = new Map<string, number>();
    for (const edge of graph.edges) {
      edgeMap.set(edge.id, nodeIdxMap.get(edge.toId) ?? 0);
    }

    return {
      siblingIndexByNodeId: nodeIdxMap,
      edgeStaggerMap: edgeMap,
      nodePositions: posMap,
    };
  }, [graph.edges, graph.nodes]);

  const runAction = useCallback(
    (action: NodeAction) => {
      const handlers: Record<OpenHandler, () => void> = {
        openMusic,
        openMovies,
        openTv,
        openAnime,
        openCartoon,
        openXp,
        openRetro,
        openGames,
        openAccounts,
        openLiquidBooks: () => openLiquidGlass('books'),
        openLiquidAudiobooks: () => openLiquidGlass('audiobooks'),
        openLiquidAlbums: () => openLiquidGlass('sun'),
        openLiquidX: () => openLiquidGlass('video'),
        openArtPhotos: () => openArt('photos'),
        openArtDrawings: () => openArt('drawings'),
        openArtAvatars: () => openArt('avatars'),
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
    },
    [
      openAccounts,
      openAnime,
      openArt,
      openCartoon,
      openGames,
      openLiquidGlass,
      openMovies,
      openMusic,
      openRetro,
      openTv,
      openXp,
      setLoaded,
      setTheme,
    ],
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, placed: PlacedNode) => {
      const { node, level } = placed;
      if (node.children?.length) {
        if (level === 0) {
          setActiveSubBranch(null);
          setActiveBranch(null);
          setActiveRoot((previous) => (previous === node.id ? null : node.id));
        } else if (level === 1) {
          setActiveSubBranch(null);
          setActiveBranch((previous) => (previous === node.id ? null : node.id));
        } else if (level === 2) {
          setActiveSubBranch((previous) => (previous === node.id ? null : node.id));
        }
        return;
      }
      setGenieOriginFromElement(event.currentTarget);
      runAction(node.action);
    },
    [runAction],
  );

  const warmTimerRef = useRef<number>(0);

  const warmStage = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-warm', 'true');
    if (warmTimerRef.current) window.clearTimeout(warmTimerRef.current);
    warmTimerRef.current = window.setTimeout(() => {
      el.removeAttribute('data-warm');
    }, 650);
  }, [ref]);

  useEffect(() => {
    return () => {
      if (warmTimerRef.current) window.clearTimeout(warmTimerRef.current);
    };
  }, []);

  const handleIntent = useCallback(
    (placed: PlacedNode) => {
      warmStage();
      if (!placed.hasChildren) warmLauncherAction(placed.node.action);
    },
    [warmStage],
  );

  useEffect(() => {
    if (!import.meta.env.DEV || graph.edges.length === 0) return;
    void import('../../quality/diagnostics/connectionDiagnostics').then(
      ({ reportConnectionDiagnostics }) => {
        reportConnectionDiagnostics({
          surface: 'launcher',
          nodeIds: graph.nodes.map((placed) => placed.node.id),
          connectionIds: graph.edges.map((edge) => edge.id),
        });
      },
    );
  }, [graph.edges, graph.nodes]);

  const l2RefractAttr = graph.nodes.length > 10 ? '0' : '1';
  const denseAttr = graph.nodes.length >= 8 ? '1' : '0';

  return (
    <div
      ref={ref}
      className="nl-graph-stage"
      data-l2-refract={l2RefractAttr}
      data-dense={denseAttr}
      onPointerDown={warmStage}
    >
      {canRefract ? <LiquidGlassFilter /> : null}
      <ConnectorLayer
        edges={graph.edges}
        size={size}
        reduced={reduced}
        motionProfile={motionProfile.name}
        glassTier={glassTier}
        edgeStaggerMap={edgeStaggerMap}
        nodePositions={nodePositions}
      />
      <AnimatePresence initial={false}>
        {graph.nodes.map((placed) => (
          <NodePill
            key={placed.node.id}
            placed={placed}
            onClick={handleNodeClick}
            onIntent={handleIntent}
            motionProfile={motionProfile.name}
            glassTier={glassTier}
            siblingIndex={siblingIndexByNodeId.get(placed.node.id) ?? 0}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
