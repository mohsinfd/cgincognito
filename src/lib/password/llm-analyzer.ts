/**
 * LLM-based Password Hint Analyzer
 * Uses OpenAI to analyze complex email patterns for password requirements
 */

import type { PasswordRequirement } from './cache';

/**
 * Analyze password hint using LLM when regex patterns fail
 */
export async function analyzePasswordHintWithLLM(
  emailBody: string,
  bankCode: string
): Promise<PasswordRequirement> {
  try {
    console.log(`🤖 Analyzing password hint with LLM for ${bankCode}`);
    
    const prompt = `Analyze this Indian bank email for PDF statement password instructions.

Email content:
"""
${emailBody.substring(0, 2000)} // Limit to 2000 chars to save costs
"""

Extract password requirements and return ONLY a JSON object with this exact structure:
{
  "fields": ["dob", "card_last4", "name", "pan", "mobile"],
  "format": "DDMMYYYY + last 4 digits",
  "instructions": "Enter your date of birth (DDMMYYYY) followed by last 4 digits of card",
  "confidence": "high"
}

Field options: "name", "dob", "card_last4", "card_last2", "pan", "mobile"
Confidence options: "high", "medium", "low"

Common Indian bank patterns:
- HDFC: Usually DDMMYYYY (date of birth)
- SBI: Usually last 4 digits of card
- ICICI: Often DDMM + last 4 digits
- Axis: Usually DDMMYYYY (date of birth)
- Kotak: Sometimes mobile number

If no clear password instruction is found, return:
{
  "fields": ["dob", "card_last4"],
  "format": "Date of birth or card digits",
  "instructions": "Try your date of birth (DDMMYYYY) or last 4 digits of card",
  "confidence": "low"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing Indian bank emails for PDF password patterns. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    let parsedResult;
    try {
      // Clean up response (remove markdown code blocks if present)
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsedResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', content);
      throw new Error('Invalid JSON response from LLM');
    }

    // Validate required fields
    if (!parsedResult.fields || !Array.isArray(parsedResult.fields)) {
      throw new Error('Invalid fields in LLM response');
    }

    const result: PasswordRequirement = {
      fields: parsedResult.fields,
      format: parsedResult.format || 'Password protected',
      instructions: parsedResult.instructions || 'Please provide your details to unlock the statement',
      confidence: parsedResult.confidence || 'medium',
      source: 'llm',
      bankCode,
      createdAt: new Date().toISOString(),
      successCount: 0,
      totalAttempts: 0,
    };

    // Calculate cost (approximate)
    const inputTokens = Math.ceil(prompt.length / 4); // Rough estimate
    const outputTokens = Math.ceil(content.length / 4);
    const cost = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000; // GPT-4o-mini pricing in USD
    const costINR = cost * 83; // Convert to INR

    console.log(`💰 LLM analysis cost: ₹${costINR.toFixed(2)} (${inputTokens + outputTokens} tokens)`);
    console.log(`🎯 LLM result: ${result.fields.join(', ')} - ${result.format}`);

    return result;

  } catch (error) {
    console.error('LLM password analysis failed:', error);
    
    // Fallback to default pattern
    return {
      fields: ['dob', 'card_last4'],
      format: 'Date of birth or card digits (LLM analysis failed)',
      instructions: 'LLM analysis failed. Please try your date of birth (DDMMYYYY) or last 4 digits of your card.',
      confidence: 'low',
      source: 'llm',
      bankCode,
      createdAt: new Date().toISOString(),
      successCount: 0,
      totalAttempts: 0,
    };
  }
}

/**
 * Check if email body contains enough content for LLM analysis
 */
export function isEmailSuitableForLLM(emailBody: string): boolean {
  // Need at least 50 characters and some password-related keywords
  if (emailBody.length < 50) {
    return false;
  }
  
  const passwordKeywords = [
    'password', 'unlock', 'open', 'access', 'decrypt', 'protected',
    'statement', 'pdf', 'attachment', 'document'
  ];
  
  const text = emailBody.toLowerCase();
  const keywordCount = passwordKeywords.filter(keyword => text.includes(keyword)).length;
  
  return keywordCount >= 2; // At least 2 password-related keywords
}

/**
 * Estimate LLM analysis cost before calling
 */
export function estimateLLMCost(emailBody: string): { costUSD: number; costINR: number } {
  const inputTokens = Math.ceil(emailBody.substring(0, 2000).length / 4);
  const outputTokens = 100; // Average output
  
  const costUSD = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000;
  const costINR = costUSD * 83;
  
  return { costUSD, costINR };
}

