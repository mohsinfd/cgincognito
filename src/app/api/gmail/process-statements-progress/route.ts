/**
 * Progress tracking endpoint for statement processing
 * Provides real-time updates on processing status
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// In-memory progress store (in production, use Redis or database)
const progressStore = new Map<string, any>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const progress = progressStore.get(sessionId);
    
    if (!progress) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(progress);
  } catch (error: any) {
    console.error('Progress tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, progress } = body;
    
    if (!sessionId || !progress) {
      return NextResponse.json(
        { error: 'Session ID and progress required' },
        { status: 400 }
      );
    }

    progressStore.set(sessionId, {
      ...progress,
      lastUpdated: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Progress update error:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (sessionId) {
      progressStore.delete(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Progress cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup progress' },
      { status: 500 }
    );
  }
}
