/**
 * Test PDF extraction endpoint
 * Simple test to see if PDF extraction works
 */

import { NextRequest, NextResponse } from 'next/server';
import { GmailClient } from '@/lib/gmail/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, messageId, attachmentId } = body;

    if (!accessToken || !messageId || !attachmentId) {
      return NextResponse.json(
        { error: 'Access token, message ID, and attachment ID required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing PDF download: messageId=${messageId}, attachmentId=${attachmentId}`);

    // Create Gmail client
    const gmailClient = new GmailClient(accessToken);

    // Download PDF
    console.log('📥 Downloading PDF...');
    const pdfBuffer = await gmailClient.getAttachment(messageId, attachmentId);
    
    console.log(`📄 PDF downloaded: ${pdfBuffer.length} bytes`);

    // Try simple text extraction
    try {
      const pdfParse = (await import('pdf-parse')).default;
      
      console.log('🔍 Attempting text extraction...');
      const data = await pdfParse(pdfBuffer);
      
      console.log(`✅ Text extracted: ${data.text.length} characters, ${data.numpages} pages`);
      
      return NextResponse.json({
        success: true,
        pdfSize: pdfBuffer.length,
        textLength: data.text.length,
        numPages: data.numpages,
        preview: data.text.substring(0, 200),
        isEncrypted: false,
      });
      
    } catch (extractError: any) {
      console.error('❌ PDF extraction failed:', extractError);
      
      return NextResponse.json({
        success: false,
        pdfSize: pdfBuffer.length,
        error: extractError.message,
        isEncrypted: extractError.message.includes('password') || extractError.message.includes('encrypted'),
      });
    }

  } catch (error: any) {
    console.error('Test PDF error:', error);
    
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

