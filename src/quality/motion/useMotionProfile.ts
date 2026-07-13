import { useSyncExternalStore } from 'react';
import {
  getMotionProfileServerSnapshot,
  getMotionProfileSnapshot,
  subscribeMotionProfile,
} from './motionProfileStore';

export function useMotionProfile() {
  return useSyncExternalStore(
    subscribeMotionProfile,
    getMotionProfileSnapshot,
    getMotionProfileServerSnapshot,
  );
}
