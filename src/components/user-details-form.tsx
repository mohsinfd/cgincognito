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
  customer_id?: string;
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

  // Auto-fill from localStorage if available
  useEffect(() => {
    const userData = localStorage.getItem('cardgenius_user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.name) setName(parsed.name);
        if (parsed.dob) setDob(parsed.dob);
        console.log('✅ Auto-filled name and DOB from localStorage');
      } catch (err) {
        console.error('Failed to parse user data:', err);
      }
    }
  }, []);

  // Initialize cards based on selected statements
  // Only show card digit inputs for banks that actually require last4/last6 (SBI, HSBC)
  const initializeCards = (): CardDetails[] => {
    const banksNeedingCardInfo = ['hsbc', 'sbi']; // Only these banks need card digits
    
    const uniqueBanks = new Map<string, { bankCode: string; bankName: string }>();
    
    selectedStatements.forEach(stmt => {
      const bankCodeLower = stmt.bankCode.toLowerCase();
      // Only include banks that require card digits (SBI, HSBC)
      if (banksNeedingCardInfo.includes(bankCodeLower) && !uniqueBanks.has(stmt.bankCode)) {
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
      'rbl': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'idfc': { requiredFields: ['dob'], maxAttempts: 8 },
      'sbi': { requiredFields: ['name', 'dob', 'card_last4'], maxAttempts: 8 },
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
    if (updatedCards[index]) {
      updatedCards[index] = { ...updatedCards[index], [field]: value };
      setCards(updatedCards);
    }
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
          Card Registry Setup
        </h2>
        <p className="text-gray-600">
          We need your card details to unlock your PDFs with the correct passwords. Each bank requires specific information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
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
        </div>

        {/* DOB Field */}
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
        </div>

        {/* Card Registry Section - Only for SBI and HSBC */}
        {cards.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Card Details for SBI and HSBC ({cards.length})
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              These banks require card digits to generate the correct password. Enter the last 4 or 6 digits for your cards.
            </p>
            
            <div className="space-y-4">
              {cards.map((card, index) => {
                const bankRules = getBankPasswordRules(card.bankCode);
                const needsLast4 = bankRules?.requiredFields.includes('card_last4');
                const needsLast6 = bankRules?.requiredFields.includes('card_last6');
                
                return (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      {card.bankName}
                    </h4>
                    
                    {/* Only show card digit fields for HSBC and SBI */}
                    {(needsLast4 || needsLast6) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Last 4 digits - only for SBI */}
                        {needsLast4 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Last 4 Digits <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={card.last4}
                              onChange={(e) => updateCard(index, 'last4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="1234"
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors[`card_${index}_last4`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                              disabled={loading}
                            />
                            {errors[`card_${index}_last4`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`card_${index}_last4`]}</p>
                            )}
                          </div>
                        )}
                        
                        {/* Last 6 digits - only for HSBC */}
                        {needsLast6 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Last 6 Digits <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={card.last6 || ''}
                              onChange={(e) => updateCard(index, 'last6', e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="123456"
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors[`card_${index}_last6`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                              disabled={loading}
                            />
                            {errors[`card_${index}_last6`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`card_${index}_last6`]}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="mt-2 text-xs text-gray-500">
                      {needsLast4 && needsLast6 ? 'Both last 4 and 6 digits required' :
                       needsLast4 ? 'Last 4 digits required for SBI password' :
                       needsLast6 ? 'Last 6 digits required for HSBC password' :
                       'No card digits needed - uses name + DOB only'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t">
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
              'Setup Cards & Process Statements'
            )}
          </button>
        </div>
        
        <p className="text-xs text-center text-gray-500">
          Card-specific passwords ensure faster, more accurate processing
        </p>
      </form>
    </div>
  );
}
