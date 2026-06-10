import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LensMobileView } from '../LensMobileView';

vi.mock('framer-motion', () => ({
  motion: {
    img: (props: any) => {
      const { layoutId, ...rest } = props;
      return React.createElement('img', rest);
    },
    div: (props: any) => {
      const { layoutId, ...rest } = props;
      return React.createElement('div', rest, props.children);
    }
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe('LensMobileView', () => {
  const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];

  beforeEach(() => {
    (window as any).matchMedia = (q: string) => ({
      matches: false, media: q,
      onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  });

  it('renders correctly in grid mode and displays all photos', () => {
    const onOpenView = vi.fn();
    const onClose = vi.fn();

    render(
      <LensMobileView
        photos={photos}
        selectedIndex={0}
        mode="grid"
        isMuted={false}
        uiVisible={true}
        onEnterGrid={vi.fn()}
        onOpenView={onOpenView}
        onIndexChange={vi.fn()}
        onClose={onClose}
        onToggleMute={vi.fn()}
      />
    );

    // Verify photos are displayed
    const renderedPhotos = screen.getAllByRole('img');
    expect(renderedPhotos.length).toBe(3);

    // Clicking a photo calls onOpenView
    fireEvent.click(renderedPhotos[2]);
    expect(onOpenView).toHaveBeenCalledWith(2);

    // Clicking close calls onClose
    const closeBtn = screen.getByLabelText('إغلاق المعرض');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders correctly in view mode and allows navigating', () => {
    const onEnterGrid = vi.fn();

    render(
      <LensMobileView
        photos={photos}
        selectedIndex={0}
        mode="view"
        isMuted={false}
        uiVisible={true}
        onEnterGrid={onEnterGrid}
        onOpenView={vi.fn()}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
        onToggleMute={vi.fn()}
      />
    );

    // In view mode, check indicator
    expect(screen.getByText('1 / 3')).toBeDefined();

    // Back to grid should call onEnterGrid
    const backBtn = screen.getByLabelText('عودة للشبكة');
    fireEvent.click(backBtn);
    expect(onEnterGrid).toHaveBeenCalled();
  });
});
