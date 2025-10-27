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
        needsReview.map(index => {
          const txn = allTransactions[index];
          return txn ? `${txn.description || txn.raw_desc || 'Unknown'} (${txn.vendor_cat || 'No category'})` : 'undefined (undefined)';
        }));
      
      setTransactionsToReview(needsReview.map(index => allTransactions[index]).filter(Boolean));
      
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
              // YYYYMMDD format (e.g., "20251024" = 24 Oct 2025)
              year = date.substring(0, 4);
              month = date.substring(4, 6);
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

  // Function to save updated categories to localStorage
  const saveUpdatedCategories = (updatedTransactions: any[]) => {
    try {
      console.log('💾 Saving updated categories to localStorage...');
      
      // Get current statements
      const currentStatements = getStatements();
      
      // Create a map of updated transactions by their unique identifier
      const updatedMap = new Map();
      updatedTransactions.forEach(txn => {
        // Use a combination of description, amount, and date as unique identifier
        const key = `${txn.description || txn.raw_desc || ''}_${txn.amount}_${txn.date || txn.txn_date || ''}`;
        updatedMap.set(key, txn);
      });
      
      // Update transactions in each statement
      const updatedStatements = currentStatements.map(stmt => {
        const transactions = stmt.content?.content?.transactions || 
                           stmt.content?.transactions || 
                           stmt.transactions || 
                           [];
        
        const updatedTransactionsInStmt = transactions.map((txn: any) => {
          const key = `${txn.description || txn.raw_desc || ''}_${txn.amount}_${txn.date || txn.txn_date || ''}`;
          const updatedTxn = updatedMap.get(key);
          
          if (updatedTxn && updatedTxn.cg_bucket) {
            return {
              ...txn,
              cg_bucket: updatedTxn.cg_bucket,
              category: updatedTxn.category,
              vendor_cat: updatedTxn.category
            };
          }
          
          return txn;
        });
        
        // Update statement with new transactions
        if (stmt.content?.content) {
          return {
            ...stmt,
            content: {
              ...stmt.content,
              content: {
                ...stmt.content.content,
                transactions: updatedTransactionsInStmt
              }
            }
          };
        } else if (stmt.content) {
          return {
            ...stmt,
            content: {
              ...stmt.content,
              transactions: updatedTransactionsInStmt
            }
          };
        }
        
        return stmt;
      });
      
      // Save to localStorage
      localStorage.setItem('cardgenius_statements', JSON.stringify(updatedStatements));
      
      // Reload statements to reflect changes
      setStatements(updatedStatements);
      
      console.log('✅ Successfully saved updated categories');
    } catch (err) {
      console.error('❌ Failed to save updated categories:', err);
    }
  };

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
              
              // Save updated categories back to localStorage
              saveUpdatedCategories(updated);
              
              setShowCategoryReview(false);
              setTransactionsToReview([]);
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

        {/* NEW: Spend Analyzer - 3 Parts */}
        {statements.length > 0 && (
          <div className="mt-8 space-y-6">
            {/* Part 1: Month-by-Month Breakdown (Card Level) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Month-by-Month Card Spends</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Card</th>
                      {(() => {
                        // Extract unique months from statements
                        const months = new Set<string>();
                        statements.forEach(stmt => {
                          const date = stmt.content?.content?.summary?.statement_date ||
                                      stmt.content?.summary?.statement_date ||
                                      stmt.statement_date;
                          if (date && date.length === 8) {
                            const year = date.substring(0, 4);
                            const month = date.substring(4, 6);
                            months.add(`${year}-${month}`);
                          }
                        });
                        const sortedMonths = Array.from(months).sort();
                        return sortedMonths.map(month => (
                          <th key={month} className="text-right py-2 px-4">
                            {new Date(`${month}-01`).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                          </th>
                        ));
                      })()}
                      <th className="text-right py-2 px-4 font-bold">Total (3M)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Build month-by-month card spends
                      const cardMonthSpends: Record<string, Record<string, number>> = {};
                      const months = new Set<string>();
                      
                      statements.forEach(stmt => {
                        const card = `${stmt.bankCode.toUpperCase()} ****${stmt.cardLast4}`;
                        const date = stmt.content?.content?.summary?.statement_date ||
                                    stmt.content?.summary?.statement_date ||
                                    stmt.statement_date;
                        
                        if (date && date.length === 8) {
                          const year = date.substring(0, 4);
                          const month = date.substring(4, 6);
                          const monthKey = `${year}-${month}`;
                          months.add(monthKey);
                          
                          if (!cardMonthSpends[card]) cardMonthSpends[card] = {};
                          cardMonthSpends[card][monthKey] = (cardMonthSpends[card][monthKey] || 0) + stmt.totalAmount;
                        }
                      });
                      
                      const sortedMonths = Array.from(months).sort();
                      
                      return Object.entries(cardMonthSpends).map(([card, monthData]) => (
                        <tr key={card} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4 font-medium">{card}</td>
                          {sortedMonths.map(month => (
                            <td key={month} className="text-right py-2 px-4">
                              {monthData[month] ? `₹${monthData[month].toLocaleString('en-IN')}` : '-'}
                            </td>
                          ))}
                          <td className="text-right py-2 px-4 font-bold">
                            ₹{Object.values(monthData).reduce((sum, amt) => sum + amt, 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part 2: 3-Month Card Totals */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💳 Card Totals (Last 3 Months)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const cardTotals: Record<string, number> = {};
                  statements.forEach(stmt => {
                    const card = `${stmt.bankCode.toUpperCase()} ****${stmt.cardLast4}`;
                    cardTotals[card] = (cardTotals[card] || 0) + stmt.totalAmount;
                  });
                  
                  return Object.entries(cardTotals)
                    .sort((a, b) => b[1] - a[1])
                    .map(([card, total]) => (
                      <div key={card} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                        <div className="text-sm text-gray-600 mb-1">{card}</div>
                        <div className="text-2xl font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</div>
                      </div>
                    ));
                })()}
              </div>
            </div>

            {/* Part 3: Monthly Category Averages */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Average Monthly Spend by Category</h2>
              <p className="text-sm text-gray-600 mb-4">
                This is what we send to CardGenius API to recommend the best cards for you.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  // Group transactions by category and month
                  const categoryMonthMap: Record<string, Record<string, number>> = {};
                  
                  statements.forEach(stmt => {
                    const transactions = stmt.content?.content?.transactions || 
                                        stmt.content?.transactions || 
                                        stmt.transactions || [];
                    
                    const date = stmt.content?.content?.summary?.statement_date ||
                                stmt.content?.summary?.statement_date ||
                                stmt.statement_date;
                    
                    if (date && date.length === 8) {
                      const year = date.substring(0, 4);
                      const month = date.substring(4, 6);
                      const monthKey = `${year}-${month}`;
                      
                      transactions.forEach((txn: any) => {
                        if (txn.type === 'Cr') return; // Skip credits
                        
                        const category = txn.category || 'other_offline_spends';
                        
                        if (!categoryMonthMap[category]) {
                          categoryMonthMap[category] = {};
                        }
                        if (!categoryMonthMap[category][monthKey]) {
                          categoryMonthMap[category][monthKey] = 0;
                        }
                        
                        categoryMonthMap[category][monthKey] += txn.amount;
                      });
                    }
                  });
                  
                  // Calculate averages
                  const categoryAverages: Array<{ category: string; average: number; months: number }> = [];
                  
                  Object.entries(categoryMonthMap).forEach(([category, monthData]) => {
                    const monthsWithData = Object.keys(monthData).length;
                    const total = Object.values(monthData).reduce((sum, amt) => sum + amt, 0);
                    const average = total / monthsWithData;
                    
                    categoryAverages.push({
                      category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                      average: Math.round(average),
                      months: monthsWithData
                    });
                  });
                  
                  return categoryAverages
                    .filter(c => c.average > 0)
                    .sort((a, b) => b.average - a.average)
                    .map(({ category, average, months }) => (
                      <div key={category} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">{category}</div>
                        <div className="text-xl font-bold text-gray-900">₹{average.toLocaleString('en-IN')}/mo</div>
                        <div className="text-xs text-gray-500 mt-1">Based on {months} month{months > 1 ? 's' : ''} of data</div>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Optimizer Results */}
        <div className="mt-8">
          <OptimizerResults
            statements={statements}
            selectedMonth={selectedMonth}
          />
        </div>
      </div>
    </main>
  );
}

