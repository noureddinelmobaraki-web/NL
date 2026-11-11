/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * HTML5 / WebGL Embed Engine View
 * Renders isolated web & arcade embeds (e.g. Lichess TV frame) inside .nl-screen
 */

import { useEffect, useState } from 'react';

export interface Html5EmbedEngineViewProps {
  embedUrl: string;
  title: string | null;
  reloadToken: number;
  onReadyStateChange: (ready: boolean) => void;
}

export function Html5EmbedEngineView({
  embedUrl,
  title,
  reloadToken,
  onReadyStateChange,
}: Html5EmbedEngineViewProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    onReadyStateChange(false);
  }, [embedUrl, reloadToken, onReadyStateChange]);

  return (
    <div className="nl-ruffle-host">
      {!loaded && (
        <div className="nl-screen-overlay">
          <div className="nl-progress">
            <span />
          </div>
          <p className="nl-screen-hint">Loading Web Arcade Frame...</p>
        </div>
      )}
      <iframe
        key={`${embedUrl}_${reloadToken}`}
        src={embedUrl}
        title={title || 'Web Game'}
        className="nl-html5-iframe"
        allow="autoplay; fullscreen; gamepad"
        onLoad={() => {
          setLoaded(true);
          onReadyStateChange(true);
        }}
      />
    </div>
  );
}
