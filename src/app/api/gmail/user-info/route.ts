/**
 * GET /api/gmail/user-info
 * Get user email from Gmail API using access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 400 }
      );
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials
    oauth2Client.setCredentials({ access_token: accessToken });

    // Get Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get user profile
    const profile = await gmail.users.getProfile({ userId: 'me' });

    return NextResponse.json({
      success: true,
      email: profile.data.emailAddress,
      messagesTotal: profile.data.messagesTotal,
      threadsTotal: profile.data.threadsTotal,
    });

  } catch (error: any) {
    console.error('Gmail user info error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get user info',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}



