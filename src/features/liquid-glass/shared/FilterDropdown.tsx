/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useId, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDismiss } from './hooks/useDismiss';

export interface DropdownOption {
  readonly id: string;
  readonly label: string;
}

export interface FilterDropdownProps {
  label: string;
  icon: LucideIcon;
  options: readonly DropdownOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  isActive?: boolean;
}

export function FilterDropdown({
  label,
  icon: Icon,
  options,
  selectedId,
  onSelect,
  open,
  onToggle,
  onClose,
  isActive,
}: FilterDropdownProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useDismiss<HTMLDivElement>({ open, onDismiss: onClose, triggerRef });
  const derivedActive = isActive ?? selectedId !== options[0]?.id;

  return (
    <div className="lg-branch-filter-group">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`lg-glass-pill lg-filter-pill ${
          derivedActive || open ? 'lg-filter-pill--active' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title={label}
      >
        <Icon size={14} />
        <span className="lg-filter-pill__label">{label}</span>
        <ChevronDown
          size={13}
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && (
        <div
          id={listId}
          ref={panelRef}
          role="listbox"
          className="lg-branch-popover"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={selectedId === opt.id}
              onClick={() => {
                onSelect(opt.id);
                onClose();
                triggerRef.current?.focus();
              }}
              className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                selectedId === opt.id ? 'lg-filter-pill--active' : ''
              }`}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
