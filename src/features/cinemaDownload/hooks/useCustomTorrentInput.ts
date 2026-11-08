import { useCallback, useMemo, useRef, useState } from 'react';
import { cinemaDownloadManager } from '../downloadManager';
import { parseTorrentFileBytes } from '../bencodeAndInputManager';
import { formatBytes } from '../releaseParserAndFilter';

export type InputPreview =
  | { kind: 'magnet'; infoHash: string; name: string | null; trackers: number }
  | { kind: 'torrent'; infoHash: string; name: string; size: string; files: number; webSeeds: number; file: File };

const HEX40 = /^[a-f0-9]{40}$/i;
const B32 = /^[a-z2-7]{32}$/i;

export function validateMagnetOrHash(raw: string): { ok: true; preview: InputPreview } | { ok: false; error: string } | null {
  const v = raw.trim();
  if (!v) return null;
  if (HEX40.test(v) || B32.test(v)) return { ok: true, preview: { kind: 'magnet', infoHash: v.toLowerCase(), name: null, trackers: 0 } };
  if (!v.toLowerCase().startsWith('magnet:?')) return { ok: false, error: 'يجب أن يبدأ الرابط بـ magnet:? أو يكون بصمة من 40 حرفاً' };
  const params = new URLSearchParams(v.slice(8));
  const xt = params.getAll('xt').find((x) => x.toLowerCase().startsWith('urn:btih:'));
  const hash = xt?.slice(9) ?? '';
  if (!HEX40.test(hash) && !B32.test(hash)) return { ok: false, error: 'بصمة btih غير صالحة' };
  return { ok: true, preview: { kind: 'magnet', infoHash: hash.toLowerCase(), name: params.get('dn'), trackers: params.getAll('tr').length } };
}

export function useCustomTorrentInput() {
  const [isOpen, setIsOpen] = useState(false);
  const [magnetText, setMagnetText] = useState('');
  const [filePreview, setFilePreview] = useState<InputPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepth = useRef(0);

  const magnetValidation = useMemo(() => validateMagnetOrHash(magnetText), [magnetText]);
  const preview: InputPreview | null = filePreview ?? (magnetValidation?.ok ? magnetValidation.preview : null);
  const inlineError = errorMsg ?? (magnetValidation && !magnetValidation.ok ? magnetValidation.error : null);

  const reset = useCallback(() => {
    setMagnetText(''); setFilePreview(null); setErrorMsg(null);
  }, []);

  const toggleOpen = useCallback(() => { setIsOpen((p) => !p); setErrorMsg(null); }, []);

  const inspectFile = useCallback(async (file: File) => {
    setErrorMsg(null);
    if (!/\.torrent$/i.test(file.name) && file.type !== 'application/x-bittorrent') {
      setErrorMsg('الملف ليس بصيغة .torrent'); return;
    }
    if (file.size > 10 * 1024 * 1024) { setErrorMsg('ملف .torrent أكبر من 10MB — غير منطقي'); return; }
    try {
      const meta = await parseTorrentFileBytes(new Uint8Array(await file.arrayBuffer()));
      setMagnetText('');
      setFilePreview({
        kind: 'torrent', infoHash: meta.infoHashHex, name: meta.name, size: formatBytes(meta.totalLength),
        files: meta.files.length, webSeeds: meta.webSeeds.length, file,
      });
    } catch {
      setErrorMsg('تعذر قراءة ملف .torrent (ترميز Bencode تالف)');
    }
  }, []);

  const confirmStart = useCallback(async () => {
    if (!preview) return;
    setIsSubmitting(true); setErrorMsg(null);
    try {
      if (preview.kind === 'torrent') await cinemaDownloadManager.addCustomTorrentFile(preview.file);
      else await cinemaDownloadManager.addCustomMagnetLink(magnetText.trim());
      reset(); setIsOpen(false);
      cinemaDownloadManager.setActiveTab('tasks');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر بدء التحميل');
    } finally {
      setIsSubmitting(false);
    }
  }, [preview, magnetText, reset]);

  const dropHandlers = useMemo(() => ({
    onDragEnter: (e: React.DragEvent) => { e.preventDefault(); dragDepth.current += 1; setIsDragging(true); },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); dragDepth.current = 0; setIsDragging(false); setIsOpen(true);
      const file = e.dataTransfer.files?.[0];
      if (file) { void inspectFile(file); return; }
      const text = e.dataTransfer.getData('text/plain');
      if (text) { setFilePreview(null); setMagnetText(text); }
    },
  }), [inspectFile]);

  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void inspectFile(f);
    e.target.value = '';
  }, [inspectFile]);

  const onMagnetTextChange = useCallback((v: string) => { setFilePreview(null); setErrorMsg(null); setMagnetText(v); }, []);

  return {
    isOpen, magnetText, preview, inlineError, isSubmitting, isDragging, fileInputRef,
    toggleOpen, onMagnetTextChange, onFileSelected, confirmStart, reset, dropHandlers,
    openFilePicker: () => fileInputRef.current?.click(),
  };
}
