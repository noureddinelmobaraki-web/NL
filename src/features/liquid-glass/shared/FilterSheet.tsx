/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { useIsPhone } from '../../../hooks/useMediaQuery';

export interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FilterSheet({ open, onClose, children }: FilterSheetProps) {
  const isPhone = useIsPhone();
  if (!open) return null;

  if (!isPhone) {
    return (
      <div className="lg-branch-popover" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    );
  }

  return createPortal(
    <div className="lg-sheet-backdrop" onClick={onClose}>
      <div
        className="lg-sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg-sheet__handle" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export interface SheetItemProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
}

export function SheetItem({ icon: Icon, label, onClick, href }: SheetItemProps) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="lg-sheet-item"
        onClick={onClick}
      >
        <Icon size={18} />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button type="button" className="lg-sheet-item" onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}
