/**
 * Test endpoint to verify environment variables
 * Visit: http://localhost:3000/api/test-env
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const envCheck = {
    BOOST_API_KEY: process.env.BOOST_API_KEY ? '✅ EXISTS (First 15 chars: ' + process.env.BOOST_API_KEY.substring(0, 15) + '...)' : '❌ MISSING',
    BOOST_API_SECRET: process.env.BOOST_API_SECRET ? '✅ EXISTS (Length: ' + process.env.BOOST_API_SECRET.length + ' chars)' : '❌ MISSING',
    BOOST_BASE_URL: process.env.BOOST_BASE_URL || '❌ MISSING',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    allBoostVars: Object.keys(process.env).filter(k => k.includes('BOOST')),
    mockMode: process.env.BOOST_API_KEY === 'dummy_key' || !process.env.BOOST_API_KEY,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    status: 'Environment Check',
    ...envCheck,
    verdict: envCheck.mockMode ? '❌ WILL USE MOCK MODE' : '✅ WILL USE REAL API',
  }, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

