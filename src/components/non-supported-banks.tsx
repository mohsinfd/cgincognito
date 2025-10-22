import React from 'react';

type Props = {
  detectedBanks: string[];
};

const NON_SUPPORTED_BANKS = [
  {
    code: 'onecard',
    name: 'OneCard',
    reason: 'App-driven statements (no PDF emails)',
    icon: '💳'
  },
  {
    code: 'jupiter',
    name: 'Jupiter Edge',
    reason: 'App-driven statements (no PDF emails)',
    icon: '🪐'
  }
];

export default function NonSupportedBanks({ detectedBanks }: Props) {
  const nonSupported = NON_SUPPORTED_BANKS.filter(bank => 
    detectedBanks.includes(bank.code)
  );

  if (nonSupported.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-8">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-yellow-800">
            Non-Supported Banks Detected
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            We found statements from banks that don't send PDF statements via email.
          </p>
          <div className="mt-4 space-y-3">
            {nonSupported.map((bank) => (
              <div key={bank.code} className="flex items-center gap-3">
                <span className="text-2xl">{bank.icon}</span>
                <div>
                  <p className="font-medium text-yellow-800">{bank.name}</p>
                  <p className="text-sm text-yellow-700">{bank.reason}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-sm text-yellow-700">
              💡 <strong>Tip:</strong> For these banks, you can manually upload PDF statements 
              from their mobile apps or web portals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
