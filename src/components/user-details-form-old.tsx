/**
 * User Details Form Component
 * Collects DOB and card numbers for PDF password attempts
 */

'use client';

import { useState, useEffect } from 'react';

export type CardDetails = {
  bankCode: string;
  bankName: string;
  cardType?: string;
  last4: string;
  last6?: string;
};

export type UserDetailsData = {
  name?: string;
  dob?: string;
  cards: CardDetails[];
};


type Props = {
  onSubmit: (details: UserDetailsData) => void;
  onCancel: () => void;
  loading?: boolean;
  selectedStatements?: Array<{
    bankCode: string;
    bankName: string;
    filename: string;
  }>;
};

export default function UserDetailsForm({ onSubmit, onCancel, loading = false, selectedStatements = [] }: Props) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [cards, setCards] = useState<CardDetails[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize cards based on selected statements
  const initializeCards = (): CardDetails[] => {
    const uniqueBanks = new Map<string, { bankCode: string; bankName: string }>();
    
    selectedStatements.forEach(stmt => {
      if (!uniqueBanks.has(stmt.bankCode)) {
        uniqueBanks.set(stmt.bankCode, {
          bankCode: stmt.bankCode,
          bankName: stmt.bankName
        });
      }
    });
    
    return Array.from(uniqueBanks.values()).map(bank => ({
      bankCode: bank.bankCode,
      bankName: bank.bankName,
      last4: '',
      last6: ''
    }));
  };

  // Initialize cards when selectedStatements change
  useEffect(() => {
    if (selectedStatements.length > 0 && cards.length === 0) {
      setCards(initializeCards());
    }
  }, [selectedStatements]);

  const getBankPasswordRules = (bankCode: string): {requiredFields: string[], maxAttempts: number} | null => {
    const rules: Record<string, {requiredFields: string[], maxAttempts: number}> = {
      'hsbc': { requiredFields: ['dob', 'card_last6'], maxAttempts: 10 },
      'hdfc': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'axis': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'rbl': { requiredFields: ['dob'], maxAttempts: 6 },
      'idfc': { requiredFields: ['dob'], maxAttempts: 4 },
      'sbi': { requiredFields: ['dob', 'card_last4'], maxAttempts: 8 },
      'yes': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'icici': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'indusind': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
    };
    
    return rules[bankCode.toLowerCase()] || null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    console.log('🔍 Validating form with cards:', cards);

    // Name validation (required for most banks)
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name should be at least 2 characters';
    }

    // DOB validation (required for most banks)
    if (!dob.trim()) {
      newErrors.dob = 'Date of Birth is required';
    } else {
      const cleanDob = dob.replace(/[^0-9]/g, '');
      if (cleanDob.length !== 8 && cleanDob.length !== 6) {
        newErrors.dob = 'DOB should be DDMMYYYY (8 digits) or DDMMYY (6 digits)';
      }
      // Validate day and month ranges
      if (cleanDob.length >= 4) {
        const day = parseInt(cleanDob.substring(0, 2));
        const month = parseInt(cleanDob.substring(2, 4));
        if (day < 1 || day > 31) {
          newErrors.dob = 'Invalid day (DD should be 01-31)';
        }
        if (month < 1 || month > 12) {
          newErrors.dob = 'Invalid month (MM should be 01-12)';
        }
      }
    }

    // Card validation - check each card
    cards.forEach((card, index) => {
      const bankRules = getBankPasswordRules(card.bankCode);
      if (bankRules?.requiredFields) {
        if (bankRules.requiredFields.includes('card_last4')) {
          if (!card.last4.trim()) {
            newErrors[`card_${index}_last4`] = `${card.bankName} card last 4 digits are required`;
          } else if (!/^\d{4}$/.test(card.last4.trim())) {
            newErrors[`card_${index}_last4`] = `${card.bankName} card must be exactly 4 digits`;
          }
        }
        
        if (bankRules.requiredFields.includes('card_last6')) {
          if (!card.last6?.trim()) {
            newErrors[`card_${index}_last6`] = `${card.bankName} card last 6 digits are required`;
          } else if (!/^\d{6}$/.test(card.last6.trim())) {
            newErrors[`card_${index}_last6`] = `${card.bankName} card must be exactly 6 digits`;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateCard = (index: number, field: 'last4' | 'last6', value: string) => {
    const updatedCards = [...cards];
    updatedCards[index] = { ...updatedCards[index], [field]: value };
    setCards(updatedCards);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const details: UserDetailsData = {
      name: name.trim() || undefined,
      dob: dob.trim() ? dob.replace(/[^0-9]/g, '') : undefined,
      cards: cards.filter(card => card.last4 || card.last6), // Only include cards with digits
    };

    console.log('🎯 Submitting card registry:', details);
    onSubmit(details);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Help Us Unlock Your PDFs
        </h2>
        <p className="text-gray-600">
          Based on your selected statements, we need the following information to unlock your PDFs:
        </p>
        
        {/* Show bank-specific requirements */}
        {selectedStatements.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Required for your selected banks:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              {selectedStatements.map((stmt, idx) => {
                const rules = getBankPasswordRules(stmt.bankCode);
                if (!rules) return null;
                
                const fieldNames = rules.requiredFields.map(field => {
                  switch(field) {
                    case 'name': return 'Name (as on card)';
                    case 'dob': return 'Date of Birth';
                    case 'card_last4': return 'Card Last 4 digits';
                    case 'card_last6': return 'Card Last 6 digits';
                    default: return field;
                  }
                }).join(', ');
                
                return (
                  <li key={idx}>
                    <strong>{stmt.bankName}</strong>: {fieldNames}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field - only show if required */}
        {requiredFields.includes('name') && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name (as on card) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="JOHN DOE"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Used for password attempts on protected PDFs
            </p>
          </div>
        )}

        {/* DOB Field - only show if required */}
        {requiredFields.includes('dob') && (
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              placeholder="DDMMYYYY or DDMMYY (e.g., 15011990)"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.dob ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.dob && (
              <p className="mt-1 text-sm text-red-600">{errors.dob}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Used for password attempts on protected PDFs
            </p>
          </div>
        )}

        {/* Card Last 4 Field - only show if required */}
        {requiredFields.includes('card_last4') && (
          <div>
            <label htmlFor="cardLast4" className="block text-sm font-medium text-gray-700 mb-2">
              Card Last 4 Digits <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="cardLast4"
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4400"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cardLast4 ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.cardLast4 && (
              <p className="mt-1 text-sm text-red-600">{errors.cardLast4}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Last 4 digits of your card (required for SBI, Kotak, etc.)
            </p>
          </div>
        )}

        {/* Card Last 6 Field - only show if required */}
        {requiredFields.includes('card_last6') && (
          <div>
            <label htmlFor="cardLast6" className="block text-sm font-medium text-gray-700 mb-2">
              Card Last 6 Digits <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="cardLast6"
              value={cardLast6}
              onChange={(e) => setCardLast6(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="404400"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cardLast6 ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.cardLast6 && (
              <p className="mt-1 text-sm text-red-600">{errors.cardLast6}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Last 6 digits of your card (required for HSBC)
            </p>
          </div>
        )}

        {/* Additional Card Numbers Field - for multiple cards */}
        {(cardNumbers.trim() || (!requiredFields.includes('card_last4') && !requiredFields.includes('card_last6'))) && (
          <div>
            <label htmlFor="cardNumbers" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Card Numbers (optional)
            </label>
            <input
              type="text"
              id="cardNumbers"
              value={cardNumbers}
              onChange={(e) => setCardNumbers(e.target.value)}
              placeholder="0359, 2866, 9907 (comma-separated for multiple cards)"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cardNumbers ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.cardNumbers && (
              <p className="mt-1 text-sm text-red-600">{errors.cardNumbers}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Add other card numbers for better matching (optional)
            </p>
          </div>
        )}

        {/* Info Boxes */}
        <div className="space-y-3">
          {/* Why Required */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-lg">⚠️</span>
              <div className="text-sm text-amber-900">
                <p className="font-medium mb-1">Why are these fields required?</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>HSBC</strong> requires: Name + DOB + last 6 digits of card</li>
                  <li>• <strong>SBI</strong> requires: DOB + last 4 digits of card</li>
                  <li>• <strong>HDFC/Axis/RBL</strong> require: Name + DOB</li>
                  <li>• <strong>IDFC</strong> requires: DOB only</li>
                  <li>• We'll detect the format from email and try the correct password</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 text-lg">🔒</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Privacy & Security:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Your data is <strong>only</strong> used to unlock PDFs</li>
                  <li>• We <strong>don't store</strong> your DOB or full card numbers</li>
                  <li>• Card numbers are <strong>matched</strong> to statements automatically</li>
                  <li>• All attempts are logged for transparency</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-400 disabled:cursor-not-allowed transition shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Processing...
              </span>
            ) : (
              'Unlock & Process Statements'
            )}
          </button>
        </div>
        
        <p className="text-xs text-center text-gray-500">
          All fields are required for best results • Processing takes 10-30 seconds
        </p>
      </form>
    </div>
  );
}
