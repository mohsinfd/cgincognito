/**
 * Browser-based storage for PoC
 * Stores parsed statements in localStorage
 * No backend database needed!
 */

import type { BoostScoreContentResponse } from '@/types/boostscore';

const STORAGE_KEY = 'cardgenius_statements';
const MAX_STATEMENTS = 25; // Limit to prevent storage overflow

export type StoredStatement = {
  id: string;
  uploadedAt: string;
  bankCode: string;
  cardLast4?: string;
  periodStart?: string;
  periodEnd?: string;
  totalAmount: number;
  transactionCount: number;
  content: BoostScoreContentResponse;
};

/**
 * Save a parsed statement to browser storage
 */
export function saveStatement(
  statementId: string,
  bankCode: string,
  content: BoostScoreContentResponse
): void {
  try {
    console.log(`💾 Saving statement: ${statementId} (${bankCode})`);
    console.log(`📊 Content structure:`, {
      hasContent: !!content.content,
      hasTransactions: !!content.content?.transactions,
      transactionCount: content.content?.transactions?.length || 0,
      hasSummary: !!content.content?.summary,
      hasCardDetails: !!content.content?.card_details
    });
    
    const statements = getStatements();
    
    // Extract metadata
    const cardLast4 = content.content?.card_details?.num?.slice(-4);
    const totalAmount = content.content?.summary?.total_dues || 0;
    const transactionCount = content.content?.transactions?.length || 0;
    
    const newStatement: StoredStatement = {
      id: statementId,
      uploadedAt: new Date().toISOString(),
      bankCode,
      cardLast4,
      totalAmount,
      transactionCount,
      content,
    };
    
    // Add to beginning of array
    statements.unshift(newStatement);
    
    // Limit to MAX_STATEMENTS
    const limited = statements.slice(0, MAX_STATEMENTS);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    
    console.log('✅ Statement saved to browser storage');
  } catch (error) {
    console.error('Failed to save statement:', error);
  }
}

/**
 * Get all stored statements
 */
export function getStatements(): StoredStatement[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    console.log(`📂 Loading statements from localStorage: ${data ? 'found' : 'empty'}`);
    
    if (!data) {
      console.log('📭 No statements found in localStorage');
      return [];
    }
    
    const statements = JSON.parse(data);
    console.log(`📊 Loaded ${statements.length} statements from localStorage:`, 
      statements.map((s: any) => `${s.bankCode} (${s.transactionCount} transactions)`));
    
    return statements;
  } catch (error) {
    console.error('Failed to load statements:', error);
    return [];
  }
}

/**
 * Get a specific statement by ID
 */
export function getStatement(id: string): StoredStatement | null {
  const statements = getStatements();
  return statements.find(s => s.id === id) || null;
}

/**
 * Delete a statement
 */
export function deleteStatement(id: string): void {
  try {
    const statements = getStatements();
    const filtered = statements.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('✅ Statement deleted');
  } catch (error) {
    console.error('Failed to delete statement:', error);
  }
}

/**
 * Delete all statements (one-tap delete)
 */
export function deleteAllStatements(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ All statements deleted');
  } catch (error) {
    console.error('Failed to delete all statements:', error);
  }
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): {
  statementCount: number;
  estimatedSize: string;
  maxStatements: number;
} {
  const statements = getStatements();
  const dataStr = localStorage.getItem(STORAGE_KEY) || '[]';
  const sizeKB = new Blob([dataStr]).size / 1024;
  
  return {
    statementCount: statements.length,
    estimatedSize: `${sizeKB.toFixed(1)} KB`,
    maxStatements: MAX_STATEMENTS,
  };
}

