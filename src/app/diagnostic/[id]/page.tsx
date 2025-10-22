/**
 * Diagnostic Page - Shows BoostScore categories vs our mapping
 * Helps debug categorization issues
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { mapTransactionCategory } from '@/lib/mapper/complete-mapper';
import type { CgBucket } from '@/types/transaction';

export default function DiagnosticPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/cg/stmt/${params.id}/content`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!data || !data.content) {
    return <div className="p-8">No data found</div>;
  }

  const transactions = data.content.transactions || [];

  // Analyze categorization
  const analysis = transactions.map((txn: any) => {
    const cgBucket = mapTransactionCategory(
      txn.description,
      txn.category,
      txn.sub_category,
      txn.amount
    );

    // Determine if excluded
    const cat = (txn.category || '').toUpperCase();
    const subCat = (txn.sub_category || '').toUpperCase();
    const isExcluded = 
      (txn.type === 'Cr' && !txn.description.toLowerCase().includes('cashback')) ||
      cat === 'LOAN' ||
      cat === 'INTEREST' ||
      subCat === 'EMI' ||
      (cat === 'CHARGES' && subCat === 'TAX') ||
      cat === 'MONEY_TRANSFER' ||
      subCat === 'CC_PAYMENT' ||
      subCat === 'REVERSAL';

    return {
      ...txn,
      cgBucket,
      isExcluded,
    };
  });

  const spendingTxns = analysis.filter((t: any) => !t.isExcluded);
  const excludedTxns = analysis.filter((t: any) => t.isExcluded);

  // Group by CG bucket
  const byBucket: Record<CgBucket, any[]> = {} as any;
  spendingTxns.forEach((txn: any) => {
    if (!byBucket[txn.cgBucket]) {
      byBucket[txn.cgBucket] = [];
    }
    byBucket[txn.cgBucket].push(txn);
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto py-8">
        <Link href="/statements" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Statements
        </Link>

        <h1 className="text-3xl font-bold mb-8">Categorization Diagnostic</h1>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-3xl font-bold">{transactions.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-6">
            <p className="text-sm text-green-700">Spending Transactions</p>
            <p className="text-3xl font-bold text-green-600">{spendingTxns.length}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-6">
            <p className="text-sm text-red-700">Excluded</p>
            <p className="text-3xl font-bold text-red-600">{excludedTxns.length}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-6">
            <p className="text-sm text-blue-700">Categories Used</p>
            <p className="text-3xl font-bold text-blue-600">{Object.keys(byBucket).length}</p>
          </div>
        </div>

        {/* Spending Transactions by Category */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Spending Transactions by Category</h2>
          <div className="space-y-6">
            {Object.entries(byBucket).map(([bucket, txns]: [string, any[]]) => {
              const total = txns.reduce((sum, t) => sum + t.amount, 0);
              return (
                <div key={bucket} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold capitalize">
                      {bucket.replace(/_/g, ' ')}
                    </h3>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">₹{total.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{txns.length} transactions</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {txns.map((txn: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded p-3 text-sm">
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{txn.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              BoostScore: {txn.category || 'NONE'}
                              {txn.sub_category && ` → ${txn.sub_category}`}
                            </p>
                          </div>
                          <p className="font-semibold ml-4">₹{txn.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Excluded Transactions */}
        {excludedTxns.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">
              Excluded Transactions ({excludedTxns.length})
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              These transactions were filtered out because they're not actual spending (EMIs, interest, fees, payments, reversals)
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {excludedTxns.map((txn: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{txn.description}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {txn.category || 'NONE'}
                        {txn.sub_category && ` → ${txn.sub_category}`}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          txn.type === 'Dr' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">₹{txn.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
