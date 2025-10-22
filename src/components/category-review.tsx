/**
 * Category Review Component
 * Asks user to categorize ambiguous transactions
 */

'use client';

import { useState } from 'react';
import type { CgBucket } from '@/types/transaction';

type Transaction = {
  id: number | string;
  description?: string;
  raw_desc?: string;
  amount: number;
  type: string;
  date?: string;
  txn_date?: string;
  category?: string;
  sub_category?: string;
  cg_bucket?: CgBucket;
};

type Props = {
  transactions: Transaction[];
  onComplete: (updatedTransactions: Transaction[]) => void;
};

const CATEGORY_OPTIONS: { value: CgBucket; label: string; icon: string }[] = [
  { value: 'amazon_spends', label: 'Amazon', icon: '📦' },
  { value: 'flipkart_spends', label: 'Flipkart', icon: '🛍️' },
  { value: 'grocery_spends_online', label: 'Grocery Online', icon: '🛒' },
  { value: 'online_food_ordering', label: 'Food Delivery', icon: '🛵' },
  { value: 'dining_or_going_out', label: 'Dining Out', icon: '🍽️' },
  { value: 'flights', label: 'Flights', icon: '✈️' },
  { value: 'hotels', label: 'Hotels', icon: '🏨' },
  { value: 'fuel', label: 'Fuel', icon: '⛽' },
  { value: 'mobile_phone_bills', label: 'Mobile Bills', icon: '📱' },
  { value: 'electricity_bills', label: 'Electricity', icon: '💡' },
  { value: 'water_bills', label: 'Water', icon: '💧' },
  { value: 'ott_channels', label: 'Streaming/OTT', icon: '📺' },
  { value: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { value: 'school_fees', label: 'Education', icon: '🎓' },
  { value: 'rent', label: 'Rent', icon: '🏠' },
  { value: 'insurance_health', label: 'Health Insurance', icon: '🏥' },
  { value: 'insurance_car_or_bike', label: 'Vehicle Insurance', icon: '🚗' },
  { value: 'large_electronics', label: 'Electronics', icon: '💻' },
  { value: 'other_online_spends', label: 'Other Online', icon: '🌐' },
  { value: 'other_offline_spends', label: 'Other Offline', icon: '🏪' },
];

export default function CategoryReview({ transactions, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [updatedTxns, setUpdatedTxns] = useState<Transaction[]>(transactions);

  if (transactions.length === 0) {
    return null;
  }

  const currentTxn = updatedTxns[currentIndex];
  const progress = ((currentIndex + 1) / transactions.length) * 100;

  const handleSelect = (bucket: CgBucket) => {
    // Update transaction
    const updated = [...updatedTxns];
    updated[currentIndex] = { ...currentTxn, cg_bucket: bucket, category: bucket };
    setUpdatedTxns(updated);

    // Move to next or complete
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(updated);
    }
  };

  const handleSkip = () => {
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(updatedTxns);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          Help us categorize these transactions
        </h2>
        <p className="text-gray-600">
          {currentIndex + 1} of {transactions.length} transactions
        </p>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Transaction Card */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-lg font-semibold">{currentTxn.raw_desc || currentTxn.description || 'Unknown'}</p>
            <p className="text-sm text-gray-500">{currentTxn.txn_date || currentTxn.date || ''}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ₹{(currentTxn.amount || 0).toLocaleString()}
          </p>
        </div>

        {/* Current suggestion */}
        {currentTxn.cg_bucket && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              💡 Our suggestion: <span className="font-semibold">
                {CATEGORY_OPTIONS.find(c => c.value === currentTxn.cg_bucket)?.label}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Category Options */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {CATEGORY_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`p-4 rounded-lg border-2 transition-all hover:border-blue-500 hover:bg-blue-50 ${
              currentTxn.cg_bucket === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            <div className="text-2xl mb-1">{option.icon}</div>
            <div className="text-sm font-medium">{option.label}</div>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSkip}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition"
        >
          Keep Suggestion
        </button>
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
