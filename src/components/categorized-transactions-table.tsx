/**
 * Categorized Transactions Table
 * Shows transactions with their assigned CG buckets
 */

'use client';

import type { CgBucket } from '@/types/transaction';
import { mapTransactionCategory } from '@/lib/mapper/complete-mapper';

type Transaction = {
  id: number | string;
  description: string;
  category?: string;
  sub_category?: string;
  amount: number;
  type: string;
  date: string;
};

type Props = {
  transactions: Transaction[];
};

const CATEGORY_INFO: Partial<Record<CgBucket, { label: string; icon: string; color: string }>> = {
  amazon_spends: { label: 'Amazon', icon: '📦', color: 'bg-orange-100 text-orange-800' },
  flipkart_spends: { label: 'Flipkart', icon: '🛍️', color: 'bg-blue-100 text-blue-800' },
  grocery_spends_online: { label: 'Grocery', icon: '🛒', color: 'bg-green-100 text-green-800' },
  online_food_ordering: { label: 'Food Delivery', icon: '🛵', color: 'bg-red-100 text-red-800' },
  dining_or_going_out: { label: 'Dining', icon: '🍽️', color: 'bg-pink-100 text-pink-800' },
  flights: { label: 'Flights', icon: '✈️', color: 'bg-indigo-100 text-indigo-800' },
  hotels: { label: 'Hotels', icon: '🏨', color: 'bg-purple-100 text-purple-800' },
  fuel: { label: 'Fuel', icon: '⛽', color: 'bg-yellow-100 text-yellow-800' },
  mobile_phone_bills: { label: 'Mobile', icon: '📱', color: 'bg-blue-100 text-blue-800' },
  electricity_bills: { label: 'Electricity', icon: '💡', color: 'bg-yellow-100 text-yellow-800' },
  water_bills: { label: 'Water', icon: '💧', color: 'bg-cyan-100 text-cyan-800' },
  ott_channels: { label: 'OTT', icon: '📺', color: 'bg-red-100 text-red-800' },
  pharmacy: { label: 'Pharmacy', icon: '💊', color: 'bg-green-100 text-green-800' },
  school_fees: { label: 'Education', icon: '🎓', color: 'bg-pink-100 text-pink-800' },
  rent: { label: 'Rent', icon: '🏠', color: 'bg-teal-100 text-teal-800' },
  insurance_health: { label: 'Health Ins', icon: '🏥', color: 'bg-green-100 text-green-800' },
  insurance_car_or_bike: { label: 'Vehicle Ins', icon: '🚗', color: 'bg-blue-100 text-blue-800' },
  large_electronics: { label: 'Electronics', icon: '💻', color: 'bg-gray-100 text-gray-800' },
  other_online_spends: { label: 'Other Online', icon: '🌐', color: 'bg-gray-100 text-gray-700' },
  other_offline_spends: { label: 'Other', icon: '🏪', color: 'bg-gray-100 text-gray-700' },
};

export default function CategorizedTransactionsTable({ transactions }: Props) {
  // Categorize each transaction (preserve existing categories)
  const categorizedTxns = transactions.map(txn => {
    const cgBucket = txn.category || mapTransactionCategory(
      txn.description,
      '',
      ''
    );
    
    const categoryInfo = CATEGORY_INFO[cgBucket] || {
      label: cgBucket,
      icon: '📌',
      color: 'bg-gray-100 text-gray-700'
    };
    
    return {
      ...txn,
      cgBucket,
      categoryInfo,
    };
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Spending Transactions</h2>
        <span className="text-sm text-gray-500">
          {transactions.length} transactions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categorizedTxns.map((txn, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {txn.date}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>{txn.description}</div>
                  {txn.category && (
                    <div className="text-xs text-gray-500 mt-1">
                      BoostScore: {txn.category}
                      {txn.sub_category && ` → ${txn.sub_category}`}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${txn.categoryInfo.color}`}>
                    <span>{txn.categoryInfo.icon}</span>
                    <span>{txn.categoryInfo.label}</span>
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

      {/* Category Legend */}
      <div className="mt-6 pt-6 border-t">
        <p className="text-sm font-semibold text-gray-700 mb-3">Categories Used:</p>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(categorizedTxns.map(t => t.cgBucket))).map(bucket => {
            const info = CATEGORY_INFO[bucket];
            const count = categorizedTxns.filter(t => t.cgBucket === bucket).length;
            return (
              <span
                key={bucket}
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full ${info.color}`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
                <span className="font-bold">({count})</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
