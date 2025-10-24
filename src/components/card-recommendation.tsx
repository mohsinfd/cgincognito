/**
 * Card Recommendation Component
 * Displays individual card recommendation with savings details
 */

'use client';

import type { CGCardRecommendation } from '@/types/optimizer';

type Props = {
  card: CGCardRecommendation;
  rank: number;
  isTop?: boolean;
};

export default function CardRecommendation({ card, rank, isTop }: Props) {
  const monthlySavings = card.total_savings || 0;
  const annualSavings = card.total_savings_yearly || 0;
  const joiningFees = parseInt(card.joining_fees || '0');

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden transition hover:shadow-xl ${
      isTop ? 'ring-2 ring-green-500' : ''
    }`}>
      {isTop && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 text-center font-semibold">
          🏆 Best Match For You
        </div>
      )}
      
      <div className="p-6">
        {/* Card Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
              #{rank}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {card.card_name}
            </h3>
            <p className="text-sm text-gray-600">{card.bank_name}</p>
          </div>
        </div>

        {/* Card Image */}
        {card.image && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img 
              src={card.image} 
              alt={card.card_name}
              className="w-full h-40 object-contain bg-gradient-to-br from-gray-50 to-gray-100"
            />
          </div>
        )}

        {/* Savings Highlight */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-green-700 mb-1">Monthly Savings</p>
              <p className="text-3xl font-bold text-green-600">
                ₹{monthlySavings.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-700 mb-1">Annual Savings</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{annualSavings.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Fees */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-gray-600">Joining Fee</p>
            <p className="font-semibold">
              {joiningFees === 0 ? 'FREE' : `₹${joiningFees.toLocaleString()}`}
            </p>
          </div>
          <div>
            <p className="text-gray-600">ROI</p>
            <p className="font-semibold text-green-600">
              {card.roi ? `₹${card.roi.toLocaleString()}` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Rating */}
        {card.rating && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-lg ${i < card.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm text-gray-600">
              ({card.user_rating_count} reviews)
            </span>
          </div>
        )}

        {/* Product USPs */}
        {card.product_usps && card.product_usps.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Key Benefits:</p>
            <ul className="space-y-1">
              {card.product_usps.slice(0, 3).map((usp, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>{usp.header}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top Savings Categories */}
        {card.spending_breakdown_array && card.spending_breakdown_array.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Best for:</p>
            <div className="space-y-2">
              {card.spending_breakdown_array
                .filter((item: any) => item.savings > 0)
                .sort((a: any, b: any) => b.savings - a.savings)
                .slice(0, 3)
                .map((item: any) => (
                  <div key={item.on} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">
                      {item.on.replace(/_/g, ' ')}
                    </span>
                    <span className="font-semibold text-green-600">
                      ₹{item.savings.toLocaleString()}/mo
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <button className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
          Learn More →
        </button>
      </div>
    </div>
  );
}

