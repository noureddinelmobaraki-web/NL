/**
 * Minimal renderHook utility — avoids a hard dependency on
 * @testing-library/react. Mounts a tiny harness component that calls the
 * hook and stores its return value in a mutable ref-like wrapper.
 *
 * Supports:
 *   • result.current   — latest hook return value
 *   • rerender(props)  — re-invoke with new props
 *   • unmount()        — clean unmount with effect cleanup
 *
 * Uses React 19's createRoot. Wraps interactions in `act` for synchronous
 * effect flushing.
 */
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

// Silence React 19's "environment not configured to support act" warnings.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

export interface HookResult<TReturn> {
  current: TReturn;
}

export interface RenderHookHandle<TReturn, TProps> {
  result: HookResult<TReturn>;
  rerender: (props?: TProps) => void;
  unmount: () => void;
}

export function renderHook<TReturn, TProps = void>(
  callback: (props: TProps) => TReturn,
  initialProps?: TProps,
): RenderHookHandle<TReturn, TProps> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const result: HookResult<TReturn> = { current: undefined as unknown as TReturn };

  let currentProps = initialProps as TProps;

  const Harness: React.FC<{ p: TProps }> = ({ p }) => {
    result.current = callback(p);
    return null;
  };

  act(() => {
    root.render(React.createElement(Harness, { p: currentProps }));
  });

  return {
    result,
    rerender(next?: TProps) {
      currentProps = (next ?? currentProps) as TProps;
      act(() => {
        root.render(React.createElement(Harness, { p: currentProps }));
      });
    },
    unmount() {
      act(() => { root.unmount(); });
      container.remove();
    },
  };
}

/** Re-export act for callers (parity with @testing-library/react). */
export { act };

/**
 * Tiny polling helper — replaces @testing-library/react's `waitFor`.
 */
export async function waitFor(
  predicate: () => void | boolean,
  { timeout = 1000, interval = 10 }: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const start = Date.now();
  let lastErr: unknown = null;
  while (Date.now() - start < timeout) {
    try {
      const r = predicate();
      if (r !== false) return;
    } catch (e) { lastErr = e; }
    await new Promise((res) => setTimeout(res, interval));
  }
  throw lastErr ?? new Error('waitFor timed out');
}
