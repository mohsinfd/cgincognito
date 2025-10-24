'use client';

import React, { useState } from 'react';

interface CardInfo {
  id: number;
  name: string;
  bankId: number;
  bankName: string;
}

interface CardSelectionProps {
  bankCode: string;
  bankName: string;
  availableCards: CardInfo[];
  onCardSelected: (card: CardInfo | null) => void;
  onManualEntry: (cardName: string) => void;
}

export default function CardSelection({
  bankCode,
  bankName,
  availableCards,
  onCardSelected,
  onManualEntry
}: CardSelectionProps) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCardName, setManualCardName] = useState('');

  const handleCardSelect = (card: CardInfo) => {
    onCardSelected(card);
  };

  const handleManualSubmit = () => {
    if (manualCardName.trim()) {
      onManualEntry(manualCardName.trim());
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Select Your {bankName} Card
        </h3>
        <p className="text-sm text-gray-600">
          We couldn't automatically detect your card name from the statement. 
          Please select your card from the list below or enter it manually.
        </p>
      </div>

      {!showManualEntry ? (
        <div>
          {/* Available Cards List */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Available {bankName} Cards:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardSelect(card)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{card.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Entry Option */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">
              Don't see your card? Enter it manually:
            </p>
            <button
              onClick={() => setShowManualEntry(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Enter Card Name Manually
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Manual Entry Form */}
          <div className="mb-4">
            <label htmlFor="manualCardName" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your {bankName} card name:
            </label>
            <input
              id="manualCardName"
              type="text"
              value={manualCardName}
              onChange={(e) => setManualCardName(e.target.value)}
              placeholder="e.g., HDFC Regalia Gold Credit Card"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleManualSubmit}
              disabled={!manualCardName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Card Name
            </button>
            <button
              onClick={() => setShowManualEntry(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to List
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
