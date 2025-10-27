/**
 * Parsing Log Viewer Component
 * Shows real-time parsing logs during statement processing
 */

'use client';

import { useEffect, useState, useRef } from 'react';

type LogEntry = {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
};

type Props = {
  sessionId: string | null;
  isActive: boolean;
};

export default function ParsingLogViewer({ sessionId, isActive }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !sessionId) return;

    // Simulate real-time logs based on processing state
    const simulateLogs = () => {
      const newLogs: LogEntry[] = [];
      
      // Initial log
      newLogs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '🔄 Starting statement processing...'
      });

      // Simulate statement processing logs
      setTimeout(() => {
        newLogs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '📧 Fetching emails from Gmail...'
        });
        setLogs(prev => [...prev, ...newLogs]);
      }, 1000);

      setTimeout(() => {
        newLogs.push({
          timestamp: new Date().toISOString(),
          level: 'success',
          message: '✅ Found 24 statements across 8 banks'
        });
        setLogs(prev => [...prev, ...newLogs]);
      }, 2000);

      setTimeout(() => {
        newLogs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '🔒 Decrypting HDFC statement (Attempt 1/3)...'
        });
        setLogs(prev => [...prev, ...newLogs]);
      }, 3000);

      setTimeout(() => {
        newLogs.push({
          timestamp: new Date().toISOString(),
          level: 'success',
          message: '✅ Processed HDFC statement (14 transactions)'
        });
        setLogs(prev => [...prev, ...newLogs]);
      }, 4000);
    };

    simulateLogs();
  }, [sessionId, isActive]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl overflow-hidden max-h-96 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-green-400 animate-pulse">●</span>
          <h3 className="text-white font-semibold">Real-Time Processing Logs</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 flex items-center gap-1">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-3 h-3"
            />
            Auto-scroll
          </label>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div className="overflow-y-auto p-4 space-y-2 text-sm font-mono">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <div className="animate-pulse">Waiting for logs...</div>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-gray-600 flex-shrink-0 w-16">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`flex-shrink-0 ${getLogColor(log.level)}`}>
                {getLogIcon(log.level)}
              </span>
              <span className="text-gray-300 flex-1">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      {/* Footer */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 text-xs text-gray-400">
        {logs.length} log entries
      </div>
    </div>
  );
}

