export interface PlayableArchiveRom {
  identifier: string;
  core: string;
  romUrl: string;
  fileName: string;
}

const ARCHIVE_EXTENSION_BY_CORE: Record<string, RegExp> = {
  nes: /\.(nes|zip)$/i,
  snes: /\.(sfc|smc|zip)$/i,
  segaMD: /\.(md|gen|bin|zip)$/i,
  gba: /\.(gba|zip)$/i,
  psx: /\.(chd|cue|bin|iso|pbp)$/i,
  n64: /\.(z64|n64|v64|zip)$/i,
  arcade: /\.zip$/i,
};

export async function resolveArchiveRomByIdentifier(
  identifier: string,
  core = 'nes'
): Promise<PlayableArchiveRom | null> {
  try {
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
    if (!res.ok) return null;
    const meta = await res.json();
    const files: any[] = meta.files || [];
    const extRegex = ARCHIVE_EXTENSION_BY_CORE[core] || /\.(zip|nes|sfc|gba|md|z64)$/i;
    const match = files.find((f) => f?.name && extRegex.test(f.name) && !/thumb|screenshot/i.test(f.name));
    if (!match) return null;

    return {
      identifier,
      core,
      romUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(match.name)}`,
      fileName: match.name,
    };
  } catch {
    return null;
  }
}
