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
  mostLikelyCard?: CardInfo | null;
  detectedCards?: CardInfo[]; // Cards that were auto-detected
  allowMultiple?: boolean; // Whether to allow selecting multiple cards
  onCardSelected: (card: CardInfo | null) => void;
  onCardsSelected?: (cards: CardInfo[]) => void; // For multi-select mode
  onManualEntry: (cardName: string) => void;
}

export default function CardSelection({
  bankCode,
  bankName,
  availableCards,
  mostLikelyCard,
  detectedCards = [],
  allowMultiple = false,
  onCardSelected,
  onCardsSelected,
  onManualEntry
}: CardSelectionProps) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCardName, setManualCardName] = useState('');
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  
  // If detectedCards exist and allowMultiple, pre-select them
  React.useEffect(() => {
    if (allowMultiple && detectedCards.length > 0) {
      setSelectedCards(new Set(detectedCards.map(c => c.id)));
    }
  }, [allowMultiple, detectedCards]);

  const handleCardSelect = (card: CardInfo) => {
    if (allowMultiple && onCardsSelected) {
      // Multi-select mode: toggle card selection
      const newSelected = new Set(selectedCards);
      if (newSelected.has(card.id)) {
        newSelected.delete(card.id);
      } else {
        newSelected.add(card.id);
      }
      setSelectedCards(newSelected);
      
      // Call callback with all selected cards
      const selectedCardsArray = availableCards.filter(c => newSelected.has(c.id));
      onCardsSelected(selectedCardsArray);
    } else {
      // Single-select mode
      onCardSelected(card);
    }
  };

  const handleManualSubmit = () => {
    if (manualCardName.trim()) {
      onManualEntry(manualCardName.trim());
    }
  };

  const isMostLikely = (card: CardInfo) => {
    return mostLikelyCard && card.id === mostLikelyCard.id;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {allowMultiple && detectedCards.length > 1 
            ? `Select Your ${bankName} Cards (Multiple Detected)` 
            : `Select Your ${bankName} Card`}
        </h3>
        <p className="text-sm text-gray-600">
          {allowMultiple && detectedCards.length > 1 
            ? `We detected ${detectedCards.length} cards. Please confirm which ones you have, or select manually.`
            : `We couldn't automatically detect your card name from the statement. Please select your card from the list below or enter it manually.`}
        </p>
        {allowMultiple && detectedCards.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">Detected Cards:</p>
            <ul className="text-sm text-blue-700 list-disc list-inside">
              {detectedCards.map(card => (
                <li key={card.id}>{card.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!showManualEntry ? (
        <div>
          {/* Available Cards List */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Available {bankName} Cards:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableCards.map((card) => {
                const isLikely = isMostLikely(card);
                const isDetected = detectedCards.some(c => c.id === card.id);
                const isSelected = selectedCards.has(card.id);
                
                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardSelect(card)}
                    className={`w-full text-left p-3 border rounded-lg transition-colors relative flex items-center gap-3 ${
                      isLikely || isDetected
                        ? 'border-green-500 bg-green-50 hover:bg-green-100'
                        : isSelected && allowMultiple
                        ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                        : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    {allowMultiple && (
                      <div className={`flex-shrink-0 w-5 h-5 border-2 rounded ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      } flex items-center justify-center`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{card.name}</div>
                    </div>
                    {isLikely && !allowMultiple && (
                      <span className="absolute top-2 right-2 text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                        ✓ Best Match
                      </span>
                    )}
                    {isDetected && allowMultiple && (
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                        Detected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {allowMultiple && (
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => {
                    if (onCardsSelected) {
                      const selectedCardsArray = availableCards.filter(c => selectedCards.has(c.id));
                      onCardsSelected(selectedCardsArray);
                    }
                  }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={selectedCards.size === 0}
                >
                  Confirm {selectedCards.size > 0 ? `(${selectedCards.size} selected)` : ''}
                </button>
              </div>
            )}
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
