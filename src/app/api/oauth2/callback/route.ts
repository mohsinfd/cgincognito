/**
 * GET /api/oauth2/callback
 * Gmail OAuth callback handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, decodeIdToken } from '@/lib/gmail/oauth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      // User denied access or other OAuth error
      return NextResponse.redirect(
        `${process.env.WEB_ORIGIN}/gmail-test?error=oauth_denied&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.WEB_ORIGIN}/gmail-test?error=missing_code&message=Authorization code not provided`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user email from access token instead of ID token to avoid expiry issues
    let userEmail = 'unknown';
    try {
      if (tokens.id_token) {
        const userInfo = await decodeIdToken(tokens.id_token);
        userEmail = userInfo.email;
      }
    } catch (error) {
      console.log('ID token expired, using fallback method');
      // Fallback: we'll get email from Gmail API later
    }

    // Store tokens temporarily in redirect URL for frontend to pick up
    // TODO: Store tokens in database (encrypted) for production
    const params = new URLSearchParams({
      success: 'true',
      email: userEmail,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      expiry: tokens.expiry_date?.toString() || '',
    });

    return NextResponse.redirect(
      `${process.env.WEB_ORIGIN}/gmail-test?${params.toString()}`
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);

    return NextResponse.redirect(
      `${process.env.WEB_ORIGIN}/gmail-test?error=oauth_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`
    );
  }
}

