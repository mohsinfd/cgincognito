/**
 * GET /api/gmail/test-search
 * Test endpoint to search Gmail for statement emails
 * For development/testing only
 */

import { NextRequest, NextResponse } from 'next/server';
import { GmailClient } from '@/lib/gmail/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, query } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 400 }
      );
    }

    // Create Gmail client
    const gmailClient = new GmailClient(accessToken);

    // Default query if none provided
    const searchQuery = query || 'from:alerts@hdfcbank.net subject:statement has:attachment';

    console.log('🔍 Searching Gmail with query:', searchQuery);

    // Search for messages
    const messages = await gmailClient.searchMessages(searchQuery);

    console.log(`✅ Found ${messages.length} messages`);

    // Get details for first few messages
    const messageDetails = [];
    for (const msg of messages.slice(0, 5)) {
      try {
        const details = await gmailClient.getMessage(msg.id!);
        const attachments = await gmailClient.listAttachments(msg.id!);
        
        messageDetails.push({
          id: msg.id,
          threadId: msg.threadId,
          subject: details.payload?.headers?.find((h: any) => h.name === 'Subject')?.value,
          from: details.payload?.headers?.find((h: any) => h.name === 'From')?.value,
          date: details.payload?.headers?.find((h: any) => h.name === 'Date')?.value,
          attachments: attachments.map(att => ({
            filename: att.filename,
            mimeType: att.mime_type,
            size: att.size,
          })),
        });
      } catch (error) {
        console.error('Error getting message details:', error);
      }
    }

    return NextResponse.json({
      success: true,
      query: searchQuery,
      totalFound: messages.length,
      sampleMessages: messageDetails,
      note: 'Showing first 5 messages only',
    });

  } catch (error: any) {
    console.error('Gmail search error:', error);
    
    return NextResponse.json(
      {
        error: 'Search failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}




