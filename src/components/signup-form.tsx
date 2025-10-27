/**
 * Signup Form Component
 * Collects name and DOB when user first connects Gmail
 */

'use client';

import { useState } from 'react';

export type SignupData = {
  name: string;
  dob: string;
};

type Props = {
  onSubmit: (data: SignupData) => void;
  email: string;
  loading?: boolean;
};

export default function SignupForm({ onSubmit, email, loading = false }: Props) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name should be at least 2 characters';
    }
    
    // DOB validation
    if (!dob.trim()) {
      newErrors.dob = 'Date of Birth is required';
    } else {
      const cleanDob = dob.replace(/[^0-9]/g, '');
      if (cleanDob.length !== 8 && cleanDob.length !== 6) {
        newErrors.dob = 'DOB should be DDMMYYYY (8 digits) or DDMMYY (6 digits)';
      } else {
        // Validate day and month ranges
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      name: name.trim().toUpperCase(),
      dob: dob.replace(/[^0-9]/g, '')
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to CardGenius!
        </h1>
        <p className="text-gray-600">
          Connected as <span className="font-semibold text-blue-600">{email}</span>
        </p>
      </div>

      {/* Why We Need This Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Why we need this information
            </h3>
            <p className="text-gray-700 mb-3">
              Your bank statements are protected with passwords. We need your name and date of birth to unlock them securely.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span><strong>Name:</strong> Used to decrypt PDFs from banks like HDFC, Axis, ICICI</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span><strong>Date of Birth:</strong> Combined with name to unlock statements from most banks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span><strong>Secure:</strong> Your data is encrypted and stored locally in your browser</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name (as on your credit cards) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Rajesh Kumar"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Enter your name exactly as it appears on your credit cards
          </p>
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
            placeholder="DDMMYYYY (e.g., 15011990)"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg ${
              errors.dob ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {errors.dob && (
            <p className="mt-1 text-sm text-red-600">{errors.dob}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Format: DDMMYYYY (e.g., 15 January 1990 = 15011990)
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-900 mb-1">Privacy & Security</p>
              <p>
                Your information is stored locally in your browser and is never sent to our servers. 
                It's only used to decrypt your PDFs securely. You can delete all data anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-400 disabled:cursor-not-allowed transition shadow-lg font-semibold text-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating your account...
            </span>
          ) : (
            'Complete Signup & Start Processing'
          )}
        </button>
      </form>
    </div>
  );
}

