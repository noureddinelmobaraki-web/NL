// src/config/streaming.ts — نفس الروابط الحالية حرفياً
import { Instagram, Facebook, Music2, Disc, Cloud, Video, type LucideIcon } from 'lucide-react';

export interface LinkNode {
  id: string;
  name: string;
  url: string;
  icon: LucideIcon;
  color: string;
}

export const STREAMING_PLATFORMS: LinkNode[] = [
  { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com/artist/5nwGOyilF1p4uv35v6vb2u', icon: Music2, color: '#1DB954' },
  { id: 'apple', name: 'Apple Music', url: 'https://music.apple.com/us/artist/nl/1535833912', icon: Music2, color: '#FA243C' },
  { id: 'deezer', name: 'Deezer', url: 'https://www.deezer.com/en/artist/362375722', icon: Disc, color: '#EF5466' },
  { id: 'amazon', name: 'Amazon Music', url: 'https://music.amazon.fr/artists/B0025ODH90/nl', icon: Music2, color: '#00A8E1' },
  { id: 'anghami', name: 'Anghami', url: 'https://play.anghami.com/artist/1430009', icon: Music2, color: '#ED1B24' },
  { id: 'soundcloud', name: 'SoundCloud', url: 'https://on.soundcloud.com/Ok8zBgOjCPqjvStEA', icon: Cloud, color: '#FF5500' },
];

export const SOCIAL_CHANNELS: LinkNode[] = [
  { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/nordine_el_mobaraki/', icon: Instagram, color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com/@nourdine_el_mobaraki', icon: Video, color: '#8a8f98' },
  { id: 'facebook', name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61558584390374', icon: Facebook, color: '#1877F2' },
];
