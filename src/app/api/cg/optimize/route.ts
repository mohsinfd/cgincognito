/**
 * POST /api/cg/optimize
 * Run optimizer on transactions
 * Based on PRD Section H
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeOptimizerResult } from '@/lib/optimizer/calculator';
import type { OptimizerInput } from '@/types/optimizer';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for optimizer

export async function POST(request: NextRequest) {
  try {
    const input: OptimizerInput = await request.json();

    // Validate input
    if (!input.user_id || !input.month || !input.txns || !Array.isArray(input.txns)) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Missing required fields: user_id, month, txns',
        },
        { status: 400 }
      );
    }

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(input.month)) {
      return NextResponse.json(
        {
          error: 'Invalid month',
          message: 'Month must be in YYYY-MM format',
        },
        { status: 400 }
      );
    }

    // Run optimizer
    const result = await computeOptimizerResult(input);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Optimizer error:', error);

    return NextResponse.json(
      { error: 'Optimization failed', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

