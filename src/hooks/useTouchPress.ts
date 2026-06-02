// src/hooks/useTouchPress.ts
import { useState, useCallback } from 'react';

export interface TouchPressResult {
  isPressed: boolean;
  handlers: {
    onPointerDown: () => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerLeave: () => void;
  };
}

export const useTouchPress = (): TouchPressResult => {
  const [isPressed, setIsPressed] = useState(false);

  const onPointerDown = useCallback(() => {
    setIsPressed(true);
  }, []);

  const onPointerUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const onPointerCancel = useCallback(() => {
    setIsPressed(false);
  }, []);

  const onPointerLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  return {
    isPressed,
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
    },
  };
};
