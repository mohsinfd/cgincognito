/**
 * GET /api/cg/stmt/:id/content
 * Retrieve statement content from BoostScore (proxy endpoint)
 * Based on PRD Section E2
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Mock mode for testing
const MOCK_MODE = process.env.BOOST_API_KEY === 'dummy_key' || !process.env.BOOST_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const statementId = params.id;

    if (!statementId) {
      return NextResponse.json(
        { error: 'Missing ID', message: 'Statement ID is required' },
        { status: 400 }
      );
    }

    // MOCK MODE: Return mock content
    if (MOCK_MODE || statementId.startsWith('mock_')) {
      console.log('⚠️  MOCK MODE: Returning mock statement content');
      
      // Simulate processing delay on first few calls
      const timestamp = parseInt(statementId.split('_')[1] || '0');
      const elapsed = Date.now() - timestamp;
      
      if (elapsed < 3000) {
        // Still "processing"
        return NextResponse.json({
          id: statementId,
          status: 'PENDING'
        });
      }
      
      // Return completed mock data
      return NextResponse.json({
        id: statementId,
        status: 'COMPLETED',
        content: {
          card_details: {
            bank: 'DEMO BANK',
            num: 'XXXX XXXX XXXX 1234',
            card_type: 'Demo Card',
            credit_limit: 100000,
            available_credit_limit: 95000,
            available_cash_limit: 40000
          },
          owner_details: {
            name: 'DEMO USER',
            email: 'demo@example.com'
          },
          summary: {
            statement_date: '30092025',
            payment_due_date: '15102025',
            total_dues: 5000,
            min_amount_due: 500,
            opening_balance: 0,
            payment_amount: 0,
            purchase_amount: 5000,
            financial_charges: 0,
            cash_advances: 0
          },
          transactions: [
            {
              id: 1,
              type: 'Dr',
              date: '15092025',
              amount: 850,
              description: 'SWIGGY INSTAMART',
              category: '',
              sub_category: ''
            },
            {
              id: 2,
              type: 'Dr',
              date: '16092025',
              amount: 2500,
              description: 'AMAZON PAYMENTS',
              category: '',
              sub_category: ''
            },
            {
              id: 3,
              type: 'Dr',
              date: '18092025',
              amount: 1200,
              description: 'ZOMATO',
              category: '',
              sub_category: ''
            },
            {
              id: 4,
              type: 'Dr',
              date: '20092025',
              amount: 450,
              description: 'UBER RIDES',
              category: '',
              sub_category: ''
            }
          ],
          reward_summary: {
            opening_balance: 1000,
            earned: 50,
            redeemed: 0,
            expired: 0,
            closing_balance: 1050,
            points_expiring: 0,
            expiry_date: ''
          }
        }
      });
    }

    // REAL MODE: Forward to BoostScore
    const { boostScoreClient } = await import('@/lib/boostscore/client');
    const content = await boostScoreClient.getStatementContent(statementId);

    return NextResponse.json(content);
  } catch (error: any) {
    console.error('Retrieve error:', error);

    return NextResponse.json(
      { error: 'Retrieve failed', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
