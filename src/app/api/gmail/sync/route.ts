/**
 * POST /api/gmail/sync
 * Full Gmail sync endpoint - finds and processes statements
 */

import { NextRequest, NextResponse } from 'next/server';
import { GmailClient } from '@/lib/gmail/client';
import { analyzePasswordHint } from '@/lib/password/hint-analyzer';
// import { LLMParser } from '@/lib/parser-llm'; // Temporarily disabled

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, userId, processStatements = false } = body;

    if (!accessToken || !userId) {
      return NextResponse.json(
        { error: 'Access token and user ID required' },
        { status: 400 }
      );
    }

    // Create Gmail client
    const gmailClient = new GmailClient(accessToken);

    console.log('🔍 Starting Gmail sync for user:', userId);

    // Search for statements from all banks (last 3 months, max 3 per bank)
    const allResults = await gmailClient.searchAllStatements(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 3 months
      3 // Max 3 statements per bank
    );

    const processedBanks: any[] = [];
    let totalStatements = 0;

    for (const bankResult of allResults) {
      const { bank_code, messages, subject, from, date, attachments, emailBody } = bankResult;
      
      if (messages.length === 0) {
        console.log(`📭 No statements found for ${bank_code}`);
        continue;
      }

      console.log(`📧 Found ${messages.length} statements for ${bank_code}`);

      // Find PDF attachment (prefer actual statements over T&Cs)
      let pdfAttachment = attachments.find((att: any) => {
        const filename = att.filename.toLowerCase();
        return (att.mime_type === 'application/pdf' || filename.endsWith('.pdf')) &&
               !filename.includes('terms') && 
               !filename.includes('conditions') &&
               !filename.includes('keyfact');
      });

      // If no statement PDF found, try any PDF
      if (!pdfAttachment) {
        pdfAttachment = attachments.find((att: any) => 
          att.mime_type === 'application/pdf' || att.filename.toLowerCase().endsWith('.pdf')
        );
      }

      if (!pdfAttachment) {
        console.log(`⚠️ No PDF statement found in latest ${bank_code} email`);
        continue;
      }

      // Analyze password requirements from email body
      let passwordRequirement = null;
      if (emailBody) {
        try {
          console.log(`🔍 Analyzing password hint for ${bank_code}`);
          console.log(`📧 Email body length: ${emailBody.length} characters`);
          console.log(`📧 Email body preview: ${emailBody.substring(0, 200)}...`);
          passwordRequirement = await analyzePasswordHint(emailBody, bank_code);
          console.log(`✅ Password analysis for ${bank_code}: ${passwordRequirement.format} (${passwordRequirement.confidence})`);
        } catch (error) {
          console.error(`❌ Password analysis failed for ${bank_code}:`, error);
        }
      } else {
        console.log(`⚠️ No email body found for ${bank_code}`);
      }

      // Create one entry per message, each with its own PDF attachment
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        // Find PDF attachment for this specific message
        const messageAttachments = message.attachments || [];
        let messagePdfAttachment = messageAttachments.find((att: any) => {
          const filename = att.filename.toLowerCase();
          return (att.mime_type === 'application/pdf' || filename.endsWith('.pdf')) &&
                 !filename.includes('terms') && 
                 !filename.includes('conditions') &&
                 !filename.includes('keyfact');
        });

        // If no statement PDF found, try any PDF
        if (!messagePdfAttachment) {
          messagePdfAttachment = messageAttachments.find((att: any) => 
            att.mime_type === 'application/pdf' || att.filename.toLowerCase().endsWith('.pdf')
          );
        }

        if (!messagePdfAttachment) {
          console.log(`⚠️ No PDF statement found in ${bank_code} message ${i + 1}`);
          continue;
        }
        
        const bankInfo = {
          bank_code,
          message_id: message.id,
          subject: message.subject || subject,
          from: message.from || from,
          date: message.date || date,
          attachment: {
            filename: messagePdfAttachment.filename,
            size: messagePdfAttachment.size,
            attachment_id: messagePdfAttachment.attachment_id,
          },
          total_messages_found: messages.length,
          passwordRequirement,
        };

        // If user wants to process statements, download and parse
        if (processStatements) {
          try {
            console.log(`📥 Downloading statement: ${messagePdfAttachment.filename}`);
            
            // Download PDF
            const pdfBuffer = await gmailClient.getAttachment(message.id!, messagePdfAttachment.attachment_id);
            
            // TODO: Parse with LLM (temporarily disabled - need to install dependencies)
            console.log(`🤖 LLM parsing temporarily disabled - dependencies not installed`);
            
            bankInfo.parsed = {
              success: false,
              error: 'LLM parser dependencies not installed. Please run: npm install',
            };
            console.log(`⚠️ LLM parsing skipped for ${bank_code} - dependencies needed`);
            
          } catch (error: any) {
            bankInfo.parsed = {
              success: false,
              error: error.message,
            };
            console.error(`❌ Error processing ${bank_code} statement:`, error);
          }
        }

        processedBanks.push(bankInfo);
        totalStatements++;
      }
    }

    // Apply labels if modify scope is available (optional)
    if (processStatements) {
      try {
        for (const bankInfo of processedBanks) {
          if (bankInfo.parsed?.success) {
            await gmailClient.applyLabel(bankInfo.message_id, 'CardGenius/Processed');
            console.log(`🏷️ Applied label to ${bankInfo.bank_code} statement`);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not apply labels (modify scope not available)');
      }
    }

    // Deduplicate statements by message_id (Gmail message ID)
    const uniqueStatements = Array.from(
      new Map(processedBanks.map(s => [s.message_id, s])).values()
    );
    
    if (uniqueStatements.length < processedBanks.length) {
      console.log(`📊 Deduplication: ${processedBanks.length} total → ${uniqueStatements.length} unique (removed ${processedBanks.length - uniqueStatements.length} duplicates)`);
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      sync_time: new Date().toISOString(),
      banks_found: uniqueStatements.length,
      total_statements: uniqueStatements.length,
      banks: uniqueStatements,
      note: processStatements 
        ? 'Statements downloaded and parsed with LLM'
        : 'Statement metadata only - use processStatements=true to parse',
    });

  } catch (error: any) {
    console.error('Gmail sync error:', error);
    
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
