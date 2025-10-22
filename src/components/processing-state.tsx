/**
 * Processing state component with polling
 * Based on PRD Section I3
 */

'use client';

import { useEffect, useState } from 'react';

type Props = {
  statementId: string;
  onComplete: () => void;
  onError: (error: string) => void;
};

export default function ProcessingState({ statementId, onComplete, onError }: Props) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    let attempt = 0;
    let delay = 2000; // Start with 2s

    const poll = async () => {
      try {
        const response = await fetch(`/api/cg/stmt/${statementId}/content`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Polling failed');
        }

        if (data.status === 'COMPLETED') {
          setProgress(100);
          setTimeout(() => onComplete(), 500);
          return;
        }

        if (data.status === 'FAILED') {
          throw new Error(data.error_message || 'Processing failed');
        }

        // Still pending - schedule next poll
        attempt++;
        const nextDelay = Math.min(delay * 1.5, 5000); // 2s → 3s → 5s → 5s
        
        // Simulate progress (not accurate, just for UX)
        setProgress(Math.min(90, attempt * 10));
        
        setTimeout(() => {
          delay = nextDelay;
          poll();
        }, delay);

      } catch (error: any) {
        onError(error.message || 'Unknown error');
      }
    };

    // Start polling
    poll();

    // Update elapsed timer
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [statementId, onComplete, onError]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>

      <h2 className="text-2xl font-semibold mb-2">Processing Statement</h2>
      <p className="text-gray-600 mb-6">
        Parsing transactions... {elapsed}s elapsed
      </p>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
        <div
          className="bg-blue-600 h-4 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <p className="text-sm text-gray-500">
        This usually takes 10-30 seconds
      </p>
    </div>
  );
}

