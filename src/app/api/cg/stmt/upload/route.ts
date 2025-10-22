/**
 * POST /api/cg/stmt/upload
 * Upload statement to BoostScore (proxy endpoint)
 * Based on PRD Section E1
 */

import { NextRequest, NextResponse } from 'next/server';
import type { BoostScoreUploadPayload } from '@/types/boostscore';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for file upload

// Debug environment variables
console.log('=== 🔍 DEBUG ENV VARS ===');
console.log('BOOST_API_KEY exists?', !!process.env.BOOST_API_KEY);
console.log('BOOST_API_KEY value:', process.env.BOOST_API_KEY ? process.env.BOOST_API_KEY.substring(0, 15) + '...' : '❌ UNDEFINED');
console.log('BOOST_API_SECRET exists?', !!process.env.BOOST_API_SECRET);
console.log('BOOST_BASE_URL:', process.env.BOOST_BASE_URL);
console.log('All BOOST vars:', Object.keys(process.env).filter(k => k.includes('BOOST')));
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('========================');

// Mock mode for testing without real API credentials
const MOCK_MODE = process.env.BOOST_API_KEY === 'dummy_key' || !process.env.BOOST_API_KEY;
console.log('🎯 MOCK_MODE:', MOCK_MODE, '(Should be FALSE for real API)');
console.log('========================\n');

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const payloadStr = formData.get('payload') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file', message: 'Please provide a statement file' },
        { status: 400 }
      );
    }

    if (!payloadStr) {
      return NextResponse.json(
        { error: 'Missing payload', message: 'Please provide upload metadata' },
        { status: 400 }
      );
    }

    // Parse and validate payload
    let payload: BoostScoreUploadPayload;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      return NextResponse.json(
        { error: 'Invalid payload', message: 'Payload must be valid JSON' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.name || !payload.dob || !payload.bank || !payload.card_no) {
      return NextResponse.json(
        {
          error: 'Invalid payload',
          message: 'Missing required fields: name, dob, bank, card_no',
        },
        { status: 400 }
      );
    }

    // Validate DOB format (DDMMYYYY)
    if (!/^\d{8}$/.test(payload.dob)) {
      return NextResponse.json(
        {
          error: 'Invalid DOB',
          message: 'DOB must be in DDMMYYYY format (e.g., 15011990)',
        },
        { status: 400 }
      );
    }

    // Check file size
    const maxSize = parseInt(process.env.MAX_UPLOAD_MB || '10') * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `File must be less than ${process.env.MAX_UPLOAD_MB || 10}MB`,
        },
        { status: 413 }
      );
    }

    // MOCK MODE: Return mock response for testing
    if (MOCK_MODE) {
      console.log('⚠️  MOCK MODE: Returning mock upload response');
      console.log('File:', file.name, `(${file.size} bytes)`);
      console.log('Bank:', payload.bank);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockId = 'mock_' + Date.now();
      return NextResponse.json({
        id: mockId,
        processing_eta: {
          value: 2000,
          unit: 'ms'
        },
        status: 'PENDING',
        message: 'Mock upload successful (DEMO MODE - Configure real API keys to use BoostScore)'
      });
    }

    // REAL MODE: Forward to BoostScore
    const { boostScoreClient } = await import('@/lib/boostscore/client');
    const result = await boostScoreClient.uploadStatement(file, payload);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Upload error:', error);

    // Map error to appropriate status code
    if (error.message?.includes('decrypt') || error.message?.includes('password')) {
      return NextResponse.json(
        {
          error: 'Decryption failed',
          message: 'Failed to decrypt PDF. Please provide the correct password.',
        },
        { status: 500 }
      );
    }

    if (error.message?.includes('credentials')) {
      return NextResponse.json(
        { error: 'Configuration error', message: 'Server configuration error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Upload failed', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
