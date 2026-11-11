import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRadioStationsByCountry, type RadioStation } from '../services/radioBrowserService';

export function useRadioCatalog(selectedCountryCode: string | null) {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [isLoadingRadio, setIsLoadingRadio] = useState(false);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const code = selectedCountryCode || 'MA';
    let cancelled = false;
    setIsLoadingRadio(true);

    fetchRadioStationsByCountry(code)
      .then((list) => {
        if (cancelled) return;
        setStations(list);
        if (list.length > 0 && !activeStation) {
          setActiveStation(list[0]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRadio(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCountryCode]);

  const playStation = useCallback((station: RadioStation) => {
    setActiveStation(station);
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = station.url_resolved;
    audio
      .play()
      .then(() => setIsRadioPlaying(true))
      .catch(() => setIsRadioPlaying(false));
  }, []);

  const toggleRadioPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeStation) return;
    if (audio.paused) {
      if (!audio.src) audio.src = activeStation.url_resolved;
      audio
        .play()
        .then(() => setIsRadioPlaying(true))
        .catch(() => setIsRadioPlaying(false));
    } else {
      audio.pause();
      setIsRadioPlaying(false);
    }
  }, [activeStation]);

  return {
    stations,
    activeStation,
    isLoadingRadio,
    isRadioPlaying,
    audioRef,
    playStation,
    toggleRadioPlay,
    setIsRadioPlaying,
  };
}
