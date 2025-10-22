/**
 * Main Dashboard - Monthly Spend & Optimizer
 * Shows spend breakdown and missed savings
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStatements } from '@/lib/storage/browser-storage';
import MonthlySpendSummary from '@/components/monthly-spend-summary';
import OptimizerResults from '@/components/optimizer-results';
import CategoryReview from '@/components/category-review';
import { getTransactionsNeedingReview } from '@/lib/mapper/smart-mapper';

export default function DashboardPage() {
  const [statements, setStatements] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [transactionsToReview, setTransactionsToReview] = useState<any[]>([]);
  const [showCategoryReview, setShowCategoryReview] = useState(false);

  useEffect(() => {
    const loadStatements = () => {
      console.log('🏠 Dashboard loading statements...');
      const stored = getStatements();
      console.log(`📊 Dashboard loaded ${stored.length} statements:`, 
        stored.map(s => `${s.bankCode} (${s.transactionCount} transactions, ₹${s.totalAmount})`));
      
      // Validate and log statement structure
      stored.forEach((stmt, index) => {
        console.log(`📄 Statement ${index + 1} structure:`, {
          bankCode: stmt.bankCode,
          transactionCount: stmt.transactionCount,
          totalAmount: stmt.totalAmount,
          hasContent: !!stmt.content,
          hasNestedContent: !!stmt.content?.content,
          hasTransactions: !!stmt.content?.content?.transactions,
          transactionCount: stmt.content?.content?.transactions?.length || 0,
          hasSummary: !!stmt.content?.content?.summary,
          hasCardDetails: !!stmt.content?.content?.card_details,
          statementDate: stmt.content?.content?.summary?.statement_date
        });
      });
      
      setStatements(stored);
      
      // Check for transactions that need user review
      const allTransactions = stored.flatMap(stmt => {
        const transactions = stmt.content?.content?.transactions || 
                           stmt.content?.transactions || 
                           stmt.transactions || [];
        return transactions.map((txn: any) => ({
          ...txn,
          statementId: stmt.id,
          bankCode: stmt.bankCode
        }));
      });
      
      const needsReview = getTransactionsNeedingReview(allTransactions);
      console.log(`🔍 Found ${needsReview.length} transactions needing review:`, 
        needsReview.map(t => `${t.description} (${t.reason})`));
      
      setTransactionsToReview(needsReview);
      
      // Auto-select most recent month
      if (stored.length > 0) {
        const firstStmt = stored[0];
        const date = firstStmt.content?.content?.summary?.statement_date ||
                    firstStmt.content?.summary?.statement_date ||
                    firstStmt.statement_date;
        
        if (date) {
          console.log(`📅 Setting selected month from date: ${date}`);
          try {
            // Handle different date formats
            let year, month;
            if (date.length === 8 && /^\d{8}$/.test(date)) {
              // DDMMYYYY format
              year = date.substring(4, 8);
              month = date.substring(2, 4);
            } else if (date.includes('-')) {
              // YYYY-MM-DD or YYYY-MM format
              const parts = date.split('-');
              year = parts[0];
              month = parts[1];
            } else if (date.includes('/')) {
              // DD/MM/YYYY format
              const parts = date.split('/');
              if (parts.length === 3) {
                year = parts[2];
                month = parts[1];
              }
            }
            
            if (year && month) {
              const monthKey = `${year}-${month}`;
              setSelectedMonth(monthKey);
              console.log(`📅 Selected month: ${monthKey}`);
            }
          } catch (error) {
            console.error('Error parsing statement date:', error);
          }
        }
      }
      
      setLoading(false);
    };

    loadStatements();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  // Show category review if needed
  if (showCategoryReview && transactionsToReview.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8">
          <div className="mb-6">
            <button
              onClick={() => setShowCategoryReview(false)}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Back to Dashboard
            </button>
          </div>
          <CategoryReview
            transactions={transactionsToReview}
            onComplete={(updated) => {
              console.log('✅ User completed category review:', updated.length);
              setShowCategoryReview(false);
              // TODO: Save updated categories back to localStorage
            }}
          />
        </div>
      </div>
    );
  }

  if (statements.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto py-16">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-3xl font-bold mb-4">No Data Yet</h1>
            <p className="text-gray-600 mb-8">
              Upload your first credit card statement to see your spending insights and optimization recommendations
            </p>
            <Link
              href="/upload"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Upload Statement
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Spend Optimizer
            </h1>
            <p className="text-gray-600">
              See how much you could save with the right cards
            </p>
          </div>
          <Link
            href="/statements"
            className="text-blue-600 hover:text-blue-700"
          >
            📁 My Statements →
          </Link>
        </div>

        {/* Category Review Banner */}
        {transactionsToReview.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-yellow-800">
                  {transactionsToReview.length} transactions need your review
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  We auto-categorized most transactions, but need your help with unclear ones for better accuracy.
                  This will improve your spending insights and card recommendations.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setShowCategoryReview(true)}
                    className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition font-medium"
                  >
                    Review Transactions ({transactionsToReview.length})
                  </button>
                  <button
                    onClick={() => setTransactionsToReview([])}
                    className="ml-3 text-yellow-700 hover:text-yellow-900 font-medium"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <div className="flex items-start gap-6">
            <div className="text-6xl">💡</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">
                Optimize Your Credit Card Rewards
              </h2>
              <p className="text-blue-100 mb-4">
                Based on your spending patterns, we'll show you which cards give you the best rewards 
                and how much you're missing out on each month.
              </p>
              <div className="flex gap-4">
                <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                  <div className="text-sm text-blue-100">Statements Analyzed</div>
                  <div className="text-2xl font-bold">{statements.length}</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                  <div className="text-sm text-blue-100">Total Transactions</div>
                  <div className="text-2xl font-bold">
                    {statements.reduce((sum, s) => sum + (s.transactionCount || 0), 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Spend Summary */}
        <MonthlySpendSummary 
          statements={statements}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />

        {/* Optimizer Results */}
        <OptimizerResults
          statements={statements}
          selectedMonth={selectedMonth}
        />
      </div>
    </main>
  );
}

