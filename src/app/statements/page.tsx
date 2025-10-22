/**
 * My Statements page
 * Shows all stored statements from browser storage
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStatements, deleteStatement, getStorageInfo, type StoredStatement } from '@/lib/storage/browser-storage';

export default function StatementsPage() {
  const [statements, setStatements] = useState<StoredStatement[]>([]);
  const [storageInfo, setStorageInfo] = useState({ statementCount: 0, estimatedSize: '0 KB', maxStatements: 10 });

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = () => {
    setStatements(getStatements());
    setStorageInfo(getStorageInfo());
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this statement? This cannot be undone.')) {
      deleteStatement(id);
      loadStatements();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Statements
            </h1>
            <p className="text-gray-600">
              {storageInfo.statementCount} statements stored locally ({storageInfo.estimatedSize})
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              💡 Optimizer
            </Link>
            <Link
              href="/upload"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Upload New
            </Link>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>PoC Mode:</strong> Your statements are stored in your browser (not on a server). 
                They'll persist between sessions but won't sync across devices. 
                Clearing browser data will delete them.
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {statements.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-semibold mb-2">No statements yet</h2>
            <p className="text-gray-600 mb-6">
              Upload your first credit card statement to get started
            </p>
            <Link
              href="/upload"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Upload Statement
            </Link>
          </div>
        )}

        {/* Statements List */}
        {statements.length > 0 && (
          <div className="space-y-4">
            {statements.map((stmt) => (
              <div
                key={stmt.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">
                        {stmt.bankCode.toUpperCase()}
                      </h3>
                      {stmt.cardLast4 && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                          •••• {stmt.cardLast4}
                        </span>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Uploaded:</span>{' '}
                        {new Date(stmt.uploadedAt).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Transactions:</span>{' '}
                        {stmt.transactionCount}
                      </div>
                      <div>
                        <span className="font-medium">Total Dues:</span>{' '}
                        ₹{stmt.totalAmount.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Link
                        href={`/statements/${stmt.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details →
                      </Link>
                      <button
                        onClick={() => handleDelete(stmt.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Completed
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Storage Warning */}
        {statements.length >= storageInfo.maxStatements - 2 && (
          <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm text-yellow-700">
              ⚠️ You're approaching the storage limit ({statements.length}/{storageInfo.maxStatements} statements). 
              Consider deleting old statements to make room for new ones.
            </p>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
