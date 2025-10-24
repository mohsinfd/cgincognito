/**
 * Gmail Integration Test Page
 * Simple page to test Gmail OAuth connection
 */

'use client';

import { useState, useEffect } from 'react';
import StatementVerification, { type FoundStatement } from '@/components/statement-verification';
import RealTimeProcessingStatus from '@/components/real-time-processing-status';
import NonSupportedBanks from '@/components/non-supported-banks';
import GameSelector from '@/components/game-selector';
import { saveStatement } from '@/lib/storage/browser-storage';

export default function GmailTestPage() {
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [foundStatements, setFoundStatements] = useState<FoundStatement[]>([]);
  const [showVerification, setShowVerification] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [missingFieldsError, setMissingFieldsError] = useState<{
    message: string;
    missingFields: Record<string, string[]>;
  } | null>(null);

  useEffect(() => {
    // Check URL params for OAuth callback
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const email = params.get('email');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiry = params.get('expiry');
    const errorMsg = params.get('error');

    if (success === 'true' && accessToken) {
      setStatus('connected');
      
      // Store tokens in localStorage for sync functionality
      localStorage.setItem('gmail_tokens', JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry: expiry,
      }));
      
      // Get user email from Gmail API if not provided
      if (email && email !== 'unknown') {
        setUserEmail(email);
      } else {
        // Fetch email from Gmail API
        fetch('/api/gmail/user-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserEmail(data.email);
          } else {
            setUserEmail('Connected (email unknown)');
          }
        })
        .catch(() => {
          setUserEmail('Connected (email unknown)');
        });
      }
      
      // Clean URL
      window.history.replaceState({}, '', '/gmail-test');
    }

    if (errorMsg) {
      setError(errorMsg);
    }
  }, []);

  const connectGmail = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gmail/connect');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || 'Failed to connect');
      }
      
      if (data.auth_url) {
        // Redirect to Google OAuth
        setStatus('connecting');
        window.location.href = data.auth_url;
      }
    } catch (err: any) {
      console.error('Failed to connect Gmail:', err);
      setError(err.message || 'Failed to connect Gmail');
      setConnecting(false);
    }
  };

  const testSync = async () => {
    if (!userEmail) return;
    
    try {
      setSyncLoading(true);
      setError(null);
      setShowVerification(false);

      // Get access token from localStorage (stored during OAuth)
      const tokens = localStorage.getItem('gmail_tokens');
      if (!tokens) {
        throw new Error('No access token found. Please reconnect Gmail.');
      }

      const tokenData = JSON.parse(tokens);
      
      console.log('🔄 Starting Gmail sync...');
      
      // Call sync endpoint (just search, don't process yet)
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          userId: userEmail,
          processStatements: false, // Just search for now
        }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.message || 'Sync failed');
      }

      console.log('Sync result:', result);

      // Debug logging
      console.log('🔍 Debug - result.banks:', result.banks);
      console.log('🔍 Debug - banks length:', result.banks?.length || 0);

      // Show verification UI if statements found
      if (result.banks && result.banks.length > 0) {
        console.log('✅ Setting foundStatements and showVerification=true');
        setFoundStatements(result.banks);
        setShowVerification(true);
      } else {
        // No statements found
        console.log('⚠️ No statements found, showing empty verification UI');
        setFoundStatements([]);
        setShowVerification(true);
      }

    } catch (err: any) {
      console.error('Sync failed:', err);
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleVerifyStatements = async (selectedStatements: FoundStatement[], userDetails?: any) => {
    console.log('Processing selected statements:', selectedStatements);
    
    try {
      setSyncLoading(true);
      setProcessingStatus('processing');
      setError(null);

      // Generate session ID for progress tracking
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // Get access token
      const tokens = localStorage.getItem('gmail_tokens');
      if (!tokens) {
        throw new Error('No access token found. Please reconnect Gmail.');
      }

      const tokenData = JSON.parse(tokens);
      
      console.log('🔄 Starting statement processing...');
      
      // Process statements using V2 API (proven script method)
      const response = await fetch('/api/gmail/process-statements-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          statements: selectedStatements,
          userDetails: userDetails || {},
          sessionId: newSessionId, // Pass session ID for progress tracking
        }),
      });

      const result = await response.json();

      if (result.error) {
        // Check if this is a "missing fields" error that requires user input
        if (result.requiresUserInput && result.missingFields) {
          console.log('Missing required fields, showing form:', result.missingFields);
          // Set the missing fields error to trigger form display
          setMissingFieldsError({
            message: result.message,
            missingFields: result.missingFields
          });
          setError(`Please provide required information: ${result.message}`);
          console.log('🔍 Set missingFieldsError:', {
            message: result.message,
            missingFields: result.missingFields
          });
          return; // This will keep the form visible
        }
        throw new Error(result.message || 'Processing failed');
      }

      console.log('Processing result:', result);

      // Clear any missing fields error on successful processing
      setMissingFieldsError(null);

      // Save successful statements to browser storage
      let savedCount = 0;
      console.log(`📊 Processing ${result.statements?.length || 0} statements for saving...`);
      
      if (result.statements && Array.isArray(result.statements)) {
        result.statements.forEach((stmt: any, index: number) => {
          console.log(`📄 Statement ${index + 1}: ${stmt.bank_code} - parsed: ${stmt.parsed}, success: ${stmt.processing_result?.success}`);
          console.log(`📊 Processing result for ${stmt.bank_code}:`, {
            parsed: stmt.parsed,
            success: stmt.processing_result?.success,
            hasParsedData: !!stmt.processing_result?.parsedData,
            hasTransactions: !!stmt.processing_result?.parsedData?.transactions,
            transactionCount: stmt.processing_result?.parsedData?.transactions?.length || 0
          });
          
          if (stmt.parsed && stmt.processing_result?.success && stmt.processing_result?.parsedData) {
            try {
              // Create proper BoostScoreContentResponse format
              const parsedData = stmt.processing_result.parsedData;
              console.log(`📄 Raw parsedData for ${stmt.bank_code}:`, {
                hasTransactions: !!parsedData.transactions,
                transactionCount: parsedData.transactions?.length || 0,
                hasSummary: !!parsedData.summary,
                hasCardDetails: !!parsedData.card_details,
                keys: Object.keys(parsedData || {})
              });

              const transactions = parsedData.transactions || parsedData.transaction || [];
              // Only count DEBIT transactions (actual spending), NOT credits (payments/refunds)
              const totalAmount = transactions.reduce((sum: number, t: any) => {
                // Explicitly check for DEBIT only, exclude all credit types
                const typeStr = (t.type || '').toString().toLowerCase();
                const isCredit = typeStr === 'cr' || typeStr === 'credit' || typeStr.includes('credit') || typeStr.includes('payment');
                const isDebit = !isCredit && (
                  typeStr === 'dr' || 
                  typeStr === 'debit' || 
                  typeStr.includes('debit') ||
                  t.amount > 0 // Default to debit if type is unclear but amount is positive
                );
                return isDebit ? sum + Math.abs(t.amount || 0) : sum;
              }, 0);
              
              const content = {
                id: stmt.message_id,
                status: 'COMPLETED' as const,
                content: {
                  // Ensure we have transactions array
                  transactions: transactions,
                  // Ensure we have summary with required fields
                  summary: {
                    statement_date: parsedData.summary?.statement_date || 
                                   parsedData.statement_date || 
                                   new Date().toISOString().split('T')[0]?.replace(/-/g, '') || '',
                    total_dues: parsedData.summary?.total_dues || 
                               parsedData.total_amount || 
                               totalAmount,
                    bank_code: stmt.bank_code, // Preserve bank code
                    ...parsedData.summary
                  },
                  // Ensure we have card details with proper bank attribution
                  card_details: {
                    num: parsedData.card_details?.num || 
                         parsedData.card_number || 
                         'Unknown', // Don't use bank code as fallback
                    bank_code: stmt.bank_code, // Preserve bank code
                    ...parsedData.card_details
                  },
                  // Include any other data
                  ...parsedData
                }
              };
              
              saveStatement(
                stmt.message_id, // Use message_id as unique ID
                stmt.bank_code,
                content
              );
              savedCount++;
              console.log(`✅ Successfully saved ${stmt.bank_code} statement to browser storage`);
              console.log(`   - Transactions: ${content.content.transactions.length}`);
              console.log(`   - Total Amount: ${content.content.summary.total_dues}`);
              console.log(`   - Card: ${content.content.card_details.num}`);
              console.log(`   - Categories breakdown:`);
              
              // Log category distribution for debugging
              const categoryBreakdown: Record<string, number> = {};
              content.content.transactions.forEach((t: any) => {
                const cat = t.category || 'unknown';
                categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
              });
              Object.entries(categoryBreakdown).forEach(([cat, count]) => {
                console.log(`     • ${cat}: ${count} transactions`);
              });
            } catch (error) {
              console.error(`Failed to save ${stmt.bank_code} statement:`, error);
            }
          }
        });
      }

      // Show results
      const summary = `
Statement Processing Complete! 🎉

✅ Successfully processed: ${result.success_count}
❌ Failed: ${result.error_count}
📊 Success rate: ${result.summary.success_rate}
💾 Saved to dashboard: ${savedCount}

${result.success_count > 0 ? 
  '✅ Some statements were parsed successfully!' : 
  '⚠️ No statements were parsed successfully'}

${savedCount > 0 ? 
  '\n🎯 Visit the Dashboard to see your spending insights!' : ''}

Check console for detailed results!
      `;

      alert(summary);
      
      // Update processing status
      setProcessingStatus('completed');
      
      // Close verification UI
      setShowVerification(false);
      setFoundStatements([]);

      // If statements were saved, suggest visiting dashboard
      if (savedCount > 0) {
        setTimeout(() => {
          const goToDashboard = confirm('Would you like to view your spending insights on the Dashboard?');
          if (goToDashboard) {
            window.location.href = '/dashboard';
          }
        }, 1000);
      }

    } catch (err: any) {
      console.error('Processing failed:', err);
      setError(err.message);
      setProcessingStatus('error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCancelVerification = () => {
    setShowVerification(false);
    setFoundStatements([]);
  };

  const testEmailBody = async (statement: FoundStatement) => {
    try {
      setSyncLoading(true);
      setError(null);

      // Get access token
      const tokens = localStorage.getItem('gmail_tokens');
      if (!tokens) {
        throw new Error('No access token found. Please reconnect Gmail.');
      }

      const tokenData = JSON.parse(tokens);
      
      console.log(`🧪 Testing email body extraction for: ${statement.subject}`);
      
      // Test email body extraction
      const response = await fetch('/api/test-email-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          messageId: statement.message_id,
        }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.message || 'Email body test failed');
      }

      console.log('Email body test result:', result);

      // Show results
      const summary = `
Email Body Analysis Results! 📧

✅ Email body: ${result.emailBody.length} characters
🏦 Bank: ${result.bankCode.toUpperCase()}

${result.passwordAnalysis ? `
🔍 Password Analysis:
- Format: ${result.passwordAnalysis.format}
- Fields: ${result.passwordAnalysis.fields.join(', ')}
- Confidence: ${result.passwordAnalysis.confidence}
- Source: ${result.passwordAnalysis.source}

Instructions: ${result.passwordAnalysis.instructions}
` : '❌ No password analysis available'}

${result.analysisSummary ? `
📊 Analysis Summary:
- Suitable for LLM: ${result.analysisSummary.suitableForLLM}
- Estimated cost: ₹${result.analysisSummary.estimatedLLMCost.toFixed(2)}
- Regex matches: ${result.analysisSummary.regexMatches.join(', ') || 'none'}
` : ''}

Check console for full email body!
      `;

      alert(summary);

    } catch (err: any) {
      console.error('Email body test failed:', err);
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const testPDFExtraction = async (statement: FoundStatement) => {
    try {
      setSyncLoading(true);
      setError(null);

      // Get access token
      const tokens = localStorage.getItem('gmail_tokens');
      if (!tokens) {
        throw new Error('No access token found. Please reconnect Gmail.');
      }

      const tokenData = JSON.parse(tokens);
      
      console.log(`🧪 Testing PDF extraction for: ${statement.attachment.filename}`);
      
      // Test PDF extraction
      const response = await fetch('/api/test-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          messageId: statement.message_id,
          attachmentId: statement.attachment.attachment_id,
        }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.message || 'PDF test failed');
      }

      console.log('PDF test result:', result);

      // Show results
      const summary = `
PDF Extraction Test Results! 🧪

${result.success ? '✅ SUCCESS!' : '❌ FAILED'}

PDF Size: ${result.pdfSize} bytes
Text Length: ${result.textLength || 'N/A'} characters
Pages: ${result.numPages || 'N/A'}
Encrypted: ${result.isEncrypted ? 'Yes' : 'No'}

${result.preview ? `Preview: ${result.preview}...` : ''}

${result.error ? `Error: ${result.error}` : ''}
      `;

      alert(summary);

    } catch (err: any) {
      console.error('PDF test failed:', err);
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className={processingStatus === 'processing' ? "max-w-7xl mx-auto" : "max-w-2xl mx-auto"}>
        <div className={processingStatus === 'processing' ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : ""}>
          <div>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gmail Integration Test</h1>
            <p className="text-gray-600">
              Test connecting your Gmail account to auto-sync credit card statements
            </p>
          </div>
          <div className="flex gap-4">
            <a
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              📊 Dashboard →
            </a>
            <a
              href="/upload"
              className="text-green-600 hover:text-green-700 text-sm"
            >
              📤 Manual Upload →
            </a>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          
          {status === 'disconnected' && (
            <div>
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                <span className="text-gray-600">Not Connected</span>
              </div>
              <button
                onClick={connectGmail}
                disabled={connecting}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {connecting ? 'Connecting...' : '📧 Connect Gmail'}
              </button>
            </div>
          )}

          {status === 'connecting' && (
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2 animate-pulse"></div>
              <span className="text-yellow-600">Connecting... (redirecting to Google)</span>
            </div>
          )}

          {status === 'connected' && (
            <div>
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-green-600 font-medium">Connected</span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <p className="text-sm text-green-800">
                  ✅ Successfully connected: <strong>{userEmail}</strong>
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={testSync}
                  disabled={syncLoading}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {syncLoading ? '🔄 Searching...' : '📧 Search Statements'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-4">
              <p className="text-sm text-red-800">
                ❌ Error: {error}
              </p>
            </div>
          )}
        </div>

        {/* Statement Verification */}
        {showVerification && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-4 text-xs">
              🔍 Debug: showVerification={showVerification.toString()}, foundStatements.length={foundStatements.length}, missingFieldsError={missingFieldsError ? 'SET' : 'NULL'}
            </div>
            
            {/* Show non-supported banks if any */}
            <NonSupportedBanks 
              detectedBanks={foundStatements.map(s => s.bank_code)} 
            />
            
            <StatementVerification
              statements={foundStatements}
              onVerify={handleVerifyStatements}
              onCancel={handleCancelVerification}
              loading={syncLoading}
              missingFieldsError={missingFieldsError || undefined}
            />
            {/* Make test functions available globally */}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.testPDFExtraction = ${testPDFExtraction.toString()};
                  window.testEmailBody = ${testEmailBody.toString()};
                `,
              }}
            />
          </div>
        )}

        {/* Real-Time Processing Status */}
        {processingStatus === 'processing' && sessionId && (
          <div className="mb-6">
            <RealTimeProcessingStatus
              totalStatements={foundStatements.length}
              sessionId={sessionId}
              onComplete={() => {
                setProcessingStatus('completed');
                console.log('✅ Processing completed');
              }}
              onError={(error) => {
                setProcessingStatus('error');
                setError(error);
                console.error('❌ Processing error:', error);
              }}
            />
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Before Connecting:</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Set up Google Cloud Project with Gmail API enabled</li>
            <li>Create OAuth credentials (Web application)</li>
            <li>Add redirect URI: <code className="bg-white px-2 py-1 rounded">http://localhost:3000/api/oauth2/callback</code></li>
            <li>Add your email as a test user</li>
            <li>Add credentials to <code className="bg-white px-2 py-1 rounded">.env.local</code>:
              <pre className="bg-white p-2 rounded mt-2 text-xs overflow-x-auto">
{`GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth2/callback`}
              </pre>
            </li>
            <li>Restart the dev server: <code className="bg-white px-2 py-1 rounded">npm run dev</code></li>
          </ol>
        </div>

        {/* What Happens */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-3">🔐 What Permissions We Request:</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• <strong>gmail.readonly</strong> - Read emails to find statements</li>
            <li>• <strong>gmail.modify</strong> - Apply labels (optional)</li>
            <li>• <strong>email</strong> - Get your email address</li>
          </ul>

          <h3 className="font-semibold mt-4 mb-3">📧 What We Search For:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• HDFC: <code className="text-xs bg-gray-100 px-1">from:alerts@hdfcbank.net subject:statement</code></li>
            <li>• Axis: <code className="text-xs bg-gray-100 px-1">from:alerts@axisbank.com subject:e-Statement</code></li>
            <li>• SBI: <code className="text-xs bg-gray-100 px-1">from:donotreply@sbicard.com subject:statement</code></li>
            <li>• And more banks...</li>
          </ul>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </a>
        </div>
        </div>

        {/* Game Selector - Only show during processing */}
        {processingStatus === 'processing' && (
          <div className="hidden lg:flex justify-center items-start sticky top-8">
            <GameSelector isPlaying={processingStatus === 'processing'} />
          </div>
        )}
        
        {/* Success notification when parsing completes */}
        {processingStatus === 'completed' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-2xl">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Statements Parsed!</h2>
              <p className="text-gray-600 mb-6">
                All your credit card statements have been successfully processed.
              </p>
              <div className="flex gap-4 justify-center">
                <a
                  href="/dashboard"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  📊 View Dashboard
                </a>
                <button
                  onClick={() => setProcessingStatus('idle')}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
    </div>
  );
}

