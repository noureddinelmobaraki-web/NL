import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class VizErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('[Visualizer] crashed:', error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
          Visualizer unavailable on this device
        </div>
      );
    }
    return this.props.children;
  }
}
