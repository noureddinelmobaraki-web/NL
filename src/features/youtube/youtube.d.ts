export {};

declare global {
  namespace YT {
    interface PlayerVars {
      autoplay?: 0 | 1;
      controls?: 0 | 1;
      modestbranding?: 0 | 1;
      rel?: 0 | 1;
      iv_load_policy?: 1 | 3;
      disablekb?: 0 | 1;
      playsinline?: 0 | 1;
      fs?: 0 | 1;
      cc_load_policy?: 0 | 1;
      cc_lang_pref?: string;
      hl?: string;
    }
    interface PlayerEvent {
      target: Player;
    }
    interface OnStateChangeEvent {
      target: Player;
      data: number;
    }
    interface PlayerOptions {
      host?: string;
      videoId?: string;
      playerVars?: PlayerVars;
      events?: {
        onReady?: (e: PlayerEvent) => void;
        onStateChange?: (e: OnStateChangeEvent) => void;
      };
    }
    class Player {
      constructor(el: HTMLElement | string, opts: PlayerOptions);
      playVideo(): void;
      pauseVideo(): void;
      seekTo(sec: number, allow: boolean): void;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
      getCurrentTime(): number;
      getDuration(): number;
      loadVideoById(id: string): void;
      loadModule(name: string): void;
      unloadModule(name: string): void;
      setOption(module: string, option: string, value: unknown): void;
      destroy(): void;
    }
    const PlayerState: {
      UNSTARTED: number;
      ENDED: number;
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      CUED: number;
    };
  }
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}
