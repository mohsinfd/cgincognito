/**
 * Optimizer Results Component
 * Shows missed savings and card recommendations
 */

'use client';

import { useEffect, useState } from 'react';
import type { CGSpendVector, CGCalculatorResponse } from '@/types/optimizer';
import { mapBucket } from '@/lib/mapper/rules';
import CardRecommendation from './card-recommendation';
import CapWarningComponent from './cap-warning';
import { detectCapWarnings } from '@/lib/optimizer/cap-detector';

type Props = {
  statements: any[];
  selectedMonth: string;
};

export default function OptimizerResults({ statements, selectedMonth }: Props) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<CGCalculatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (statements.length === 0) return;
    
    runOptimizer();
  }, [statements, selectedMonth]);

  const runOptimizer = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build spend vector from statements
      const spendVector = buildSpendVector(statements);
      
      // Call CG Calculator API
      const response = await fetch('https://card-recommendation-api-v2.bankkaro.com/cg/api/pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(spendVector),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();
      
      // Filter to valid cards only
      const VALID_CARD_IDS = [8,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,32,33,34,35,36,39,40,41,43,44,45,46,47,49,50,51,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78];
      const filteredCards = Array.isArray(data) ? data.filter(card => VALID_CARD_IDS.includes(card.id)) : [];
      
      console.log('🎯 CardGenius API response:', {
        totalCards: data.length,
        filteredCards: filteredCards.length,
        topCards: filteredCards.slice(0, 5).map(c => ({ name: c.card_name, savings: c.total_savings }))
      });
      
      setRecommendations(filteredCards);
    } catch (err: any) {
      console.error('Optimizer error:', err);
      setError(err.message || 'Failed to calculate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const buildSpendVector = (statements: any[]): CGSpendVector => {
    // Use the complete spend vector builder
    const { buildCompleteSpendVector } = require('@/lib/optimizer/spend-vector-builder');
    
    console.log('🔍 OptimizerResults building spend vector from statements:', statements.length);
    
    // Flatten all transactions from all statements
    const allTransactions: any[] = [];
    statements.forEach((stmt, index) => {
      console.log(`📊 Statement ${index + 1}: ${stmt.bankCode}`, {
        hasContent: !!stmt.content,
        hasNestedContent: !!stmt.content?.content,
        transactions: stmt.content?.content?.transactions?.length || 0,
        transactionCount: stmt.transactionCount
      });
      
      // Try multiple paths for transactions
      const transactions = stmt.content?.content?.transactions || 
                          stmt.content?.transactions || 
                          stmt.transactions || 
                          [];
      
      allTransactions.push(...transactions);
      console.log(`  📈 Added ${transactions.length} transactions to spend vector`);
    });

    console.log(`📊 Total transactions for optimizer: ${allTransactions.length}`);

    // Calculate actual months of data from statement dates
    const uniqueMonths = new Set<string>();
    statements.forEach(stmt => {
      const date = stmt.content?.content?.summary?.statement_date ||
                   stmt.content?.summary?.statement_date ||
                   stmt.statement_date;
      
      if (date) {
        console.log(`📅 Processing date: ${date}`);
        
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
          uniqueMonths.add(monthKey);
          console.log(`  📅 Added month: ${monthKey}`);
        }
      }
    });
    
    const monthsOfData = uniqueMonths.size || 1;
    console.log(`📊 Months of data: ${monthsOfData} (unique months: ${Array.from(uniqueMonths).join(', ')})`);
    
    if (allTransactions.length === 0) {
      console.warn('⚠️ No transactions found for optimizer');
    }
    
    return buildCompleteSpendVector(allTransactions, monthsOfData);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Calculating your potential savings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Unable to calculate recommendations</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={runOptimizer}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <p className="text-gray-600">No recommendations available</p>
      </div>
    );
  }

  const topCard = recommendations[0];
  const monthlySavings = topCard.total_savings || 0;
  const annualSavings = topCard.total_savings_yearly || 0;

  // Detect cap warnings
  const capWarnings = detectCapWarnings(recommendations);

  return (
    <div className="space-y-8">
      {/* Cap Warnings */}
      {capWarnings.length > 0 && <CapWarningComponent warnings={capWarnings} />}

      {/* Missed Savings Hero */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-xl p-8 text-white">
        <div className="flex items-center gap-6">
          <div className="text-7xl">💰</div>
          <div className="flex-1">
            <p className="text-green-100 text-sm uppercase tracking-wide mb-2">
              Potential Monthly Savings
            </p>
            <h2 className="text-5xl font-bold mb-2">
              ₹{monthlySavings.toLocaleString()}
            </h2>
            <p className="text-green-100 text-lg">
              That's <span className="font-bold">₹{annualSavings.toLocaleString()}</span> per year!
            </p>
            <p className="text-green-100 mt-2 text-sm">
              With the right credit cards, you could be earning significantly more rewards on your everyday spending.
            </p>
          </div>
        </div>
      </div>

      {/* Top Recommended Cards */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Recommended Cards for You</h2>
          <span className="text-sm text-gray-500">
            Based on your spending pattern
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {recommendations.slice(0, 5).map((card, index) => (
            <CardRecommendation
              key={card.id}
              card={card}
              rank={index + 1}
              isTop={index === 0}
            />
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      {topCard.spending_breakdown_array && topCard.spending_breakdown_array.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-6">Where You'll Save the Most</h3>
          <div className="space-y-4">
            {topCard.spending_breakdown_array
              .filter((item: any) => item.savings > 0)
              .sort((a: any, b: any) => b.savings - a.savings)
              .slice(0, 5)
              .map((item: any) => (
                <div key={item.on} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium capitalize">
                      {item.on.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-600">
                      With {topCard.card_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ₹{item.savings.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">per month</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Action CTA */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold mb-2">Ready to Optimize?</h3>
        <p className="text-gray-600 mb-4">
          Apply for the recommended cards to start maximizing your rewards
        </p>
        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
          Compare All Cards
        </button>
      </div>
    </div>
  );
}
