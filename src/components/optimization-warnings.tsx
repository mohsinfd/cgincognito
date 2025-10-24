'use client';

import { OptimizationWarning } from '@/lib/optimizer/category-optimizer';
import { useState } from 'react';

type Props = {
  warnings: OptimizationWarning[];
  userCardName: string;
};

export default function OptimizationWarnings({ warnings, userCardName }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  
  if (warnings.length === 0) {
    return null;
  }
  
  // Separate warnings by type
  const categoryMismatches = warnings.filter(w => w.type === 'category_mismatch');
  const capHits = warnings.filter(w => w.type === 'cap_hit');
  
  // Calculate total missed savings
  const totalMissedSavings = categoryMismatches.reduce((sum, w) => {
    return w.type === 'category_mismatch' ? sum + w.missedSavings : sum;
  }, 0);
  
  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-400 p-6 rounded-lg mb-8 shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0 text-3xl">
          💡
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-xl font-bold text-orange-900">
            ⚠️ You're Losing Money on Your {userCardName}
          </h3>
          
          {totalMissedSavings > 0 && (
            <p className="text-lg text-orange-800 mt-2 font-semibold">
              Total missed savings: ₹{totalMissedSavings.toLocaleString()}/month
            </p>
          )}
          
          <p className="text-sm text-orange-700 mt-2">
            We found {warnings.length} {warnings.length === 1 ? 'opportunity' : 'opportunities'} where 
            using a <strong>different card</strong> for certain categories would give you <strong>significantly better rewards</strong>.
          </p>
          
          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition font-medium shadow"
            >
              {showDetails ? 'Hide Details' : `View ${warnings.length} ${warnings.length === 1 ? 'Opportunity' : 'Opportunities'}`}
            </button>
          </div>
          
          {showDetails && (
            <div className="mt-6 space-y-4">
              {/* Category Mismatch Warnings */}
              {categoryMismatches.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-orange-900 mb-3">
                    🎯 Use Better Cards for These Categories:
                  </h4>
                  <div className="space-y-3">
                    {categoryMismatches.map((warning, index) => {
                      if (warning.type !== 'category_mismatch') return null;
                      return (
                        <div key={index} className="bg-white p-5 rounded-lg border-l-4 border-orange-300 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-gray-900 text-lg">{warning.category}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Monthly spend: ₹{warning.userSpend.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-orange-600 font-bold text-lg">
                                -₹{warning.missedSavings.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                ({warning.percentageIncrease}% less rewards)
                              </p>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm text-gray-700">
                                  <span className="text-red-600">❌</span> <strong>You used:</strong> {warning.userCard}
                                </p>
                                <p className="text-xs text-gray-500 ml-5">
                                  Earned: ₹{warning.userSavings.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start justify-between mt-2">
                              <div>
                                <p className="text-sm text-green-700">
                                  <span className="text-green-600">✅</span> <strong>Better option:</strong> {warning.bestCard}
                                </p>
                                <p className="text-xs text-green-600 ml-5 font-medium">
                                  Would earn: ₹{warning.bestSavings.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Cap Hit Warnings */}
              {capHits.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-red-900 mb-3">
                    ⚠️ You're Hitting Spending Caps:
                  </h4>
                  <div className="space-y-3">
                    {capHits.map((warning, index) => {
                      if (warning.type !== 'cap_hit') return null;
                      return (
                        <div key={index} className="bg-white p-5 rounded-lg border-l-4 border-red-300 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-lg">
                                {warning.category}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Total spend: <strong>₹{warning.monthlySpend.toLocaleString()}</strong>
                              </p>
                              <p className="text-sm text-red-600 mt-1">
                                Cap: ₹{warning.capAmount.toLocaleString()} cashback
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-red-600 font-bold text-sm">Cap Hit!</p>
                              <p className="text-xs text-red-500 mt-1">
                                ₹{warning.excessSpend.toLocaleString()} wasted
                              </p>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-700">
                              {warning.message}
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                              💡 Tip: Use a different card (like those recommended below) for spending beyond the cap.
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

