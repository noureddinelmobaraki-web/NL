import { describe, expect, it } from 'vitest';
import { resolveMotionProfile } from '../motionProfileStore';

describe('shared motion profile', () => {
  it('uses zero reveal motion for Reduce Motion', () => {
    expect(resolveMotionProfile({
      reducedMotion: true,
      coarsePointer: false,
      narrowViewport: false,
    }).name).toBe('reduced');
  });

  it('uses balanced motion on phones and full motion on fine desktop', () => {
    expect(resolveMotionProfile({
      reducedMotion: false,
      coarsePointer: true,
      narrowViewport: true,
    }).name).toBe('balanced');
    expect(resolveMotionProfile({
      reducedMotion: false,
      coarsePointer: false,
      narrowViewport: false,
    }).name).toBe('full');
  });
});
