/**
 * DEBUG: View raw statement data from BoostScore
 * This helps us see what categories we're actually receiving
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MOCK_MODE = process.env.BOOST_API_KEY === 'dummy_key' || !process.env.BOOST_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const statementId = params.id;

    if (MOCK_MODE || statementId.startsWith('mock_')) {
      return NextResponse.json({
        error: 'Debug only works with real BoostScore data',
        message: 'Upload a real statement first'
      }, { status: 400 });
    }

    // Call BoostScore API
    const { boostScoreClient } = await import('@/lib/boostscore/client');
    const content = await boostScoreClient.getStatementContent(statementId);

    // Return raw data for inspection
    return NextResponse.json({
      id: content.id,
      status: content.status,
      transactionCount: content.content?.transactions?.length || 0,
      sampleTransactions: content.content?.transactions?.slice(0, 10).map(t => ({
        description: t.description,
        category: t.category,
        sub_category: t.sub_category,
        amount: t.amount,
        type: t.type,
      })) || [],
      fullContent: content
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug failed',
      message: error.message
    }, { status: 500 });
  }
}

