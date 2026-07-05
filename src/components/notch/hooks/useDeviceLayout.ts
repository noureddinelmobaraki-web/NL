import { useDeviceType } from '../../../hooks/useDeviceType';
import type { NotchDevice } from '../notch.types';

export function useDeviceLayout() {
  const { isDesktop, isTouch } = useDeviceType();
  const device: NotchDevice = isDesktop ? 'desktop' : 'mobile';
  return { device, isDesktop, isTouch };
}
