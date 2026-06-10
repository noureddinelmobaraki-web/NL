import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeBitMobileView } from '../MeBitMobileView';

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

describe('MeBitMobileView', () => {
  const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];

  beforeEach(() => {
    (window as any).matchMedia = (q: string) => ({
      matches: false, media: q,
      onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  });

  it('renders correctly in grid mode and displays all images', () => {
    const onOpenView = vi.fn();
    const onClose = vi.fn();

    render(
      <MeBitMobileView
        images={images}
        selectedIndex={0}
        mode="grid"
        onEnterGrid={vi.fn()}
        onOpenView={onOpenView}
        onClose={onClose}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        isMeBitPlaying={false}
        onToggleAudio={vi.fn()}
      />
    );

    // Verify images are displayed
    const renderedImages = screen.getAllByRole('img');
    expect(renderedImages.length).toBe(3);

    // Clicking an image calls onOpenView
    fireEvent.click(renderedImages[1]);
    expect(onOpenView).toHaveBeenCalledWith(1);

    // Clicking close calls onClose
    const closeBtn = screen.getByLabelText('إغلاق المعرض');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders correctly in view mode and allows navigating', () => {
    const onEnterGrid = vi.fn();

    render(
      <MeBitMobileView
        images={images}
        selectedIndex={1}
        mode="view"
        onEnterGrid={onEnterGrid}
        onOpenView={vi.fn()}
        onClose={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        isMeBitPlaying={false}
        onToggleAudio={vi.fn()}
      />
    );

    // In view mode, we check that selected image score indicator is shown
    expect(screen.getByText('2 / 3')).toBeDefined();

    // Back to grid should call onEnterGrid
    const backBtn = screen.getByLabelText('عودة للشبكة');
    fireEvent.click(backBtn);
    expect(onEnterGrid).toHaveBeenCalled();
  });
});
