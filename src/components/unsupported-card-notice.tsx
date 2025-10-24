'use client';

type Props = {
  unsupportedBanks: string[];
};

export default function UnsupportedCardNotice({ unsupportedBanks }: Props) {
  if (unsupportedBanks.length === 0) {
    return null;
  }
  
  const bankNames = unsupportedBanks.map(bank => 
    bank.charAt(0).toUpperCase() + bank.slice(1)
  ).join(', ');
  
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg mb-8">
      <div className="flex items-start">
        <div className="flex-shrink-0 text-2xl">
          ℹ️
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium text-blue-800">
            Some Cards Not Analyzed
          </h3>
          <p className="mt-2 text-sm text-blue-700">
            We found statements from <strong>{bankNames}</strong> but {unsupportedBanks.length === 1 ? 'this card is' : 'these cards are'} not 
            yet in our comparison database.
          </p>
          <p className="mt-2 text-sm text-blue-700">
            <strong>What we've done:</strong>
          </p>
          <ul className="list-disc list-inside mt-1 text-sm text-blue-700 space-y-1 ml-2">
            <li>✅ Processed your {bankNames} transactions</li>
            <li>✅ Included them in your overall spending analysis</li>
            <li>✅ Used them to calculate better card recommendations</li>
          </ul>
          <p className="mt-3 text-sm text-blue-600 font-medium">
            💡 While we can't optimize your {bankNames} usage specifically, 
            you can still see better card alternatives based on your spending patterns below.
          </p>
        </div>
      </div>
    </div>
  );
}

