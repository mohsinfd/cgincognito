/**
 * GET /api/gmail/process-statements-progress?sessionId=xxx
 * Returns real-time progress for statement processing
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory progress store (simple implementation)
// In production, use Redis or a database
const progressStore = new Map<string, {
  processed: number;
  total: number;
  currentBank: string;
  currentStatement: number;
  status: 'processing' | 'completed' | 'error';
  startTime: number;
  lastUpdate: number;
}>();

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
      // No progress found - either not started or already cleaned up
      return NextResponse.json(
        { 
          error: 'Progress not found',
          processed: 0,
          total: 0,
          status: 'not_found'
        },
        { status: 404 }
      );
    }

    const elapsedSeconds = Math.floor((Date.now() - progress.startTime) / 1000);

    return NextResponse.json({
      processed: progress.processed,
      total: progress.total,
      currentBank: progress.currentBank,
      currentStatement: progress.currentStatement,
      status: progress.status,
      elapsedSeconds,
      percentComplete: progress.total > 0 ? Math.floor((progress.processed / progress.total) * 100) : 0,
    });

  } catch (error: any) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, progress } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const existingProgress = progressStore.get(sessionId);

    // Extract values from the progress object
    const processed = progress?.completedStatements ?? existingProgress?.processed ?? 0;
    const total = progress?.totalStatements ?? existingProgress?.total ?? 0;
    const currentBank = progress?.currentStatement?.bankCode ?? existingProgress?.currentBank ?? '';
    const currentStatementNum = progress?.completedStatements ?? existingProgress?.currentStatement ?? 0;

    progressStore.set(sessionId, {
      processed,
      total,
      currentBank,
      currentStatement: currentStatementNum,
      status: 'processing',
      startTime: existingProgress?.startTime ?? Date.now(),
      lastUpdate: Date.now(),
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Progress update error:', error);
    return NextResponse.json(
      { error: 'Failed to update progress', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    progressStore.delete(sessionId);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Progress cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup progress', message: error.message },
      { status: 500 }
    );
  }
}

// Cleanup old progress entries (> 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, progress] of progressStore.entries()) {
    if (now - progress.lastUpdate > 5 * 60 * 1000) {
      progressStore.delete(sessionId);
      console.log(`🧹 Cleaned up stale progress: ${sessionId}`);
    }
  }
}, 60 * 1000); // Run every minute
