/**
 * POST /api/gmail/process-statements
 * Process selected statements with PDF parsing and password attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { GmailClient } from '@/lib/gmail/client';
import { LLMPDFProcessor } from '@/lib/pdf-processor/llm-pdf-processor';
import { 
  matchStatementToCard, 
  buildEnhancedUserDetails,
  createSimpleCardRegistry 
} from '@/lib/utils/card-matcher';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, statements, userDetails } = body;

    if (!accessToken || !statements || !Array.isArray(statements)) {
      return NextResponse.json(
        { error: 'Access token and statements array required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Processing ${statements.length} statements`);

    // Validate required fields for selected banks
    const bankRules: Record<string, {requiredFields: string[], maxAttempts: number}> = {
      'hsbc': { requiredFields: ['dob', 'card_last6'], maxAttempts: 10 },
      'hdfc': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'axis': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'rbl': { requiredFields: ['dob'], maxAttempts: 6 },
      'idfc': { requiredFields: ['dob'], maxAttempts: 4 },
      'sbi': { requiredFields: ['dob', 'card_last4'], maxAttempts: 8 },
      'yes': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'icici': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'indusind': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
    };

    // Check if user has provided required fields for all selected banks
    const missingFieldsByBank: Record<string, string[]> = {};
    const selectedBanks = [...new Set(statements.map(s => s.bank_code))];
    
    for (const bankCode of selectedBanks) {
      const rules = bankRules[bankCode.toLowerCase()];
      if (!rules) continue;
      
      const missingFields: string[] = [];
      const card = userDetails?.cardNumbers?.[0] ? { last4: userDetails.cardNumbers[0] } : null;
      
      for (const field of rules.requiredFields) {
        if (field === 'name' && !userDetails?.name) missingFields.push('name');
        if (field === 'dob' && !userDetails?.dob) missingFields.push('dob');
        if (field === 'card_last4' && !card?.last4) missingFields.push('card_last4');
        if (field === 'card_last6' && !card?.last4) missingFields.push('card_last6'); // Use last4 as fallback
      }
      
      if (missingFields.length > 0) {
        missingFieldsByBank[bankCode] = missingFields;
      }
    }

    // If any required fields are missing, return error with details
    if (Object.keys(missingFieldsByBank).length > 0) {
      const errorMessage = Object.entries(missingFieldsByBank)
        .map(([bank, fields]) => `${bank.toUpperCase()}: ${fields.join(', ')}`)
        .join('; ');
      
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        missingFields: missingFieldsByBank,
        message: `Please provide the following required fields: ${errorMessage}`,
        requiresUserInput: true
      }, { status: 400 });
    }

    // Create clients
    const gmailClient = new GmailClient(accessToken);
    const pdfProcessor = new LLMPDFProcessor(gmailClient);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each statement
    for (const statement of statements) {
      try {
        console.log(`📄 Processing ${statement.bank_code}: ${statement.attachment.filename}`);
        
        // Extract card numbers from subject/filename
        const detectedCardNumbers = LLMPDFProcessor.extractCardNumbers(
          statement.subject, 
          statement.attachment.filename
        );
        
        console.log(`🔍 Detected card numbers from email: ${detectedCardNumbers.join(', ') || 'none'}`);

        // Check if we have attachment_id
        if (!statement.attachment.attachment_id) {
          throw new Error(`Missing attachment_id for ${statement.attachment.filename}`);
        }

        // Create simple card registry from user's card numbers
        const userCardRegistry = userDetails?.cardNumbers && userDetails.cardNumbers.length > 0
          ? createSimpleCardRegistry('temp_user', statement.bank_code, userDetails.cardNumbers)
          : [];

        console.log(`👤 User has ${userCardRegistry.length} ${statement.bank_code.toUpperCase()} cards in registry`);

        // Match statement to specific card
        const cardMatch = matchStatementToCard(
          statement.bank_code,
          detectedCardNumbers,
          userCardRegistry
        );

        console.log(`🎯 Card matching result: ${cardMatch.matched ? 'MATCHED' : 'NOT MATCHED'}`);
        console.log(`   Confidence: ${cardMatch.confidence}`);
        console.log(`   Reason: ${cardMatch.reason}`);
        if (cardMatch.card) {
          console.log(`   Using card: ${cardMatch.card.last4}`);
        }

        // Build enhanced user details with matched card
        const enhancedUserDetails = buildEnhancedUserDetails(
          userDetails?.name || '',
          userDetails?.dob || '',
          userDetails?.mobile,
          cardMatch.card,
          userCardRegistry
        );

        console.log(`📋 Enhanced user details:`, {
          name: enhancedUserDetails.name,
          dob: enhancedUserDetails.dob,
          matchedCard: enhancedUserDetails.card?.last4 || 'none',
          allCardsCount: enhancedUserDetails.allCards?.length || 0,
        });

        // Process PDF with password attempts
        const result = await pdfProcessor.processStatement(
          statement.message_id,
          statement.attachment.attachment_id,
          statement.attachment.filename,
          statement.bank_code,
          {
            name: enhancedUserDetails.name,
            dob: enhancedUserDetails.dob,
            cardNumbers: enhancedUserDetails.allCards?.map(c => c.last4) || [],
            // Include matched card in the details (will be picked up by password generator)
            ...enhancedUserDetails
          } as any,
          statement.passwordRequirement // Pass password requirements if available
        );

        const processedStatement = {
          ...statement,
          processing_result: result,
          parsed: result.success,
        };

        results.push(processedStatement);

        if (result.success) {
          successCount++;
          console.log(`✅ Successfully processed ${statement.bank_code} with password: ${result.passwordUsed}`);
        } else {
          errorCount++;
          console.log(`❌ Failed to process ${statement.bank_code}: ${result.error}`);
        }

      } catch (error: any) {
        console.error(`💥 Error processing ${statement.bank_code}:`, error);
        
        results.push({
          ...statement,
          processing_result: {
            success: false,
            error: error.message || 'Processing failed',
            attempts: 0,
          },
          parsed: false,
        });
        
        errorCount++;
      }
    }

    console.log(`📊 Processing complete: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      processed_count: statements.length,
      success_count: successCount,
      error_count: errorCount,
      statements: results,
      summary: {
        total_processed: statements.length,
        successful: successCount,
        failed: errorCount,
        success_rate: statements.length > 0 ? (successCount / statements.length * 100).toFixed(1) + '%' : '0%',
      },
    });

  } catch (error: any) {
    console.error('Statement processing error:', error);
    
    return NextResponse.json(
      {
        error: 'Processing failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
