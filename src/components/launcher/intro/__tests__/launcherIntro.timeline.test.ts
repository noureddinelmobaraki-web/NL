/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */
import { describe, expect, it } from 'vitest';
import { ROOTS, type GraphNode } from '../../graph.config';
import {
  CAMERA_POSES,
  INTRO_CUES,
  INTRO_TOTAL_MS,
  computeCameraTarget,
  sameAnchors,
} from '../launcherIntro.timeline';
import { decideIntro, type IntroGateInputs } from '../useLauncherIntroGate';

const findChild = (nodes: readonly GraphNode[] | undefined, id: string | null) =>
  id === null ? undefined : nodes?.find((node) => node.id === id);

describe('launcher intro timeline', () => {
  it('cues are strictly ascending and end with done at INTRO_TOTAL_MS', () => {
    for (let i = 1; i < INTRO_CUES.length; i += 1) {
      expect(INTRO_CUES[i].at).toBeGreaterThan(INTRO_CUES[i - 1].at);
    }
    const last = INTRO_CUES[INTRO_CUES.length - 1];
    expect(last.phase).toBe('done');
    expect(last.at).toBe(INTRO_TOTAL_MS);
    expect(INTRO_TOTAL_MS).toBeGreaterThanOrEqual(9_000);
    expect(INTRO_TOTAL_MS).toBeLessThanOrEqual(11_000);
  });

  it('every graph script references real node ids in a valid hierarchy', () => {
    for (const cue of INTRO_CUES) {
      if (!cue.graph) continue;
      const { root, branch, sub } = cue.graph;
      if (root === null) {
        expect(branch).toBeNull();
        expect(sub).toBeNull();
        continue;
      }
      const rootNode = findChild(ROOTS, root);
      expect(rootNode, `root "${root}"`).toBeDefined();
      if (branch !== null) {
        const branchNode = findChild(rootNode?.children, branch);
        expect(branchNode, `branch "${branch}"`).toBeDefined();
        if (sub !== null) {
          const subNode = findChild(branchNode?.children, sub);
          expect(subNode, `sub "${sub}"`).toBeDefined();
          expect(subNode?.children?.length ?? 0).toBeGreaterThan(0);
        }
      } else {
        expect(sub).toBeNull();
      }
    }
  });

  it('camera centres the focused anchor', () => {
    const target = computeCameraTarget(CAMERA_POSES.focusMe, {
      me: { x: 200, y: 300 },
      home: null,
      size: { w: 1200, h: 800 },
    });
    expect(target.x).toBeCloseTo((600 - 200) * CAMERA_POSES.focusMe.scale);
    expect(target.y).toBeCloseTo((400 - 300) * CAMERA_POSES.focusMe.scale);
  });

  it('camera returns to identity on settle and done', () => {
    const anchors = { me: { x: 10, y: 10 }, home: null, size: { w: 1200, h: 800 } };
    for (const phase of ['settle', 'done'] as const) {
      const t = computeCameraTarget(CAMERA_POSES[phase], anchors);
      expect(t).toEqual({ x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, z: 0 });
    }
  });

  it('sameAnchors detects equality', () => {
    const a = { me: { x: 1, y: 2 }, home: null, size: { w: 3, h: 4 } };
    expect(sameAnchors(a, { me: { x: 1, y: 2 }, home: null, size: { w: 3, h: 4 } })).toBe(true);
    expect(sameAnchors(a, { me: { x: 9, y: 2 }, home: null, size: { w: 3, h: 4 } })).toBe(false);
  });
});

describe('launcher intro gate', () => {
  const base: IntroGateInputs = {
    urlFlag: null,
    alreadyPlayed: false,
    reducedMotion: false,
    automated: false,
    hidden: false,
    glassTier: 'liquid',
  };

  it('plays on a fresh capable session', () => {
    expect(decideIntro(base)).toBe(true);
  });

  it.each([
    ['already played', { alreadyPlayed: true }],
    ['reduced motion', { reducedMotion: true }],
    ['automated env', { automated: true }],
    ['hidden tab', { hidden: true }],
    ['lite tier', { glassTier: 'lite' as const }],
    ['?intro=0', { urlFlag: '0' as const }],
  ])('skips when %s', (_label, patch) => {
    expect(decideIntro({ ...base, ...patch })).toBe(false);
  });

  it('?intro=1 forces playback', () => {
    expect(decideIntro({ ...base, alreadyPlayed: true, automated: true, urlFlag: '1' })).toBe(true);
  });
});
