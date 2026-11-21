import { Component, createRef, type ReactNode } from 'react';
import { recordError } from '../app/version';

interface Props {
  children: ReactNode;
  /** Changes when the student goes to another screen; a new screen gets a fresh chance to render. */
  resetKey: string;
  onHome: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches a screen that fails to render (for example one unexpected record) so the student sees a way
 * out instead of a blank page. It wraps the screen only: the tab bar stays usable, so Settings (backup,
 * feedback) can always be reached. The error's shape goes to the local error log, never off the device.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };
  private readonly titleRef = createRef<HTMLHeadingElement>();

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    recordError(`Screen error: ${error.name}: ${error.message}`);
  }

  override componentDidUpdate(prev: Props, prevState: State): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
    // Screen readers and keyboard users land on the explanation, like on any new screen.
    if (!prevState.error && this.state.error) this.titleRef.current?.focus();
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <section aria-labelledby="crash-title" data-testid="screen-error">
        <h1 id="crash-title" tabIndex={-1} ref={this.titleRef}>This screen couldn&apos;t be shown</h1>
        <p>Your decks and answers are still saved on this device.</p>
        <div className="row">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              this.setState({ error: null }); // also retries when Today itself was the screen that failed
              this.props.onHome();
            }}
          >
            Back to Today
          </button>
          <button type="button" className="btn" onClick={() => window.location.reload()}>Reload the app</button>
        </div>
        <p className="hint">If it keeps happening, go to Settings → Copy feedback info and send it to us. It never includes your questions.</p>
      </section>
    );
  }
}
