/**
 * Test Email Body Extraction
 * Debug endpoint to see email body content and password analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { GmailClient } from '@/lib/gmail/client';
import { analyzePasswordHint, getAnalysisSummary } from '@/lib/password/hint-analyzer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, messageId } = body;

    if (!accessToken || !messageId) {
      return NextResponse.json(
        { error: 'Access token and message ID required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing email body extraction for messageId: ${messageId}`);

    // Create Gmail client
    const gmailClient = new GmailClient(accessToken);

    // Extract email body
    console.log('📧 Extracting email body...');
    const emailBody = await gmailClient.getEmailBody(messageId);
    
    console.log(`📄 Email body extracted: ${emailBody.length} characters`);

    // Get message details for context
    const message = await gmailClient.getMessage(messageId);
    const subject = message.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '';
    const from = message.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';

    // Determine bank code (simplified)
    const bankCode = from.toLowerCase().includes('hdfc') ? 'hdfc' :
                    from.toLowerCase().includes('sbi') ? 'sbi' :
                    from.toLowerCase().includes('icici') ? 'icici' :
                    from.toLowerCase().includes('axis') ? 'axis' :
                    from.toLowerCase().includes('kotak') ? 'kotak' :
                    'unknown';

    // Analyze password requirements
    let passwordAnalysis = null;
    let analysisSummary = null;
    
    if (emailBody.length > 0) {
      try {
        console.log('🔍 Analyzing password requirements...');
        passwordAnalysis = await analyzePasswordHint(emailBody, bankCode);
        analysisSummary = getAnalysisSummary(emailBody, bankCode);
        console.log('✅ Password analysis complete');
      } catch (error) {
        console.error('❌ Password analysis failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
      subject,
      from,
      bankCode,
      emailBody: {
        length: emailBody.length,
        preview: emailBody.substring(0, 500),
        full: emailBody, // Include full body for debugging
      },
      passwordAnalysis,
      analysisSummary,
    });

  } catch (error: any) {
    console.error('Test email body error:', error);
    
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

