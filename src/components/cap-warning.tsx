/**
 * Cap Warning Component
 * Alerts users when they hit spending caps
 */

'use client';

import { useState } from 'react';
import type { CapWarning } from '@/lib/optimizer/cap-detector';

type Props = {
  warnings: CapWarning[];
};

export default function CapWarningComponent({ warnings }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (warnings.length === 0 || dismissed) {
    return null;
  }

  const totalLostSavings = warnings.reduce((sum, w) => sum + w.lostSavings, 0);

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-6 mb-8 shadow-lg relative">
      {/* Close button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 text-amber-600 hover:text-amber-800 text-xl font-bold"
        aria-label="Dismiss"
      >
        ×
      </button>

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white text-2xl">
            ⚠️
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-amber-900 mb-2">
            Spending Cap Alert!
          </h3>
          <p className="text-amber-800 mb-3">
            You've exceeded spending caps on {warnings.length} categor{warnings.length === 1 ? 'y' : 'ies'}.
            You're missing out on potential savings of{' '}
            <span className="font-bold text-lg">₹{totalLostSavings.toLocaleString()}/month</span>!
          </p>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition font-semibold text-sm"
          >
            {showDetails ? 'Hide Details' : `View ${warnings.length} Cap${warnings.length === 1 ? '' : 's'} Hit`}
          </button>

          {showDetails && (
            <div className="mt-6 space-y-4">
              {warnings.map((warning, index) => (
                <div key={index} className="bg-white rounded-lg p-5 border border-amber-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg capitalize">
                        {warning.category.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {warning.cashbackPercentage}% cashback
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">
                        -₹{warning.lostSavings.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">lost savings/month</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Your Spend</p>
                      <p className="font-semibold text-gray-900">
                        ₹{warning.spend.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Cap Limit</p>
                      <p className="font-semibold text-amber-700">
                        ₹{warning.cap.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Over by</p>
                      <p className="font-semibold text-red-600">
                        ₹{(warning.spend - warning.cap).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-700">
                      💡 <span className="font-semibold">Tip:</span> For spends above ₹
                      {warning.cap.toLocaleString()}, consider using a different card to maximize rewards.
                    </p>
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">What are spending caps?</span><br />
                  Most credit cards have monthly limits on cashback/rewards per category. Once you hit
                  the cap, additional spending in that category earns lower or no rewards. Using multiple
                  cards strategically can help maximize your savings.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

