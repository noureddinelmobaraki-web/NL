import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type ActiveButtonContext = 'page' | 'lens' | 'mebit' | 'songs-modal' | 'win12';

export interface RegisteredButton {
  id: string;
  priority: number;
  allowedContexts: ActiveButtonContext[];
  slot: 'topRight' | 'topRight2' | 'bottomRight' | 'topLeft' | 'bottomLeft';
  render: () => React.ReactNode;
}

export interface ButtonContextType {
  activeContext: ActiveButtonContext;
  setContext: (context: ActiveButtonContext) => void;
  registerButton: (btn: RegisteredButton) => void;
  unregisterButton: (id: string) => void;
}

const ButtonContext = createContext<ButtonContextType | undefined>(undefined);

export const useButtonContext = () => {
  const context = useContext(ButtonContext);
  if (!context) {
    throw new Error('useButtonContext must be used within a ButtonProvider');
  }
  return context;
};

interface ButtonProviderProps {
  children: React.ReactNode;
}

export const ButtonProvider: React.FC<ButtonProviderProps> = ({ children }) => {
  const [activeContext, setActiveContext] = useState<ActiveButtonContext>('page');
  const [buttons, setButtons] = useState<Map<string, RegisteredButton>>(new Map());

  const registerButton = useCallback((btn: RegisteredButton) => {
    setButtons(prev => {
      const next = new Map(prev);
      next.set(btn.id, btn);
      return next;
    });
  }, []);

  const unregisterButton = useCallback((id: string) => {
    setButtons(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const setContext = useCallback((context: ActiveButtonContext) => {
    setActiveContext(context);
  }, []);

  // Update body classes and data attributes for styling/control
  useEffect(() => {
    if (activeContext !== 'page') {
      document.body.classList.add('has-active-modal');
      document.body.setAttribute('data-has-active-modal', 'true');
    } else {
      document.body.classList.remove('has-active-modal');
      document.body.setAttribute('data-has-active-modal', 'false');
    }

    const contexts: ActiveButtonContext[] = ['page', 'lens', 'mebit', 'songs-modal', 'win12'];
    contexts.forEach(name => {
      document.body.classList.remove(`modal-context-${name}`);
    });
    document.body.classList.add(`modal-context-${activeContext}`);
    document.body.setAttribute('data-modal-context', activeContext);
  }, [activeContext]);

  // Sort and group active buttons by slot
  const activeButtons = Array.from(buttons.values()).filter(btn =>
    btn.allowedContexts.includes(activeContext)
  );

  const getSlotRendered = (slotName: RegisteredButton['slot']) => {
    const slotButtons = activeButtons
      .filter(btn => btn.slot === slotName)
      .sort((a, b) => b.priority - a.priority); // sort high-priority first, or we can flow them side-by-side cleanly

    if (slotButtons.length === 0) return null;

    return (
      <>
        {slotButtons.map(btn => (
          <React.Fragment key={btn.id}>
            {btn.render()}
          </React.Fragment>
        ))}
      </>
    );
  };

  // Render Slots via React Portal to document.body
  const portalContent = (
    <div id="orchestrator-portal-root" style={{ pointerEvents: 'none' }}>
      <div className="fab-slot-top-right">
        {getSlotRendered('topRight')}
      </div>
      <div className="fab-slot-top-right-2">
        {getSlotRendered('topRight2')}
      </div>
      <div className="fab-slot-bottom-right">
        {getSlotRendered('bottomRight')}
      </div>
    </div>
  );

  return (
    <ButtonContext.Provider value={{ activeContext, setContext, registerButton, unregisterButton }}>
      {children}
      {typeof window !== 'undefined' && createPortal(portalContent, document.body)}
    </ButtonContext.Provider>
  );
};
