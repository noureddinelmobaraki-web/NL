import { useMusicStore } from '../store/musicStore';

export interface PortableBackup {
  version: number;
  date: string;
  data: {
    playlists: any[];
    favorites: string[];
    eqGains: number[];
    eqPreset: string;
    crossfadeSec: number;
    repeat: string;
    shuffle: boolean;
  };
}

export function exportSettings() {
  const state = useMusicStore.getState();
  
  const backup: PortableBackup = {
    version: 1,
    date: new Date().toISOString(),
    data: {
      playlists: state.playlists,
      favorites: state.favorites,
      eqGains: state.eqGains,
      eqPreset: state.eqPreset,
      crossfadeSec: state.crossfadeSec,
      repeat: state.repeat,
      shuffle: state.shuffle,
    }
  };
  
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `nl-music-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

export async function importSettings(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const backup: PortableBackup = JSON.parse(text);
    
    if (!backup.version || backup.version !== 1 || !backup.data) {
      throw new Error("Invalid backup file structure");
    }
    
    // Partially update store
    useMusicStore.setState((state) => ({
      playlists: backup.data.playlists || state.playlists,
      favorites: backup.data.favorites || state.favorites,
      eqGains: backup.data.eqGains || state.eqGains,
      eqPreset: backup.data.eqPreset || state.eqPreset,
      crossfadeSec: backup.data.crossfadeSec ?? state.crossfadeSec,
      repeat: (backup.data.repeat as any) || state.repeat,
      shuffle: backup.data.shuffle ?? state.shuffle,
    }));
    
    return true;
  } catch (err) {
    console.error("Failed to import settings", err);
    return false;
  }
}
