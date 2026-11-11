/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Interactive Book Text-to-Speech (TTS) Hook
 * - Reads book summaries, poems, or extracted chapters aloud in Arabic or English
 */

import { useState, useCallback, useEffect } from 'react';

export function useBookSpeechTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState(1);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(
    (text: string, langHint = 'ar') => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      window.speechSynthesis.cancel();
      const cleaned = text.trim();
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned.slice(0, 3500));
      const isArabic =
        langHint.startsWith('ar') || /[\u0600-\u06FF]/.test(cleaned);
      utterance.lang = isArabic ? 'ar-SA' : 'en-US';
      utterance.rate = rate;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [rate],
  );

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isSpeaking,
    rate,
    setRate,
    speakText,
    stopSpeech,
  };
}
