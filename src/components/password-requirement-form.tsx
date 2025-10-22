/**
 * Dynamic Password Requirement Form
 * Shows only required fields based on email hint analysis
 */

'use client';

import { useState } from 'react';
import type { PasswordRequirement } from '@/lib/password/cache';

type Props = {
  requirement: PasswordRequirement;
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function PasswordRequirementForm({ 
  requirement, 
  onSubmit, 
  onCancel, 
  loading = false 
}: Props) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    requirement.fields.forEach(field => {
      const value = formData[field]?.trim();
      
      if (!value) {
        // Field is optional, but show warning for better success rate
        return;
      }

      switch (field) {
        case 'name':
          if (value.length < 2) {
            newErrors[field] = 'Name should be at least 2 characters';
          }
          break;
          
        case 'dob':
          const cleanDob = value.replace(/[^0-9]/g, '');
          if (cleanDob.length !== 8 && cleanDob.length !== 6) {
            newErrors[field] = 'DOB should be DDMMYYYY or DDMMYY format';
          }
          break;
          
        case 'card_last4':
          const cleanCard4 = value.replace(/[^0-9]/g, '');
          if (cleanCard4.length !== 4) {
            newErrors[field] = 'Should be exactly 4 digits';
          }
          break;
          
        case 'card_last2':
          const cleanCard2 = value.replace(/[^0-9]/g, '');
          if (cleanCard2.length !== 2) {
            newErrors[field] = 'Should be exactly 2 digits';
          }
          break;
          
        case 'pan':
          const cleanPan = value.replace(/[^A-Z0-9]/g, '');
          if (cleanPan.length !== 10) {
            newErrors[field] = 'PAN should be 10 characters (e.g., ABCDE1234F)';
          }
          break;
          
        case 'mobile':
          const cleanMobile = value.replace(/[^0-9]/g, '');
          if (cleanMobile.length !== 10) {
            newErrors[field] = 'Mobile should be 10 digits';
          }
          break;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Clean and format the data
    const cleanedData: Record<string, string> = {};
    
    requirement.fields.forEach(field => {
      const value = formData[field]?.trim();
      if (value) {
        switch (field) {
          case 'name':
            cleanedData[field] = value.toUpperCase();
            break;
          case 'dob':
            cleanedData[field] = value.replace(/[^0-9]/g, '');
            break;
          case 'card_last4':
          case 'card_last2':
            cleanedData[field] = value.replace(/[^0-9]/g, '');
            break;
          case 'pan':
            cleanedData[field] = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            break;
          case 'mobile':
            cleanedData[field] = value.replace(/[^0-9]/g, '');
            break;
          default:
            cleanedData[field] = value;
        }
      }
    });

    onSubmit(cleanedData);
  };

  const getFieldLabel = (field: string): string => {
    switch (field) {
      case 'name': return 'Name (as on card)';
      case 'dob': return 'Date of Birth';
      case 'card_last4': return 'Last 4 digits of card';
      case 'card_last2': return 'Last 2 digits of card';
      case 'pan': return 'PAN Card Number';
      case 'mobile': return 'Mobile Number';
      default: return field;
    }
  };

  const getFieldPlaceholder = (field: string): string => {
    switch (field) {
      case 'name': return 'JOHN DOE';
      case 'dob': return 'DDMMYYYY (e.g., 15011990)';
      case 'card_last4': return '1234';
      case 'card_last2': return '34';
      case 'pan': return 'ABCDE1234F';
      case 'mobile': return '9876543210';
      default: return '';
    }
  };

  const getConfidenceColor = (confidence: string): string => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSourceIcon = (source: string): string => {
    switch (source) {
      case 'cache': return '🎯';
      case 'regex': return '🔍';
      case 'llm': return '🤖';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          📄 Unlock PDF Statement
        </h3>
        
        {/* Confidence Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border mb-3 ${getConfidenceColor(requirement.confidence)}`}>
          <span>{getSourceIcon(requirement.source)}</span>
          <span className="capitalize">{requirement.confidence} confidence</span>
          <span className="text-xs opacity-75">({requirement.source})</span>
        </div>
        
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Password Format:</strong> {requirement.format}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {requirement.instructions}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {requirement.fields.map(field => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getFieldLabel(field)}
              <span className="text-gray-500 ml-1">(Optional)</span>
            </label>
            <input
              type={field === 'dob' || field.includes('card') || field === 'mobile' ? 'tel' : 'text'}
              value={formData[field] || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={getFieldPlaceholder(field)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors[field] ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors[field] && (
              <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
            )}
          </div>
        ))}

        {/* Help Text */}
        <div className="bg-gray-50 rounded p-3 text-xs text-gray-600">
          💡 <strong>Tip:</strong> Fill in the fields you know. The system will try multiple password combinations based on your input.
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Unlock PDF'}
          </button>
        </div>
      </form>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-gray-500">Debug Info</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify(requirement, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

