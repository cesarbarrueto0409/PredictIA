import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en la interfaz", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ground p-6">
          <div className="max-w-lg rounded-card border border-line bg-surface p-6">
            <h1 className="text-title font-semibold text-ink">Algo salió mal</h1>
            <p className="mt-2 text-body text-muted">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 h-9 rounded-control bg-ink px-4 text-body font-medium text-surface"
            >
              Recargar la aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
