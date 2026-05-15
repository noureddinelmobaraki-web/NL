import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; sectionName?: string; }
interface State { hasError: boolean; }

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[${this.props.sectionName || 'Section'}] crashed:`, error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          — section unavailable —
        </div>
      );
    }
    return this.props.children;
  }
}
