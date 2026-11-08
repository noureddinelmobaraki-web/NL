/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Custom Hook: Custom .torrent File Upload & Magnet/InfoHash Input Management
 */

import { useCallback, useRef, useState } from 'react';
import { cinemaDownloadManager } from '../downloadManager';

export function useCustomTorrentInput() {
  const [isOpen, setIsOpen] = useState(false);
  const [magnetText, setMagnetText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
    setErrorMsg(null);
  }, []);

  const submitMagnetLink = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = magnetText.trim();
      if (!trimmed) return;
      setErrorMsg(null);
      setIsSubmitting(true);
      try {
        await cinemaDownloadManager.addCustomMagnetLink(trimmed);
        setMagnetText('');
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err?.message || 'رابط Magnet غير صالح');
      } finally {
        setIsSubmitting(false);
      }
    },
    [magnetText],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setErrorMsg(null);
      setIsSubmitting(true);
      try {
        await cinemaDownloadManager.addCustomTorrentFile(file);
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err?.message || 'تعذر قراءة ملف .torrent');
      } finally {
        setIsSubmitting(false);
        e.target.value = '';
      }
    },
    [],
  );

  return {
    isOpen,
    magnetText,
    errorMsg,
    isSubmitting,
    fileInputRef,
    setMagnetText,
    toggleOpen,
    submitMagnetLink,
    openFilePicker,
    handleFileSelected,
  };
}
