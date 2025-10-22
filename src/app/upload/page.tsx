/**
 * Statement upload page
 */

'use client';

import { useState } from 'react';
import UploadForm from '@/components/upload-form';
import ProcessingState from '@/components/processing-state';
import ResultsView from '@/components/results-view';

type PageState = 'form' | 'processing' | 'results' | 'error';

export default function UploadPage() {
  const [state, setState] = useState<PageState>('form');
  const [statementId, setStatementId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadSuccess = (id: string) => {
    setStatementId(id);
    setState('processing');
  };

  const handleProcessingComplete = () => {
    setState('results');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setState('error');
  };

  const handleReset = () => {
    setState('form');
    setStatementId(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upload Statement
          </h1>
          <p className="text-gray-600">
            Upload your credit card statement (PDF or ZIP, max 10MB)
          </p>
        </header>

        {state === 'form' && (
          <UploadForm
            onSuccess={handleUploadSuccess}
            onError={handleError}
          />
        )}

        {state === 'processing' && statementId && (
          <ProcessingState
            statementId={statementId}
            onComplete={handleProcessingComplete}
            onError={handleError}
          />
        )}

        {state === 'results' && statementId && (
          <ResultsView
            statementId={statementId}
            onReset={handleReset}
          />
        )}

        {state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Error
            </h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleReset}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

