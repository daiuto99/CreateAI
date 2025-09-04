import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 React Error Boundary caught an error:');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Stack:', error.stack);
    
    // Log to session storage for debugging
    const debugInfo = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      componentStack: errorInfo.componentStack,
      url: window.location.href
    };
    
    try {
      sessionStorage.setItem('last-error', JSON.stringify(debugInfo));
      console.error('🔍 Error details saved to sessionStorage["last-error"]');
    } catch (e) {
      console.error('Failed to save error to sessionStorage:', e);
    }
    
    this.setState({ hasError: true, error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
          <div className="max-w-lg w-full bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-4">
              Application Error Detected
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  An unexpected error occurred. Details have been logged to the browser console.
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Show Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded border font-mono text-xs overflow-auto max-h-40">
                    <div><strong>Error:</strong> {this.state.error?.message}</div>
                    <div className="mt-2"><strong>Stack:</strong></div>
                    <pre className="whitespace-pre-wrap text-xs">{this.state.error?.stack}</pre>
                  </div>
                </details>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => {
                    console.log('Stored error info:', sessionStorage.getItem('last-error'));
                    alert('Check browser console for detailed error information');
                  }}
                  className="px-4 py-2 border border-border rounded hover:bg-muted text-sm"
                >
                  Show Debug Info
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Debug helper to check for common issues
export const debugCreateAI = () => {
  console.log('🔍 CreateAI Debug Information:');
  console.log('Current URL:', window.location.href);
  console.log('User Agent:', navigator.userAgent);
  console.log('Local Storage Keys:', Object.keys(localStorage));
  console.log('Session Storage Keys:', Object.keys(sessionStorage));
  
  // Check for stored auth data
  console.log('Stored auth data:', localStorage.getItem('auth_method'));
  console.log('Pending feature:', localStorage.getItem('pendingFeature'));
  
  // Check last error
  const lastError = sessionStorage.getItem('last-error');
  if (lastError) {
    console.log('Last Error:', JSON.parse(lastError));
  }
  
  // Firebase info (if available)
  if (typeof window !== 'undefined' && (window as any).firebase) {
    console.log('Firebase SDK loaded:', true);
  }
  
  return 'Debug info logged to console';
};

// Make debug function available globally
(window as any).debugCreateAI = debugCreateAI;