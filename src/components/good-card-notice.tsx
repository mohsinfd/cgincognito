/**
 * Good Card Notice Component
 * Tells users when their existing cards are already optimal
 */

'use client';

import { useState } from 'react';

type Props = {
  cardName: string;
  bankName: string;
  totalSavings: number;
  rank: number;
  annualSavings: number;
};

export default function GoodCardNotice({ cardName, bankName, totalSavings, rank, annualSavings }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            ✓
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            🎉 Great News! Your {cardName} is Already Optimal
          </h3>
          
          <p className="text-gray-700 mb-4">
            Your {bankName} card is ranked <span className="font-bold text-green-600">#{rank}</span> for your spending pattern. 
            You're already using one of the best cards available!
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">Current Savings</div>
              <div className="text-2xl font-bold text-green-600">
                ₹{totalSavings.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">per month</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">Annual Potential</div>
              <div className="text-2xl font-bold text-green-600">
                ₹{annualSavings.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">per year</div>
            </div>
          </div>
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? '▼ Hide' : '▶ Show'} why this card works so well for you
          </button>
          
          {expanded && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
              <p className="text-sm text-gray-700 mb-2">
                <strong>What this means:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>No need to apply for a new card - you're already earning optimal rewards</li>
                <li>Continue using this card for maximum benefits</li>
                <li>Your spending categories match this card's rewards structure perfectly</li>
                <li>You're not missing out on any significant savings opportunities</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

