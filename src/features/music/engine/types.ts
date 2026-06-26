export interface RawSongFv {
  id: number;
  file: string;
  title: string;
  artist: string;
  url: string;
  urlJsdelivr: string;
  lrcFile: string | null;
  hasLrc: boolean;
}

export interface Track {
  id: string;            // `fv-${id}` or custom
  title: string;
  artist: string;
  album?: string;
  src: string;           // url (m4a direct)
  srcFallback?: string;  // urlJsdelivr fallback
  kind: 'file' | 'hls';
  lrcUrl?: string;
  hasLrc: boolean;
  durationSec?: number;
  coverColor?: string;
  source: 'fv' | 'upload' | 'remote';
}
