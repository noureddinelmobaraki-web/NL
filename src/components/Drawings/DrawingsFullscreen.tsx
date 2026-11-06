import { useRef } from 'react';
import { getGenieOrigin, genieOriginToTransformOrigin } from '../../transitions/genieOrigin';
import { VideoData } from './types';
import { VideoCard } from './VideoCard';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useDeviceType } from '../../hooks/useDeviceType'; // MOBILE-ONLY
import { useAutoHideUI } from '../../hooks/useAutoHideUI';
import { useFullscreenManager } from '../../hooks/useFullscreenManager';
import { useDrawingsFullscreenGestures } from './useDrawingsFullscreenGestures';
import { DrawingsFullscreenHud } from './DrawingsFullscreenControls';

interface DrawingsFullscreenProps {
  videos: VideoData[];
  activeIndex: number;
  onIndexChange?: (index: number) => void; // MOBILE-ONLY
  isMuted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onNext: () => void; // VIEWPORT-AWARE
  onPrev: () => void; // VIEWPORT-AWARE
  onTouchStart: (e: React.TouchEvent) => void; // VIEWPORT-AWARE
  onTouchEnd: (e: React.TouchEvent) => void; // VIEWPORT-AWARE
  onRef: (el: HTMLVideoElement | null, i: number) => void;
}

export const DrawingsFullscreen = ({
  videos,
  activeIndex,
  onIndexChange,
  isMuted,
  onClose,
  onToggleMute,
  onNext,
  onPrev,
  onTouchStart,
  onTouchEnd,
  onRef,
}: DrawingsFullscreenProps) => {
  const resolvedTheme = useResolvedTheme();
  const { isMobile, isTablet } = useDeviceType(); // MOBILE-ONLY
  const scrollContainerRef = useRef<HTMLDivElement>(null); // MOBILE-ONLY
  const isUIVisible = useAutoHideUI(true, 2000);

  void onNext;
  void onPrev;
  void onTouchStart;
  void onTouchEnd;

  useFullscreenManager(true, {
    bodyClass: 'drawings-fullscreen-active',
    onEscape: onClose,
    lockOrientation: 'portrait',
    enabled: isMobile || isTablet,
  });

  const {
    viewportHeight,
    showProgressCounter,
    showSwipeHint,
    handleTouchStart,
    handleTouchEnd,
    goTo,
  } = useDrawingsFullscreenGestures({
    scrollContainerRef,
    activeIndex,
    videosLength: videos.length,
    onIndexChange,
    onClose,
  });

  return (
    <div
      id="drawings-fullscreen-overlay"
      className={`fixed inset-0 overflow-hidden genie-surface ${resolvedTheme === 'light' ? 'bg-white' : 'bg-black'}`}
      data-genie="open"
      style={{
        ['--genie-origin' as string]: genieOriginToTransformOrigin(getGenieOrigin()),
        transformOrigin: 'var(--genie-origin)',
        zIndex: 9010,
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        overscrollBehavior: 'none',
        contain: 'strict',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        className="relative w-full h-full flex flex-col justify-center items-center"
        style={{
          maxWidth: (isMobile || isTablet) ? '100%' : '430px',
          height: '100dvh',
          minHeight: '-webkit-fill-available',
          position: 'relative',
          backgroundColor: '#000000',
          boxShadow: isMobile ? 'none' : '0 24px 60px rgba(0,0,0,0.85)',
          overflow: 'hidden',
          borderRadius: isMobile ? '0px' : '16px',
        }}
      >
        <div
          ref={scrollContainerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full no-scrollbar relative"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100dvh',
            overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehaviorY: 'contain',
            willChange: 'scroll-position',
            scrollBehavior: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {videos.map((video, idx) => (
            <VideoCard
              key={video.id}
              video={video}
              index={idx}
              activeIndex={activeIndex}
              isMobileView={true}
              isMuted={isMuted}
              total={videos.length}
              onRef={(el) => onRef(el, idx)}
            />
          ))}
        </div>

        <DrawingsFullscreenHud
          activeIndex={activeIndex}
          totalVideos={videos.length}
          activeTitle={videos[activeIndex]?.title}
          isUIVisible={isUIVisible}
          showProgressCounter={showProgressCounter}
          showSwipeHint={showSwipeHint}
          isMuted={isMuted}
          isMobile={isMobile}
          isTablet={isTablet}
          viewportHeight={viewportHeight}
          onClose={onClose}
          onToggleMute={onToggleMute}
          onGoTo={goTo}
        />
      </div>
    </div>
  );
};
