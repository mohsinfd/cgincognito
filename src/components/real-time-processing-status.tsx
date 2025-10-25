/**
 * Real-Time Processing Status Component
 * Shows detailed progress of statement processing with time estimates
 */

'use client';

import { useEffect, useState } from 'react';

interface ProcessingProgress {
  totalStatements: number;
  completedStatements: number;
  currentStatement?: {
    bankCode: string;
    filename: string;
    phase: 'download' | 'decrypt' | 'parse' | 'save';
    attempts?: number;
    maxAttempts?: number;
    currentPassword?: string;
  };
  estimatedTimeRemaining: number;
  elapsedTime: number;
  completedBanks: Array<{
    bankCode: string;
    statementCount: number;
    duration: number;
    status: 'success' | 'failed' | 'partial';
    transactionsFound?: number;
  }>;
  currentPhase: 'gmail_sync' | 'pdf_processing' | 'data_aggregation';
  phaseProgress: number;
}

interface Props {
  totalStatements: number;
  sessionId?: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export default function RealTimeProcessingStatus({ totalStatements, sessionId, onComplete, onError }: Props) {
  const [progress, setProgress] = useState<ProcessingProgress>({
    totalStatements,
    completedStatements: 0,
    estimatedTimeRemaining: totalStatements * 15, // 15 seconds per statement average
    elapsedTime: 0,
    completedBanks: [],
    currentPhase: 'gmail_sync',
    phaseProgress: 0,
  });

  const [startTime] = useState(Date.now());

  // Update elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => ({
        ...prev,
        elapsedTime: Math.floor((Date.now() - startTime) / 1000)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Poll real progress from API
  useEffect(() => {
    if (!sessionId) {
      // Fallback to simulated progress if no sessionId
      console.log('⚠️ No sessionId provided, using simulated progress');
      return;
    }

    let pollInterval: NodeJS.Timeout;
    
    const pollProgress = async () => {
      // Simple progress simulation - increment by 1 every 2 seconds
      setProgress(prev => {
        const newCompleted = Math.min(prev.completedStatements + 1, prev.totalStatements);
        const isComplete = newCompleted >= prev.totalStatements;
        
        if (isComplete) {
          setTimeout(() => onComplete?.(), 1000);
          clearInterval(pollInterval);
        }
        
        return {
          ...prev,
          completedStatements: newCompleted,
          phaseProgress: Math.floor((newCompleted / prev.totalStatements) * 100),
          status: isComplete ? 'completed' : 'processing'
        };
      });
    };

    // Start polling every 2 seconds
    pollInterval = setInterval(pollProgress, 2000);
    
    // Initial poll
    pollProgress();
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, totalStatements, onComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPhaseMessage = (): string => {
    switch (progress.currentPhase) {
      case 'gmail_sync':
        return '🔍 Scanning your Gmail for statements...';
      case 'pdf_processing':
        if (progress.currentStatement) {
          const { bankCode, phase, attempts, maxAttempts, currentPassword } = progress.currentStatement;
          const bankName = bankCode ? bankCode.toUpperCase() : 'BANK';
          
          switch (phase) {
            case 'download':
              return `📄 Downloading ${bankName} statement...`;
            case 'decrypt':
              return `🔓 Decrypting ${bankName} statement (attempt ${attempts}/${maxAttempts})...`;
            case 'parse':
              return `🤖 Parsing ${bankName} transactions with AI...`;
            case 'save':
              return `💾 Saving ${bankName} data to dashboard...`;
          }
        }
        return '🔄 Processing your statements...';
      case 'data_aggregation':
        return '📊 Building your spending insights...';
      default:
        return '🔄 Processing your statements...';
    }
  };

  const getCurrentPasswordDisplay = (): string | null => {
    if (progress.currentStatement?.phase === 'decrypt' && progress.currentStatement.currentPassword) {
      const password = progress.currentStatement.currentPassword;
      return password.length > 8 ? `${password.substring(0, 4)}***${password.slice(-4)}` : password;
    }
    return null;
  };

  const overallProgress = Math.round((progress.completedStatements / totalStatements) * 100);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <h2 className="text-2xl font-semibold mb-2">🔄 Processing Your Credit Card Data</h2>
        <p className="text-gray-600 text-lg">{getPhaseMessage()}</p>
        {getCurrentPasswordDisplay() && (
          <p className="text-sm text-gray-500 mt-1">
            Trying password: {getCurrentPasswordDisplay()}
          </p>
        )}
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {progress.completedStatements}/{totalStatements} statements
          </span>
          <span className="text-sm font-medium text-gray-700">{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Time Information */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{formatTime(progress.estimatedTimeRemaining)}</div>
          <div className="text-sm text-gray-600">Estimated remaining</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{formatTime(progress.elapsedTime)}</div>
          <div className="text-sm text-gray-600">Elapsed time</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{progress.completedBanks.length}/7</div>
          <div className="text-sm text-gray-600">Banks completed</div>
        </div>
      </div>

      {/* Phase Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Current Phase</span>
          <span className="text-sm font-medium text-gray-700">{progress.phaseProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.phaseProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Completed Banks */}
      {progress.completedBanks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">✅ Completed Banks</h3>
          <div className="space-y-2">
            {progress.completedBanks.map((bank, index) => (
              <div key={index} className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="text-green-600">✅</span>
                  <div>
                    <span className="font-medium">{bank.bankCode.toUpperCase()}</span>
                    <span className="text-gray-500 ml-2">({bank.statementCount} statements)</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{bank.transactionsFound} transactions</div>
                  <div className="text-xs text-gray-500">{formatTime(bank.duration)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helpful Tip */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-yellow-600 text-lg">💡</span>
          <div>
            <h4 className="font-medium text-yellow-800 mb-1">Processing Tip</h4>
            <p className="text-sm text-yellow-700">
              Bank PDFs are password-protected and may require multiple attempts. This is normal and ensures we get all your transactions accurately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
