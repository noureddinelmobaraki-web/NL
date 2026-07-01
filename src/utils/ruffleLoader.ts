/* يحمّل Ruffle مرة واحدة فقط (lazy) ويعيد كائن RufflePlayer. */
let rufflePromise: Promise<any> | null = null;

export function loadRuffle(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).RufflePlayer?.newest) {
    return Promise.resolve((window as any).RufflePlayer);
  }
  if (rufflePromise) return rufflePromise;

  rufflePromise = new Promise((resolve, reject) => {
    const ready = () => {
      const rp = (window as any).RufflePlayer;
      if (rp?.newest) resolve(rp);
      else reject(new Error('RufflePlayer missing after load'));
    };
    const existing = document.getElementById('nl-ruffle-script') as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).RufflePlayer?.newest) ready();
      else {
        existing.addEventListener('load', ready, { once: true });
        existing.addEventListener('error', () => { rufflePromise = null; reject(new Error('Ruffle failed')); }, { once: true });
      }
      return;
    }
    (window as any).RufflePlayer = (window as any).RufflePlayer || {};
    (window as any).RufflePlayer.config = (window as any).RufflePlayer.config || {};
    (window as any).RufflePlayer.config.publicPath = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/ruffle/';

    const script = document.createElement('script');
    script.id = 'nl-ruffle-script';
    script.src = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/ruffle/ruffle.js';
    script.async = true;
    script.addEventListener('load', ready, { once: true });
    script.addEventListener('error', () => { rufflePromise = null; reject(new Error('Ruffle failed')); }, { once: true });
    document.body.appendChild(script);
  });
  return rufflePromise;
}
