import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { FileUp, Link2 } from 'lucide-react';

interface DownloadCustomInputBarProps {
  isAr: boolean;
  isOpen: boolean;
  magnetText: string;
  errorMsg: string | null;
  isSubmitting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onMagnetTextChange: (val: string) => void;
  onSubmitMagnet: (e: React.FormEvent) => void;
  onOpenFilePicker: () => void;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DownloadCustomInputBar: React.FC<DownloadCustomInputBarProps> = ({
  isAr,
  isOpen,
  magnetText,
  errorMsg,
  isSubmitting,
  fileInputRef,
  onMagnetTextChange,
  onSubmitMagnet,
  onOpenFilePicker,
  onFileSelected,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-b border-white/12 bg-black/35"
        >
          <div className="px-4 sm:px-6 py-3 flex flex-col gap-2">
            <form
              onSubmit={onSubmitMagnet}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <div className="relative flex-1">
                <Link2
                  size={14}
                  className="absolute top-1/2 -translate-y-1/2 inset-inline-start-3 text-white/45"
                />
                <input
                  type="text"
                  value={magnetText}
                  onChange={(e) => onMagnetTextChange(e.target.value)}
                  placeholder={
                    isAr
                      ? 'الصق رابط magnet:?xt=urn:btih:... أو بصمة InfoHash هنا...'
                      : 'Paste magnet:?xt=urn:btih:... or 40-char InfoHash...'
                  }
                  dir="ltr"
                  className="w-full ps-8 pe-3 py-2 rounded-xl bg-white/8 border border-white/18 text-xs text-white placeholder-white/40 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-xl bg-sky-500/35 hover:bg-sky-500/50 border border-sky-300/50 text-xs font-black text-white cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {isAr ? 'بدء تحميل الرابط' : 'Start Magnet Download'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".torrent,application/x-bittorrent"
                  onChange={onFileSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onOpenFilePicker}
                  className="px-3 py-2 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-300/45 text-xs font-extrabold text-emerald-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <FileUp size={13} />
                  <span>{isAr ? 'ملف .torrent' : 'Upload .torrent'}</span>
                </button>
              </div>
            </form>
            {errorMsg && (
              <p className="text-[11px] text-rose-300 font-bold">{errorMsg}</p>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
