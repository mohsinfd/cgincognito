'use client';

import React from 'react';
import CardSelection from './card-selection';

interface CardSelectionModalProps {
  isOpen: boolean;
  bankCode: string;
  bankName: string;
  availableCards: Array<{
    id: number;
    name: string;
    bankId: number;
    bankName: string;
  }>;
  onCardSelected: (card: any) => void;
  onManualEntry: (cardName: string) => void;
  onClose: () => void;
}

export default function CardSelectionModal({
  isOpen,
  bankCode,
  bankName,
  availableCards,
  onCardSelected,
  onManualEntry,
  onClose
}: CardSelectionModalProps) {
  if (!isOpen) return null;

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
        
        <CardSelection
          bankCode={bankCode}
          bankName={bankName}
          availableCards={availableCards}
          onCardSelected={(card) => {
            onCardSelected(card);
            onClose();
          }}
          onManualEntry={(cardName) => {
            onManualEntry(cardName);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
