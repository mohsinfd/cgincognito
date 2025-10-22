/**
 * Results view component
 * Based on PRD Section I4
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { BoostScoreContentResponse } from '@/types/boostscore';
import type { Txn } from '@/types/transaction';
import CategoryReview from './category-review';
import { getCategoryStats, categorizeSmart } from '@/lib/mapper/smart-mapper';
import { saveStatement } from '@/lib/storage/browser-storage';

type Props = {
  statementId: string;
  onReset: () => void;
};

type ViewMode = 'summary' | 'review' | 'complete';

export default function ResultsView({ statementId, onReset }: Props) {
  const [data, setData] = useState<BoostScoreContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [transactionsToReview, setTransactionsToReview] = useState<any[]>([]);
  const [reviewedTransactions, setReviewedTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/cg/stmt/${statementId}/content`);
        const result = await response.json();

        if (response.ok && result.status === 'COMPLETED') {
          setData(result);
          
          // Auto-save to browser storage
          if (result.content) {
            // Try to extract bank code from statement or use 'unknown'
            const bankCode = result.content.card_details?.bank?.toLowerCase() || 'unknown';
            saveStatement(statementId, bankCode, result);
            console.log('✅ Statement saved to browser storage');
          }
          
          // Check which transactions need review
          if (result.content?.transactions) {
            const needsReview = result.content.transactions.filter((txn: any) => {
              const categoryResult = categorizeSmart(
                txn.category || txn.sub_category,
                txn.description,
                txn.amount
              );
              return categoryResult.needsReview;
            });
            
            setTransactionsToReview(needsReview);
            
            // Auto-advance to review if needed
            if (needsReview.length > 0) {
              // Show option to review
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [statementId]);

  if (loading) {
    return <div className="text-center py-12">Loading results...</div>;
  }

  const handleReviewComplete = (updated: any[]) => {
    setReviewedTransactions(updated);
    setViewMode('complete');
    // TODO: Save updated categories to database
  };

  if (!data || !data.content) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-600 mb-4">No data available</p>
        <button
          onClick={onReset}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Upload Another
        </button>
      </div>
    );
  }

  const { content } = data;
  const stats = getCategoryStats(content.transactions);

  // Show review mode
  if (viewMode === 'review' && transactionsToReview.length > 0) {
    return (
      <div className="space-y-6">
        <CategoryReview
          transactions={transactionsToReview}
          onComplete={handleReviewComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Review Banner */}
      {transactionsToReview.length > 0 && viewMode === 'summary' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                {transactionsToReview.length} transactions need your review
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                We auto-categorized {stats.high + stats.medium} transactions, but need your help with {stats.needsReview} unclear ones for better accuracy.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => setViewMode('review')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition"
                >
                  Review Now ({transactionsToReview.length})
                </button>
                <button
                  onClick={() => setTransactionsToReview([])}
                  className="ml-3 text-yellow-700 hover:text-yellow-900"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Stats */}
      {content.transactions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Categorization Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.high}</div>
              <div className="text-sm text-gray-600">High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.medium}</div>
              <div className="text-sm text-gray-600">Medium Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{stats.low}</div>
              <div className="text-sm text-gray-600">Need Review</div>
            </div>
          </div>
        </div>
      )}
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-4">Statement Summary</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Bank</p>
            <p className="text-lg font-semibold">{content.card_details.bank}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Card</p>
            <p className="text-lg font-semibold">{content.card_details.card_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Dues</p>
            <p className="text-lg font-semibold">₹{content.summary.total_dues.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Transactions</p>
            <p className="text-lg font-semibold">{content.transactions.length}</p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-4">Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {content.transactions.map((txn, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm">{txn.date}</td>
                  <td className="px-4 py-3 text-sm">{txn.description}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${
                        txn.type === 'Dr' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {txn.type === 'Dr' ? 'Debit' : 'Credit'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    ₹{txn.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Success Banner */}
      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700">
              ✅ Statement saved! You can view it anytime in{' '}
              <Link href="/statements" className="font-semibold underline">
                My Statements
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 flex-wrap">
        <Link
          href="/statements"
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
        >
          View My Statements
        </Link>
        <Link
          href={`/diagnostic/${statementId}`}
          className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition"
        >
          🔍 View Diagnostic
        </Link>
        <button
          onClick={onReset}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Upload Another
        </button>
      </div>
    </div>
  );
}
