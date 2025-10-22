/**
 * Statement upload form component
 * Based on PRD Section I2
 */

'use client';

import { useState, FormEvent } from 'react';
import type { BoostScoreUploadPayload } from '@/types/boostscore';

type Props = {
  onSuccess: (statementId: string) => void;
  onError: (error: string) => void;
};

const BANK_CODES = [
  { code: 'hdfc', name: 'HDFC Bank' },
  { code: 'sbi', name: 'State Bank of India' },
  { code: 'icici', name: 'ICICI Bank' },
  { code: 'axis', name: 'Axis Bank' },
  { code: 'kotak', name: 'Kotak Mahindra Bank' },
  { code: 'hsbc', name: 'HSBC Bank' },
  { code: 'sc', name: 'Standard Chartered' },
  { code: 'citi', name: 'Citibank' },
  { code: 'amex', name: 'American Express' },
  { code: 'indusind', name: 'IndusInd Bank' },
  { code: 'yes', name: 'Yes Bank' },
  { code: 'rbl', name: 'RBL Bank' },
];

export default function UploadForm({ onSuccess, onError }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<BoostScoreUploadPayload>({
    name: '',
    dob: '',
    bank: '',
    card_no: '',
    pass_str: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!file) {
      onError('Please select a file');
      return;
    }

    if (!payload.name || !payload.dob || !payload.bank || !payload.card_no) {
      onError('Please fill in all required fields');
      return;
    }

    // Validate DOB format
    if (!/^\d{8}$/.test(payload.dob)) {
      onError('DOB must be 8 digits (DDMMYYYY), e.g., 15011990');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('payload', JSON.stringify(payload));

      const response = await fetch('/api/cg/stmt/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      onSuccess(data.id);
    } catch (error: any) {
      onError(error.message || 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
      {/* File Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Statement File *
        </label>
        <input
          type="file"
          accept=".pdf,.zip"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          required
        />
        <p className="text-xs text-gray-500 mt-1">PDF or ZIP file, max 10MB</p>
      </div>

      {/* Bank Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bank *
        </label>
        <select
          value={payload.bank}
          onChange={(e) => setPayload({ ...payload, bank: e.target.value })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select your bank</option>
          {BANK_CODES.map((bank) => (
            <option key={bank.code} value={bank.code}>
              {bank.name}
            </option>
          ))}
        </select>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name (as on card) *
        </label>
        <input
          type="text"
          value={payload.name}
          onChange={(e) => setPayload({ ...payload, name: e.target.value })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="JOHN DOE"
          required
        />
      </div>

      {/* DOB */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date of Birth *
        </label>
        <input
          type="text"
          value={payload.dob}
          onChange={(e) => setPayload({ ...payload, dob: e.target.value })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="15011990 (DDMMYYYY)"
          maxLength={8}
          pattern="\d{8}"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Format: DDMMYYYY (e.g., 15011990)</p>
      </div>

      {/* Card Last Digits */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Last 2-4 Digits *
        </label>
        <input
          type="text"
          value={payload.card_no}
          onChange={(e) => setPayload({ ...payload, card_no: e.target.value })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="1234"
          maxLength={4}
          pattern="\d{2,4}"
          required
        />
      </div>

      {/* Password (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          PDF Password (if protected)
        </label>
        <input
          type="password"
          value={payload.pass_str}
          onChange={(e) => setPayload({ ...payload, pass_str: e.target.value })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Optional"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave blank if not password-protected
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        {isSubmitting ? 'Uploading...' : 'Upload & Parse Statement'}
      </button>
    </form>
  );
}

