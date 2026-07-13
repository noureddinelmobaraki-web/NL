import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeCords } from '../HomeCords';

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];

  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(_callback: ResizeObserverCallback) {
    ResizeObserverMock.instances.push(this);
  }
}

class MutationObserverMock {
  static instances: MutationObserverMock[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(_callback: MutationCallback) {
    MutationObserverMock.instances.push(this);
  }
}

describe('HomeCords lifecycle', () => {
  beforeEach(() => {
    ResizeObserverMock.instances = [];
    MutationObserverMock.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('MutationObserver', MutationObserverMock);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not subscribe geometry measurement to viewport scrolling', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    render(<HomeCords links={[]} nodes={[]} motionMode="normal" />);

    const registeredEvents = addSpy.mock.calls.map(([type]) => type);
    expect(registeredEvents).toContain('resize');
    expect(registeredEvents).toContain('load');
    expect(registeredEvents).not.toContain('scroll');
    expect(ResizeObserverMock.instances).toHaveLength(1);
    expect(ResizeObserverMock.instances[0].observe).toHaveBeenCalled();
    expect(MutationObserverMock.instances).toHaveLength(1);
  });

  it('keeps resize and load cleanup balanced without a scroll cleanup', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const view = render(<HomeCords links={[]} nodes={[]} motionMode="normal" />);

    view.unmount();

    const removedEvents = removeSpy.mock.calls.map(([type]) => type);
    expect(removedEvents).toContain('resize');
    expect(removedEvents).toContain('load');
    expect(removedEvents).not.toContain('scroll');
    expect(ResizeObserverMock.instances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(MutationObserverMock.instances[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('observes chain reveal mutations so ropes appear with revealed cards', () => {
    render(
      <div>
        <section id="station-songs">
          <div className="nl-songs-lite__grid">
            <div className="nl-song-cell" data-song-revealed="false" />
          </div>
        </section>
        <HomeCords
          links={[{
            id: 'songs-ladder',
            kind: 'chain',
            station: 'songs',
            containerSel: '.nl-songs-lite__grid',
            itemSel: '.nl-song-cell[data-song-revealed="true"]',
          }]}
          nodes={[]}
          motionMode="normal"
        />
      </div>,
    );

    expect(MutationObserverMock.instances[0].observe).toHaveBeenCalledWith(
      expect.any(Element),
      expect.objectContaining({
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-song-revealed'],
      }),
    );
  });
});
