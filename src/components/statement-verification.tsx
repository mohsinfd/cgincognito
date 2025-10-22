/**
 * Statement Verification Component
 * Shows found statements and lets user select which ones to process
 */

'use client';

import { useState, useEffect } from 'react';
import UserDetailsForm, { type UserDetailsData } from './user-details-form';
import PasswordRequirementForm from './password-requirement-form';
import type { PasswordRequirement } from '@/lib/password/cache';

export type FoundStatement = {
  bank_code: string;
  message_id: string;
  subject: string;
  from: string;
  date: string;
  attachment: {
    filename: string;
    size: number;
    attachment_id?: string;
  };
  total_messages_found: number;
  isSelected?: boolean;
  passwordRequirement?: PasswordRequirement | null;
};

type Props = {
  statements: FoundStatement[];
  onVerify: (selectedStatements: FoundStatement[], userDetails?: UserDetailsData) => void;
  onCancel: () => void;
  loading?: boolean;
  missingFieldsError?: {
    message: string;
    missingFields: Record<string, string[]>;
  };
};

export default function StatementVerification({ 
  statements, 
  onVerify, 
  onCancel, 
  loading = false,
  missingFieldsError
}: Props) {
  const [localStatements, setLocalStatements] = useState<FoundStatement[]>(
    statements.map(stmt => ({ ...stmt, isSelected: true })) // Default all selected
  );
  const [showUserDetailsForm, setShowUserDetailsForm] = useState(!!missingFieldsError);

  // Sync localStatements when statements prop changes
  useEffect(() => {
    setLocalStatements(statements.map(stmt => ({ ...stmt, isSelected: true })));
  }, [statements]);

  // Handle missingFieldsError - show form when error is present
  useEffect(() => {
    if (missingFieldsError) {
      console.log('🔍 MissingFieldsError detected, showing UserDetailsForm');
      setShowUserDetailsForm(true);
    }
  }, [missingFieldsError]);

  // Force show form if missingFieldsError is present
  useEffect(() => {
    if (missingFieldsError && !showUserDetailsForm) {
      console.log('🔍 Forcing UserDetailsForm display due to missingFieldsError');
      setShowUserDetailsForm(true);
    }
  }, [missingFieldsError, showUserDetailsForm]);

  console.log('🔍 StatementVerification render:', {
    showUserDetailsForm,
    missingFieldsError: !!missingFieldsError,
    statementsCount: statements.length,
    selectedCount: localStatements.filter(s => s.isSelected).length,
    missingFieldsErrorDetails: missingFieldsError
  });

  const handleSelectToggle = (messageId: string, isSelected: boolean) => {
    setLocalStatements(prev => 
      prev.map(stmt => 
        stmt.message_id === messageId 
          ? { ...stmt, isSelected }
          : stmt
      )
    );
  };

  const handleSelectAll = () => {
    const allSelected = localStatements.every(stmt => stmt.isSelected);
    setLocalStatements(prev => 
      prev.map(stmt => ({ ...stmt, isSelected: !allSelected }))
    );
  };

  const handleProcessSelected = () => {
    const selectedStatements = localStatements.filter(stmt => stmt.isSelected);
    setShowUserDetailsForm(true);
  };

  const handleUserDetailsSubmit = (userDetails: UserDetailsData) => {
    const selectedStatements = localStatements.filter(stmt => stmt.isSelected);
    onVerify(selectedStatements, userDetails);
  };

  const handleUserDetailsCancel = () => {
    // Process without user details (common passwords only)
    const selectedStatements = localStatements.filter(stmt => stmt.isSelected);
    onVerify(selectedStatements);
  };

  const getBankDisplayName = (bankCode: string): string => {
    const bankNames: Record<string, string> = {
      'hdfc': 'HDFC Bank',
      'sbi': 'State Bank of India',
      'icici': 'ICICI Bank',
      'axis': 'Axis Bank',
      'kotak': 'Kotak Mahindra',
      'hsbc': 'HSBC India',
      'sc': 'Standard Chartered',
      'citi': 'Citibank',
      'indusind': 'IndusInd Bank',
      'yes': 'Yes Bank',
      'rbl': 'RBL Bank',
      'idfc': 'IDFC First Bank',
      'federal': 'Federal Bank',
    };
    return bankNames[bankCode] || bankCode.toUpperCase();
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPasswordSourceIcon = (source: string): string => {
    switch (source) {
      case 'cache': return '🎯';
      case 'regex': return '🔍';
      case 'llm': return '🤖';
      default: return '❓';
    }
  };

  const selectedCount = localStatements.filter(stmt => stmt.isSelected).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Processing statements...</p>
      </div>
    );
  }

  if (showUserDetailsForm) {
    console.log('🔍 Showing UserDetailsForm with selectedStatements:', localStatements.filter(s => s.isSelected).length);
    return (
      <UserDetailsForm
        onSubmit={handleUserDetailsSubmit}
        onCancel={handleUserDetailsCancel}
        loading={loading}
        selectedStatements={localStatements.filter(s => s.isSelected).map(s => ({
          bankCode: s.bank_code,
          bankName: getBankDisplayName(s.bank_code),
          filename: s.attachment.filename
        }))}
      />
    );
  }

  if (statements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-semibold mb-2">No Statements Found</h3>
        <p className="text-gray-600 mb-4">
          We couldn't find any credit card statements in your Gmail inbox.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Make sure you have recent credit card statement emails from major Indian banks.
        </p>
        <button
          onClick={onCancel}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Found {statements.length} Credit Card Statements
            </h2>
            <p className="text-gray-600 mt-1">
              Select the statements you want to analyze for card recommendations
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {localStatements.every(stmt => stmt.isSelected) ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <span className="text-lg">ℹ️</span>
            <p className="text-sm">
              We'll download and analyze the selected statements to show you which credit cards 
              would give you the best rewards based on your spending patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Statements List */}
      <div className="space-y-4">
        {localStatements.map((stmt, index) => (
          <div
            key={stmt.message_id}
            className={`border rounded-lg p-4 transition-colors ${
              stmt.isSelected 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Selection Checkbox */}
              <input
                type="checkbox"
                checked={stmt.isSelected}
                onChange={(e) => handleSelectToggle(stmt.message_id, e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600"
              />

              {/* Statement Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                    {getBankDisplayName(stmt.bank_code)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(stmt.date)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatFileSize(stmt.attachment.size)}
                  </span>
                  
                  {/* Password Requirement Badge */}
                  {stmt.passwordRequirement && (
                    <span className={`px-2 py-1 rounded text-xs ${
                      stmt.passwordRequirement.confidence === 'high' 
                        ? 'bg-green-100 text-green-700' 
                        : stmt.passwordRequirement.confidence === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {getPasswordSourceIcon(stmt.passwordRequirement.source)} {stmt.passwordRequirement.format}
                    </span>
                  )}
                </div>

                <h3 className="font-medium text-gray-900 mb-1">
                  {stmt.subject}
                </h3>

                <p className="text-sm text-gray-600 mb-2">
                  From: {stmt.from}
                </p>

                <p className="text-sm text-gray-500">
                  File: {stmt.attachment.filename}
                </p>
              </div>

                  {/* Verification Toggle */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      stmt.isSelected ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                    <span className="text-xs text-gray-500">
                      {stmt.isSelected ? 'Selected' : 'Skipped'}
                    </span>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          if ((window as any).testPDFExtraction) {
                            (window as any).testPDFExtraction(stmt);
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        Test PDF
                      </button>
                      <button
                        onClick={() => {
                          if ((window as any).testEmailBody) {
                            (window as any).testEmailBody(stmt);
                          }
                        }}
                        className="text-xs text-green-600 hover:text-green-700 underline"
                      >
                        Test Email
                      </button>
                    </div>
                  </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedCount} of {statements.length} statements selected
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            
            <button
              onClick={handleProcessSelected}
              disabled={selectedCount === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Process {selectedCount} Statement{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}