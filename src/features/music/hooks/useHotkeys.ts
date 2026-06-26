import { useEffect } from 'react';
import { useMusicStore } from '../store/musicStore';
import { useAppContext } from '../../../context/AppContext';

export function useHotkeys() {
  const { closeMusic } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const state = useMusicStore.getState();
      const { actions, volume, muted, repeat } = state;
      const currentTime = state.currentTime;
      const duration = state.duration;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          actions.togglePlay();
          break;
        case 'arrowright':
          if (e.shiftKey) {
            actions.next();
          } else {
            actions.seek(Math.min(currentTime + 5, duration));
          }
          break;
        case 'arrowleft':
          if (e.shiftKey) {
            actions.prev();
          } else {
            actions.seek(Math.max(currentTime - 5, 0));
          }
          break;
        case 'arrowup':
          e.preventDefault();
          actions.setVolume(Math.min(volume + 0.05, 1));
          break;
        case 'arrowdown':
          e.preventDefault();
          actions.setVolume(Math.max(volume - 0.05, 0));
          break;
        case 'm':
          actions.setMuted(!muted);
          break;
        case 's':
          actions.toggleShuffle();
          break;
        case 'r':
          const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
          const nextIdx = (modes.indexOf(repeat) + 1) % modes.length;
          actions.setRepeat(modes[nextIdx]);
          break;
        case 'escape':
          closeMusic();
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          const percentage = parseInt(e.key) / 10;
          actions.seek(duration * percentage);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeMusic]);
}
