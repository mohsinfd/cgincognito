/**
 * Individual statement detail page
 * Shows full transaction list for a saved statement
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStatement, type StoredStatement } from '@/lib/storage/browser-storage';

export default function StatementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [statement, setStatement] = useState<StoredStatement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    const stmt = getStatement(id);
    
    if (!stmt) {
      // Statement not found, redirect to list
      router.push('/statements');
      return;
    }
    
    setStatement(stmt);
    setLoading(false);
  }, [params.id, router]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }

  if (!statement) {
    return null;
  }

  const { content } = statement;

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Back Link */}
        <Link
          href="/statements"
          className="text-blue-600 hover:text-blue-700 mb-6 inline-block"
        >
          ← Back to My Statements
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {statement.bankCode.toUpperCase()} Statement
              </h1>
              <p className="text-gray-600">
                Uploaded on {new Date(statement.uploadedAt).toLocaleString()}
              </p>
            </div>
            {statement.cardLast4 && (
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <p className="text-sm text-gray-600">Card ending in</p>
                <p className="text-2xl font-bold">•••• {statement.cardLast4}</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Card */}
        {content.content && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Statement Summary</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600">Bank</p>
                <p className="text-lg font-semibold">{content.content.card_details.bank}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Card Type</p>
                <p className="text-lg font-semibold">{content.content.card_details.card_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Dues</p>
                <p className="text-lg font-semibold text-red-600">
                  ₹{content.content.summary.total_dues.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-lg font-semibold">{content.content.transactions.length}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Credit Limit</p>
                <p className="font-semibold">₹{content.content.card_details.credit_limit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Available Credit</p>
                <p className="font-semibold text-green-600">₹{content.content.card_details.available_credit_limit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Minimum Due</p>
                <p className="font-semibold">₹{content.content.summary.min_amount_due.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Category Summary */}
        {content.content?.transactions && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Category Breakdown</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(
                content.content.transactions.reduce((acc: any, txn: any) => {
                  if (txn.type === 'Dr') { // Only count debits
                    const cat = txn.category || 'unknown';
                    acc[cat] = {
                      count: (acc[cat]?.count || 0) + 1,
                      amount: (acc[cat]?.amount || 0) + Math.abs(txn.amount || 0)
                    };
                  }
                  return acc;
                }, {})
              )
              .sort((a: any, b: any) => b[1].amount - a[1].amount) // Sort by amount
              .map(([category, data]: [string, any]) => (
                <div key={category} className="border rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-700 capitalize mb-1">
                    {category.replace(/_/g, ' ')}
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{data.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {data.count} transaction{data.count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {content.content?.transactions && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">All Transactions ({content.content.transactions.length})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {content.content.transactions.map((txn, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {txn.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{txn.description}</div>
                        {txn.merchant && txn.merchant !== txn.description && (
                          <div className="text-xs text-gray-500 mt-1">Merchant: {txn.merchant}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {(txn.category || 'unknown').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            txn.type === 'Dr'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {txn.type === 'Dr' ? 'Debit' : 'Credit'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span className={txn.type === 'Dr' ? 'text-red-600' : 'text-green-600'}>
                          {txn.type === 'Dr' ? '-' : '+'}₹{txn.amount.toLocaleString()}
                        </span>
                      </td>
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

