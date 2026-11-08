import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { FileUp, Link2, Loader2, Play, X } from 'lucide-react';
import type { useCustomTorrentInput } from '../hooks/useCustomTorrentInput';

type Ctl = ReturnType<typeof useCustomTorrentInput>;

export const DownloadCustomInputBar: React.FC<{ ctl: Ctl; isAr: boolean }> = ({ ctl, isAr }) => (
  <AnimatePresence>
    {ctl.isOpen && (
      <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        className="overflow-hidden border-b border-white/12 bg-black/35">
        <div {...ctl.dropHandlers}
          className={`m-3 sm:mx-6 p-3 rounded-2xl border-2 border-dashed transition-colors flex flex-col gap-2.5 ${ctl.isDragging ? 'border-sky-400 bg-sky-500/10' : 'border-white/15'}`}>
          <form onSubmit={(e) => { e.preventDefault(); void ctl.confirmStart(); }} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Link2 size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-white/45" />
              <input type="text" dir="ltr" value={ctl.magnetText} onChange={(e) => ctl.onMagnetTextChange(e.target.value)}
                aria-invalid={Boolean(ctl.inlineError)}
                placeholder={isAr ? 'الصق magnet:?xt=urn:btih:... أو InfoHash — أو اسحب ملف .torrent هنا' : 'Paste magnet / InfoHash — or drop a .torrent here'}
                className="w-full ps-8 pe-3 py-2 rounded-xl bg-white/8 border border-white/18 text-xs placeholder-white/40 focus:outline-none focus:border-sky-400" />
            </div>
            <input ref={ctl.fileInputRef} type="file" accept=".torrent,application/x-bittorrent" onChange={ctl.onFileSelected} className="hidden" />
            <button type="button" onClick={ctl.openFilePicker} disabled={ctl.isSubmitting}
              className="px-3 py-2 rounded-xl bg-emerald-500/25 border border-emerald-300/45 text-xs font-extrabold text-emerald-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <FileUp size={13} />{isAr ? 'اختيار ملف .torrent' : 'Choose .torrent'}
            </button>
          </form>

          {ctl.inlineError && <p className="text-[11px] text-rose-300 font-bold">{ctl.inlineError}</p>}

          {ctl.preview && (
            <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/12 flex items-center justify-between gap-3">
              <div className="min-w-0 text-[11px] tabular-nums">
                <p className="font-extrabold text-white truncate" dir="ltr">
                  {ctl.preview.kind === 'torrent' ? ctl.preview.name : ctl.preview.name ?? (isAr ? 'رابط Magnet' : 'Magnet link')}
                </p>
                <p className="text-white/60" dir="ltr">
                  {ctl.preview.infoHash.slice(0, 12)}…
                  {ctl.preview.kind === 'torrent'
                    ? ` · ${ctl.preview.size} · ${ctl.preview.files} file(s) · ${ctl.preview.webSeeds} WebSeed(s)`
                    : ` · ${ctl.preview.trackers} tracker(s)`}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button type="button" onClick={ctl.reset} aria-label={isAr ? 'إلغاء' : 'Cancel'}
                  className="w-8 h-8 rounded-lg bg-white/8 border border-white/15 flex items-center justify-center cursor-pointer"><X size={13} /></button>
                <button type="button" onClick={() => void ctl.confirmStart()} disabled={ctl.isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  {ctl.isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                  {isAr ? 'بدء التحميل' : 'Start download'}
                </button>
              </div>
            </div>
          )}
        </div>
      </m.div>
    )}
  </AnimatePresence>
);
