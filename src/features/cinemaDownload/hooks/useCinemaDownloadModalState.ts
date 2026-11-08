import { useCallback, useEffect } from 'react';
import { cinemaDownloadManager } from '../downloadManager';
import type { CinemaDownloadSnapshot, DownloadMediaContext } from '../types';
import { useCinemaDownloadSelector } from './useCinemaDownloadSelector';

const select = (s: CinemaDownloadSnapshot) => ({
  isModalOpen: s.isModalOpen,
  activeTab: s.activeTab,
  activeMedia: s.activeMedia,
});

export function useCinemaDownloadModalState() {
  const { isModalOpen, activeTab, activeMedia } = useCinemaDownloadSelector(select);

  const open = useCallback((media: DownloadMediaContext) => cinemaDownloadManager.openModalForMedia(media), []);
  const openTasks = useCallback(() => cinemaDownloadManager.openTasksModal(), []);
  const close = useCallback(() => cinemaDownloadManager.closeModal(), []);
  const setTab = useCallback((tab: 'discover' | 'tasks') => cinemaDownloadManager.setActiveTab(tab), []);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen, close]);

  return { isModalOpen, activeTab, activeMedia, open, openTasks, close, setTab };
}
