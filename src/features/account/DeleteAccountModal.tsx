import React, { useState, useRef, useEffect } from 'react';
import { X, TriangleAlert, Trash2, Loader }   from 'lucide-react';
import { useDeleteAccount }                    from './useDeleteAccount';

// The user must type this exact string to confirm deletion
const CONFIRM_PHRASE = 'DELETE';

interface DeleteAccountModalProps {
  onClose:   () => void;
  onDeleted: () => void; // called after successful deletion (close all modals, redirect, etc.)
}

export function DeleteAccountModal({ onClose, onDeleted }: DeleteAccountModalProps) {
  const [inputValue, setInputValue]       = useState('');
  const { deleteAccount, status, errorMsg } = useDeleteAccount();
  const inputRef                          = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const isConfirmed  = inputValue === CONFIRM_PHRASE;
  const isDeleting   = status === 'deleting';

  const handleConfirm = async () => {
    if (!isConfirmed || isDeleting) return;
    const success = await deleteAccount();
    if (success) onDeleted();
  };

  // Allow Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Delete account confirmation"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-red-900/50 shadow-2xl p-6">

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Close dialog"
          className="absolute top-4 right-4 flex items-center justify-center w-8 h-8
                     rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400
                     hover:text-white hover:border-zinc-500 transition-colors cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X size={15} strokeWidth={2} />
        </button>

        {/* Warning icon + title */}
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl
                           bg-red-900/30 border border-red-800/60">
            <TriangleAlert size={18} className="text-red-400" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-base font-bold text-white">Delete Account</h2>
            <p className="text-xs text-zinc-500">This action is permanent and irreversible</p>
          </div>
        </div>

        {/* What will be deleted */}
        <div className="mb-5 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
          <p className="text-xs font-semibold text-zinc-400 mb-2">The following data will be deleted:</p>
          <ul className="space-y-1 text-xs text-zinc-500">
            <li>— Your account and sign-in credentials</li>
            <li>— All song favorites and playlists</li>
            <li>— All movie favorites, watched history, and watchlist</li>
            <li>— Your profile information</li>
          </ul>
        </div>

        {/* Confirmation input */}
        <div className="mb-4">
          <label
            htmlFor="delete-confirm-input"
            className="block text-xs font-semibold text-zinc-400 mb-1.5"
          >
            Type <span className="font-mono text-red-400 bg-red-900/20 px-1 rounded">{CONFIRM_PHRASE}</span> to confirm
          </label>
          <input
            id="delete-confirm-input"
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDeleting}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            spellCheck={false}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono
                       bg-zinc-800 border text-white placeholder-zinc-600
                       outline-none transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:border-red-600
                       border-zinc-700"
          />
        </div>

        {/* Error message */}
        {status === 'error' && errorMsg && (
          <p className="mb-3 text-xs text-red-400 bg-red-900/20 border border-red-800/40
                        rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold
                       bg-zinc-800 border border-zinc-700 text-zinc-300
                       hover:border-zinc-500 hover:text-white
                       transition-colors cursor-pointer
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
            aria-label="Confirm account deletion"
            className="flex-1 inline-flex items-center justify-center gap-2
                       px-4 py-2 rounded-lg text-sm font-semibold
                       bg-red-700 border border-red-600 text-white
                       hover:bg-red-600
                       transition-colors cursor-pointer
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <><Loader size={14} className="animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 size={14} /> Delete Account</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
