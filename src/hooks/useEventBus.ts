import { useEffect, useCallback, useRef } from 'react';

type EventMap = {
  'song:play':   { songId: number; src: string };
  'song:stop':   void;
  'song:next':   void;
  'song:prev':   void;
  'gallery:open':  { type: 'mebit' | 'lens'; index: number };
  'gallery:close': { type: 'mebit' | 'lens' };
  'mood:trigger':  void;
  'theme:change':  { from: string; to: string };
  'section:enter': { id: string };
};

type Listener<K extends keyof EventMap> = (payload: EventMap[K]) => void;

class EventBus {
  private listeners = new Map<keyof EventMap, Set<Listener<any>>>();

  on<K extends keyof EventMap>(event: K, fn: Listener<K>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    this.listeners.get(event)?.forEach(fn => {
      try { fn(payload); } catch (e) {
        if (import.meta.env.DEV) console.error(`[EventBus] listener for ${event} threw:`, e);
      }
    });
  }
}

export const eventBus = new EventBus();

export function useEventListener<K extends keyof EventMap>(event: K, handler: Listener<K>) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const fn: Listener<K> = (payload) => handlerRef.current(payload);
    return eventBus.on(event, fn);
  }, [event]);
}

export function useEventEmitter() {
  return useCallback(<K extends keyof EventMap>(event: K, payload: EventMap[K]) => {
    eventBus.emit(event, payload);
  }, []);
}
