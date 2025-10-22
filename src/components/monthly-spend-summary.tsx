/**
 * Monthly Spend Summary Component
 * Shows spend breakdown by category
 */

'use client';

import { useMemo } from 'react';
import type { CgBucket } from '@/types/transaction';
import { mapTransactionCategory } from '@/lib/mapper/complete-mapper';

type Props = {
  statements: any[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
};

const CATEGORY_INFO: Partial<Record<CgBucket, { label: string; icon: string; color: string }>> = {
  amazon_spends: { label: 'Amazon', icon: '📦', color: 'bg-orange-100 text-orange-800' },
  flipkart_spends: { label: 'Flipkart', icon: '🛍️', color: 'bg-blue-100 text-blue-800' },
  grocery_spends_online: { label: 'Grocery Online', icon: '🛒', color: 'bg-green-100 text-green-800' },
  online_food_ordering: { label: 'Food Delivery', icon: '🛵', color: 'bg-red-100 text-red-800' },
  dining_or_going_out: { label: 'Dining Out', icon: '🍽️', color: 'bg-pink-100 text-pink-800' },
  flights: { label: 'Flights', icon: '✈️', color: 'bg-indigo-100 text-indigo-800' },
  hotels: { label: 'Hotels', icon: '🏨', color: 'bg-purple-100 text-purple-800' },
  fuel: { label: 'Fuel', icon: '⛽', color: 'bg-yellow-100 text-yellow-800' },
  mobile_phone_bills: { label: 'Mobile Bills', icon: '📱', color: 'bg-blue-100 text-blue-800' },
  electricity_bills: { label: 'Electricity', icon: '💡', color: 'bg-yellow-100 text-yellow-800' },
  water_bills: { label: 'Water', icon: '💧', color: 'bg-cyan-100 text-cyan-800' },
  ott_channels: { label: 'OTT/Streaming', icon: '📺', color: 'bg-red-100 text-red-800' },
  school_fees: { label: 'Education', icon: '🎓', color: 'bg-pink-100 text-pink-800' },
  rent: { label: 'Rent', icon: '🏠', color: 'bg-teal-100 text-teal-800' },
  insurance_health: { label: 'Health Insurance', icon: '🏥', color: 'bg-green-100 text-green-800' },
  insurance_car_or_bike: { label: 'Vehicle Insurance', icon: '🚗', color: 'bg-blue-100 text-blue-800' },
  large_electronics: { label: 'Electronics', icon: '📱', color: 'bg-gray-100 text-gray-800' },
  pharmacy: { label: 'Pharmacy', icon: '💊', color: 'bg-green-100 text-green-800' },
  other_online_spends: { label: 'Other Online', icon: '💻', color: 'bg-gray-100 text-gray-700' },
  other_offline_spends: { label: 'Other Offline', icon: '🏪', color: 'bg-gray-100 text-gray-700' },
};

export default function MonthlySpendSummary({ statements, selectedMonth, onMonthChange }: Props) {
  const { spendByCategory, spendByCard } = useMemo(() => {
    const spending: Record<CgBucket, number> = {} as Record<CgBucket, number>;
    const cardSpending: Record<string, { bank: string; last4: string; amount: number; transactionCount: number }> = {};
    
    console.log('🔍 MonthlySpendSummary processing statements:', statements.length);
    
    statements.forEach((stmt, index) => {
      console.log(`📊 Statement ${index + 1}: ${stmt.bankCode}`, {
        hasContent: !!stmt.content,
        hasNestedContent: !!stmt.content?.content,
        transactions: stmt.content?.content?.transactions?.length || 0,
        cardDetails: !!stmt.content?.content?.card_details,
        transactionCount: stmt.transactionCount
      });
      
      // Try multiple paths for transactions
      const transactions = stmt.content?.content?.transactions || 
                          stmt.content?.transactions || 
                          stmt.transactions || 
                          [];
      
      // Try multiple paths for card number
      const cardNumber = stmt.content?.content?.card_details?.num ||
                        stmt.content?.card_details?.num ||
                        stmt.cardLast4 ||
                        stmt.card_details?.num;
      
      // Extract last 4 digits, handling various formats
      let cardLast4 = 'Unknown';
      if (cardNumber) {
        if (typeof cardNumber === 'string') {
          // Handle cases like "****HDFC" or "****YES" 
          if (cardNumber.includes('****')) {
            const bankSuffix = cardNumber.replace('****', '');
            cardLast4 = bankSuffix || 'Unknown';
          } else {
            // Remove any non-digit characters and get last 4
            const digits = cardNumber.replace(/\D/g, '');
            cardLast4 = digits.slice(-4) || 'Unknown';
          }
        } else if (typeof cardNumber === 'number') {
          cardLast4 = cardNumber.toString().slice(-4);
        }
      }
      
      const bankCode = stmt.bankCode || 'Unknown';
      
      // If still unknown, use bank code as fallback
      if (cardLast4 === 'Unknown' || cardLast4 === '') {
        cardLast4 = 'Unknown';
      }
      
      console.log(`💳 Card ${index + 1}: ${bankCode} ****${cardLast4}, ${transactions.length} transactions`);
      
      // Create unique key combining bank and card number
      const cardKey = `${bankCode}_${cardLast4}`;
      
      // Initialize card entry if not exists
      if (!cardSpending[cardKey]) {
        cardSpending[cardKey] = {
          bank: bankCode,
          last4: cardLast4,
          amount: 0,
          transactionCount: 0
        };
      }
      
      transactions.forEach((txn: any, txnIndex: number) => {
        // Explicitly check for DEBIT only, exclude all credit types
        const typeStr = (txn.type || '').toString().toLowerCase();
        const isCredit = typeStr === 'cr' || typeStr === 'credit' || typeStr.includes('credit') || typeStr.includes('payment');
        const isDebit = !isCredit && (
          typeStr === 'dr' || 
          typeStr === 'debit' || 
          typeStr.includes('debit') ||
          txn.amount > 0 // Default to debit if type is unclear but amount is positive
        );
        
        if (!isDebit) return; // Only debits
        
        const amount = Math.abs(txn.amount || 0);
        
        // Add to card spending
        cardSpending[cardKey].amount += amount;
        cardSpending[cardKey].transactionCount += 1;
        
        // Map to category using complete mapper (only if no category assigned)
        const category = txn.category || mapTransactionCategory(
          txn.description || txn.merchant || txn.narration || '',
          '',
          '',
          amount
        );
        
        spending[category] = (spending[category] || 0) + amount;
        
        if (txnIndex < 3) { // Log first 3 transactions for debugging
          console.log(`  💸 Transaction ${txnIndex + 1}: ${txn.description || 'Unknown'} - ₹${amount} (${category})`);
        }
      });
    });
    
    console.log('📊 Final spending summary:', {
      totalCategories: Object.keys(spending).length,
      totalCards: Object.keys(cardSpending).length,
      totalSpend: Object.values(spending).reduce((sum, val) => sum + val, 0)
    });
    
    return { spendByCategory: spending, spendByCard: cardSpending };
  }, [statements]);

  const totalSpend = Object.values(spendByCategory).reduce((sum, val) => sum + val, 0);
  
  // Sort cards by amount
  const sortedCards = Object.values(spendByCard)
    .sort((a, b) => b.amount - a.amount)
    .filter(card => card.amount > 0);
  
  // Sort categories by amount
  const sortedCategories = Object.entries(spendByCategory)
    .sort(([, a], [, b]) => b - a)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => {
      const info = CATEGORY_INFO[category as CgBucket];
      return {
        category: category as CgBucket,
        amount,
        info: info || { label: category, icon: '📌', color: 'bg-gray-100 text-gray-700' }
      };
    });

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Monthly Spend Breakdown</h2>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Spend</p>
          <p className="text-3xl font-bold text-gray-900">
            ₹{totalSpend.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Per-Card Spending Breakdown */}
      {sortedCards.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Spending by Card</h3>
          <div className="space-y-3">
            {sortedCards.map((card) => {
              const percentage = ((card.amount / totalSpend) * 100).toFixed(1);
              return (
                <div key={`${card.bank}-${card.last4}`} className="flex items-center gap-4">
                  <div className="flex-shrink-0 text-3xl">💳</div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <div>
                        <span className="font-medium">{card.bank.toUpperCase()}</span>
                        <span className="text-gray-500 ml-2">****{card.last4}</span>
                        <div className="text-xs text-gray-500">{card.transactionCount} transactions</div>
                      </div>
                      <span className="font-semibold">₹{card.amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{percentage}% of total</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sortedCategories.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg font-medium mb-2">No spending data found</p>
          <p className="text-sm">
            {statements.length === 0 
              ? 'No statements have been processed yet'
              : 'Transactions may not be properly categorized or all transactions are credits'
            }
          </p>
          {statements.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg text-left">
              <p className="text-sm font-medium text-yellow-800 mb-2">Debug Info:</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                {statements.map((stmt, i) => (
                  <li key={i}>
                    {stmt.bankCode}: {stmt.transactionCount || 0} transactions, 
                    {stmt.content?.content?.transactions?.length || 0} in content
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCategories.map((item) => {
            const percentage = ((item.amount / totalSpend) * 100).toFixed(1);
            
            return (
              <div key={item.category} className="flex items-center gap-4">
                <div className="flex-shrink-0 text-3xl">
                  {item.info.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{item.info.label}</span>
                    <span className="font-semibold">₹{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{percentage}% of total</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top Merchants */}
      <div className="mt-8 pt-8 border-t">
        <h3 className="text-lg font-semibold mb-4">Top Spending Categories</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {sortedCategories.slice(0, 3).map((item) => {
            return (
              <div key={item.category} className={`${item.info.color} rounded-lg p-4`}>
                <div className="text-2xl mb-2">{item.info.icon}</div>
                <div className="text-sm font-medium mb-1">{item.info.label}</div>
                <div className="text-2xl font-bold">₹{item.amount.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

