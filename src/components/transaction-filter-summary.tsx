/**
 * Transaction Filter Summary
 * Shows what transactions were excluded and why
 */

'use client';

type Props = {
  totalTransactions: number;
  spendingTransactions: number;
  excludedReasons: Record<string, number>;
};

export default function TransactionFilterSummary({
  totalTransactions,
  spendingTransactions,
  excludedReasons,
}: Props) {
  const excludedCount = totalTransactions - spendingTransactions;

  if (excludedCount === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Transaction Filtering Applied
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            We analyzed <strong>{spendingTransactions} spending transactions</strong> out of {totalTransactions} total transactions.
          </p>
          <details className="mt-2">
            <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
              Why were {excludedCount} transactions excluded?
            </summary>
            <div className="mt-2 pl-4 space-y-1">
              {Object.entries(excludedReasons).map(([reason, count]) => (
                <div key={reason} className="text-xs text-blue-700">
                  • <strong>{count}</strong> {reason} (not spending)
                </div>
              ))}
              <div className="mt-2 text-xs text-blue-600 italic">
                EMIs, interest charges, fees, and payment reversals are excluded from spend analysis
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

