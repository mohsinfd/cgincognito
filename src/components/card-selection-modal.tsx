'use client';

import React, { useState, useEffect } from 'react';
import CardSelection from './card-selection';

export interface BankSelectionInfo {
  bankCode: string;
  bankName: string;
  availableCards: Array<{
    id: number;
    name: string;
    bankId: number;
    bankName: string;
  }>;
  mostLikelyCard?: {
    id: number;
    name: string;
    bankId: number;
    bankName: string;
  } | null;
  confidence?: number;
  detectedCards?: Array<{
    id: number;
    name: string;
    bankId: number;
    bankName: string;
  }>; // Cards that were auto-detected (for multi-select mode)
  allowMultiple?: boolean; // Whether to allow selecting multiple cards
}

interface CardSelectionModalProps {
  isOpen: boolean;
  bankQueue?: BankSelectionInfo[]; // Array of banks needing selection
  bankCode?: string; // Fallback for single bank (legacy)
  bankName?: string;
  availableCards?: Array<{
    id: number;
    name: string;
    bankId: number;
    bankName: string;
  }>;
  onCardSelected: (bankCode: string, card: any) => void;
  onCardsSelected?: (bankCode: string, cards: any[]) => void; // For multi-select
  onManualEntry: (bankCode: string, cardName: string) => void;
  onClose: () => void;
}

export default function CardSelectionModal({
  isOpen,
  bankQueue = [],
  bankCode,
  bankName,
  availableCards = [],
  onCardSelected,
  onCardsSelected,
  onManualEntry,
  onClose
}: CardSelectionModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset to first bank when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Use queue if available, otherwise fallback to single bank
  const currentBank = bankQueue.length > 0 ? bankQueue[currentIndex] : {
    bankCode: bankCode || '',
    bankName: bankName || '',
    availableCards
  };

  const isLastBank = bankQueue.length === 0 || currentIndex === bankQueue.length - 1;

  const handleCardSelected = (card: any) => {
    onCardSelected(currentBank.bankCode, card);
    
    if (!isLastBank && bankQueue.length > 0) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleManualEntry = (cardName: string) => {
    onManualEntry(currentBank.bankCode, cardName);
    
    if (!isLastBank && bankQueue.length > 0) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleCardsSelected = (cards: any[]) => {
    if (onCardsSelected) {
      onCardsSelected(currentBank.bankCode, cards);
    }
    
    // Advance to next bank or close modal after confirming multi-select
    if (!isLastBank && bankQueue.length > 0) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors z-10"
        >
          ×
        </button>
        
        {/* Progress indicator */}
        {bankQueue.length > 0 && (
          <div className="absolute -top-10 left-0 right-0 text-center text-white text-sm">
            Bank {currentIndex + 1} of {bankQueue.length}
          </div>
        )}
        
        {/* Most likely card badge */}
        {currentBank.mostLikelyCard && currentBank.confidence && (
          <div className="absolute -top-16 left-0 right-0 text-center">
            <div className="inline-block bg-green-500 text-white text-xs px-3 py-1 rounded-full">
              Best Match: {currentBank.mostLikelyCard.name} ({currentBank.confidence}% confidence)
            </div>
          </div>
        )}
        
        <CardSelection
          bankCode={currentBank.bankCode}
          bankName={currentBank.bankName}
          availableCards={currentBank.availableCards}
          mostLikelyCard={currentBank.mostLikelyCard}
          detectedCards={currentBank.detectedCards}
          allowMultiple={currentBank.allowMultiple}
          onCardSelected={handleCardSelected}
          onCardsSelected={currentBank.allowMultiple ? handleCardsSelected : undefined}
          onManualEntry={handleManualEntry}
        />
        
        {/* Navigation indicator */}
        {bankQueue.length > 0 && (
          <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
            {bankQueue.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? 'bg-blue-600' : 
                  index < currentIndex ? 'bg-green-600' : 
                  'bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
