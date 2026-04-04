import React, { Component } from 'react';
import { AlertCircle } from 'lucide-react';

export class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      if (this.state.error && this.state.error.message) {
        errorMessage = this.state.error.message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">Something went wrong</h2>
            <p className="text-gray-500 mb-8 font-medium">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#141414] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
