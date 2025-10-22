/**
 * GET /api/gmail/connect
 * Initiate Gmail OAuth flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl } from '@/lib/gmail/oauth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeModify = searchParams.get('modify') !== 'false'; // Default true

    const authUrl = generateAuthUrl(includeModify);

    return NextResponse.json({ auth_url: authUrl });
  } catch (error: any) {
    console.error('Gmail connect error:', error);

    return NextResponse.json(
      { error: 'Connection failed', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

