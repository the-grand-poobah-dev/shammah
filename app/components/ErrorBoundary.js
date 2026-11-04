'use client';
import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[Shammah ErrorBoundary caught]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="section-error-boundary-card" role="alert">
          <div className="seb-icon-circle">
            <AlertCircle size={28} className="text-amber-500" />
          </div>

          <h3 className="seb-title">
            {this.props.sectionName
              ? `Unable to load ${this.props.sectionName}`
              : 'Something interrupted this section'}
          </h3>

          <p className="seb-message">
            Grace and peace to you. A temporary client rendering issue occurred. Tap below to reload the section.
          </p>

          <div className="seb-actions">
            <button
              type="button"
              className="seb-retry-btn"
              onClick={this.handleReset}
            >
              <RefreshCw size={15} />
              <span>Retry</span>
            </button>

            <button
              type="button"
              className="seb-home-btn"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
            >
              <Home size={15} />
              <span>Return to Feed</span>
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="seb-details">
              <summary>Technical Details (Dev Only)</summary>
              <pre className="seb-pre">{this.state.error.toString()}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
