/**
 * Landing page
 */

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex justify-end gap-3 mb-4">
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:shadow-lg transition font-semibold"
            >
              💡 Optimizer
            </Link>
            <Link
              href="/statements"
              className="bg-white text-gray-700 px-4 py-2 rounded-lg shadow hover:shadow-lg transition"
            >
              📁 My Statements
            </Link>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            CardGenius
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Zero-friction credit card spend analysis with automatic Gmail sync and AI-powered card recommendations
          </p>
        </header>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Gmail Sync */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">🔄</div>
            <h2 className="text-2xl font-semibold mb-3">Auto Gmail Sync</h2>
            <p className="text-gray-600 mb-4">
              Connect your Gmail to automatically fetch credit card statements from 12+ major Indian issuers. Background polling every 15 minutes keeps your data fresh.
            </p>
            <Link
              href="/connect"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Connect Gmail →
            </Link>
          </div>

          {/* Manual Upload */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">📤</div>
            <h2 className="text-2xl font-semibold mb-3">Manual Upload</h2>
            <p className="text-gray-600 mb-4">
              Upload PDF or ZIP statement files (up to 10MB). We support password-protected PDFs and automatically parse transactions.
            </p>
            <Link
              href="/upload"
              className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Upload Statement →
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold mb-2">Smart Categorization</h3>
              <p className="text-sm text-gray-600">
                11 spend buckets with AI-powered merchant detection
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">💡</div>
              <h3 className="font-semibold mb-2">Missed Savings</h3>
              <p className="text-sm text-gray-600">
                See exactly how much you could have saved with better card choices
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🔒</div>
              <h3 className="font-semibold mb-2">Privacy First</h3>
              <p className="text-sm text-gray-600">
                Encrypted storage, masked card numbers, one-tap data deletion
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold mb-2 text-lg">🔐 Your Privacy Matters</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>✓ We only scan credit card statements from your inbox. We don't read other emails.</li>
            <li>✓ Card numbers are masked to last 2-4 digits only</li>
            <li>✓ You can disconnect and delete all data in one tap</li>
            <li>✓ 180-day retention (configurable)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
