/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Unobtrusive Mobile Notice & Save-State Toast Banner
 */

export interface MobileLandscapePromptProps {
  isTouch: boolean;
  hasGame: boolean;
  noticeDismissed: boolean;
  onDismissNotice: () => void;
  noticeText: string;
  saveToast: string | null;
}

export function MobileLandscapePrompt({
  isTouch,
  hasGame,
  noticeDismissed,
  onDismissNotice,
  noticeText,
  saveToast,
}: MobileLandscapePromptProps) {
  return (
    <>
      {saveToast && (
        <div className="nl-desktop-notice" role="status">
          <span>{saveToast}</span>
        </div>
      )}

      {isTouch && hasGame && !noticeDismissed && !saveToast && (
        <div className="nl-desktop-notice">
          <span>{noticeText}</span>
          <button
            type="button"
            onClick={onDismissNotice}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
