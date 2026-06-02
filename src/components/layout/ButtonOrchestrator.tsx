import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type ActiveButtonContext = 'page' | 'lens' | 'mebit' | 'songs-modal';

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
    // PATCH: Also set data attribute on portal root for CSS targeting
    const portal = document.getElementById('orchestrator-portal-root');
    if (portal) {
      portal.dataset.activeContext = activeContext;
    }
    
    if (activeContext !== 'page') {
      document.body.classList.add('has-active-modal');
      document.body.setAttribute('data-has-active-modal', 'true');
    } else {
      document.body.classList.remove('has-active-modal');
      document.body.setAttribute('data-has-active-modal', 'false');
    }

    const contexts: ActiveButtonContext[] = ['page', 'lens', 'mebit', 'songs-modal'];
    contexts.forEach(name => {
      document.body.classList.remove(`modal-context-${name}`);
    });
    document.body.classList.add(`modal-context-${activeContext}`);
    document.body.setAttribute('data-modal-context', activeContext);
    // Mark page-active for CSS transition timing
    document.body.setAttribute('data-page-active', activeContext === 'page' ? 'true' : 'false');
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

  // Compute visibility per slot for ALL viewports
  const topRightButtons  = getSlotRendered('topRight');
  const topRight2Buttons = getSlotRendered('topRight2');
  const bottomRightButtons = getSlotRendered('bottomRight');

  // Use data attributes to signal CSS that slots have content
  const portalContent = (
    <div
      id="orchestrator-portal-root"
      style={{ pointerEvents: 'none' }}
      data-active-context={activeContext}
    >
      <div
        className="fab-slot-top-right"
        data-has-content={topRightButtons !== null ? 'true' : 'false'}
      >
        {topRightButtons}
      </div>
      <div
        className="fab-slot-top-right-2"
        data-has-content={topRight2Buttons !== null ? 'true' : 'false'}
      >
        {topRight2Buttons}
      </div>
      <div
        className="fab-slot-bottom-right"
        data-has-content={bottomRightButtons !== null ? 'true' : 'false'}
      >
        {bottomRightButtons}
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
