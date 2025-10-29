/**
 * Optimizer Results Component
 * Shows missed savings and card recommendations
 */

'use client';

import { useEffect, useState } from 'react';
import type { CGSpendVector, CGCalculatorResponse, CGCardRecommendation } from '@/types/optimizer';
import { mapBucket } from '@/lib/mapper/rules';
import CardRecommendation from './card-recommendation';
import OptimizationWarnings from './optimization-warnings';
import UnsupportedCardNotice from './unsupported-card-notice';
import GoodCardNotice from './good-card-notice';
import { detectAllOptimizations, OptimizationWarning } from '@/lib/optimizer/category-optimizer';
import { getPopularCardForBank, isBankSupported, UNSUPPORTED_BANKS, getBankName, getCardsForBank } from '@/lib/optimizer/card-registry';
import { autoMatchCard, type CardMatchResult } from '@/lib/optimizer/card-matcher';
import CardSelectionModal, { type BankSelectionInfo } from './card-selection-modal';

type Props = {
  statements: any[];
  selectedMonth: string;
};

export default function OptimizerResults({ statements, selectedMonth }: Props) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<CGCalculatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimizationWarnings, setOptimizationWarnings] = useState<Record<string, OptimizationWarning[]>>({});
  const [unsupportedBanks, setUnsupportedBanks] = useState<string[]>([]);
  const [cardMatches, setCardMatches] = useState<Record<string, CardMatchResult[]>>({});
  const [needsUserInput, setNeedsUserInput] = useState<Record<string, boolean>>({});
  const [goodCards, setGoodCards] = useState<Record<string, { card: CGCardRecommendation; rank: number }>>({});
  const [cardSelectionModal, setCardSelectionModal] = useState<{
    isOpen: boolean;
    bankCode?: string;
    bankName?: string;
    bankQueue?: BankSelectionInfo[];
  }>({ isOpen: false });

  // Function to process a manually selected card
  const processSelectedCard = async (bankCode: string, selectedCard: any) => {
    try {
      console.log(`🔍 Processing manually selected card for ${bankCode}: ${selectedCard.name}`);
      
      // Build spend vector
      const spendVector = buildSpendVector(statements, selectedMonth);
      
      // Call API with selected_card_id
      const userCardResponse = await fetch('https://card-recommendation-api-v2.bankkaro.com/cg/api/beta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...spendVector,
          selected_card_id: selectedCard.id,
        }),
      });

      if (!userCardResponse.ok) {
        throw new Error(`API call failed: ${userCardResponse.status}`);
      }

      const userCardData = await userCardResponse.json();
      const userCards = userCardData.savings || userCardData.cards || userCardData;
      
      if (!Array.isArray(userCards) || userCards.length === 0) {
        throw new Error('Invalid response from CardGenius API');
      }

      const currentCard = userCards[0];
      const bestCard = userCards.length > 1 ? userCards[1] : currentCard;
      
      // Detect optimization warnings
      const warnings = detectAllOptimizations(currentCard, bestCard);
      
      setOptimizationWarnings(prev => ({
        ...prev,
        [bankCode]: warnings
      }));

      console.log(`✅ Processed manual card selection for ${bankCode}`);
      
    } catch (error) {
      console.error(`❌ Failed to process manual card selection for ${bankCode}:`, error);
    }
  };

  // Load card matches from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cardgenius_card_selections');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📂 Loading card selections from localStorage:', parsed);
        setCardMatches(parsed);
      }
    } catch (error) {
      console.warn('Failed to load card selections from localStorage:', error);
    }
  }, []);

  // Save card matches to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(cardMatches).length > 0) {
      try {
        localStorage.setItem('cardgenius_card_selections', JSON.stringify(cardMatches));
        console.log('💾 Saved card selections to localStorage');
      } catch (error) {
        console.warn('Failed to save card selections to localStorage:', error);
      }
    }
  }, [cardMatches]);

  useEffect(() => {
    if (statements.length === 0) return;
    
    runOptimizer();
  }, [statements, selectedMonth]); // Note: runOptimizer uses cardMatches and optimizationWarnings from state

  const runOptimizer = async () => {
    // Check both state and localStorage for existing selections
    let existingMatches = cardMatches;
    if (Object.keys(cardMatches).length === 0) {
      try {
        const saved = localStorage.getItem('cardgenius_card_selections');
        if (saved) {
          existingMatches = JSON.parse(saved);
        }
      } catch (error) {
        // Ignore
      }
    }
    
    // If we already have card matches and warnings, don't run again
    if (Object.keys(existingMatches).length > 0 && Object.keys(optimizationWarnings).length > 0) {
      console.log('✅ Skipping optimizer - using existing results');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Step 1: Identify unique banks from statements
      const uniqueBanks = Array.from(new Set(statements.map(s => s.bankCode?.toLowerCase()).filter(Boolean)));
      console.log('🏦 User banks from statements:', uniqueBanks);
      
      // Step 2: Separate supported and unsupported banks
      const supported = uniqueBanks.filter(bank => isBankSupported(bank));
      const unsupported = uniqueBanks.filter(bank => 
        UNSUPPORTED_BANKS.includes(bank) || !isBankSupported(bank)
      );
      
      console.log('✅ Supported banks:', supported);
      console.log('❌ Unsupported banks:', unsupported);
      
      setUnsupportedBanks(unsupported);
      
      // Step 3: Build spend vector from statements
      const spendVector = buildSpendVector(statements);
      
      // Step 4: Get general recommendations (no selected_card_id)
      console.log('📊 Calling CardGenius API for general recommendations...');
      
      const response = await fetch('https://card-recommendation-api-v2.bankkaro.com/cg/api/beta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(spendVector),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎯 Raw CardGenius API response:', data);
      
      const cardsArray = data.savings || data.cards || data;
      
      if (!Array.isArray(cardsArray)) {
        console.error('❌ API response is not an array:', typeof cardsArray, data);
        throw new Error('Invalid API response format - expected array of cards');
      }
      
      const VALID_CARD_IDS = [8,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,32,33,34,35,36,39,40,41,43,44,45,46,47,49,50,51,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,80,81];
      const filteredCards = cardsArray.filter((card: any) => VALID_CARD_IDS.includes(card.id));
      
      console.log('🎯 General recommendations:', {
        totalCards: cardsArray.length,
        filteredCards: filteredCards.length,
        topCards: filteredCards.slice(0, 5).map((c: any) => ({ name: c.card_name, savings: c.total_savings }))
      });
      
      setRecommendations(filteredCards);
      
      // Step 5: Collect banks needing card selection BEFORE processing
      const banksNeedingSelection: BankSelectionInfo[] = [];
      const warningsByBank: Record<string, OptimizationWarning[]> = {};
      const matches: Record<string, CardMatchResult[]> = {}; // Changed to array to support multiple cards
      const needsInput: Record<string, boolean> = {};
      
      // First pass: identify which banks need manual selection AND detect multiple cards
      for (const bankCode of supported) {
        const bankStatements = statements.filter(s => s.bankCode?.toLowerCase() === bankCode);
        
        if (bankStatements.length === 0) {
          console.log(`⚠️ No statements found for ${bankCode}`);
          continue;
        }
        
        // NEW: Match EACH statement to detect multiple cards
        const statementMatches = new Map<string, CardMatchResult>();
        const uniqueCardNumbers = new Set<string>();
        
        for (const stmt of bankStatements) {
          // Extract card number (last4) if available
          const cardLast4 = 
            stmt.cardLast4 ||
            stmt.content?.content?.card_details?.num?.slice(-4) ||
            stmt.processing_result?.parsedData?.card_details?.num?.slice(-4) ||
            stmt.content?.card_details?.num?.slice(-4);
          
          if (cardLast4) {
            uniqueCardNumbers.add(cardLast4);
          }
          
          // Try matching with standard threshold first
          let matchResult = autoMatchCard(stmt, 80);
          
          // If no match but we have multiple card numbers, try lower threshold
          if (!matchResult && uniqueCardNumbers.size > 1) {
            console.log(`🔍 Multiple card numbers detected for ${bankCode}, trying lower threshold...`);
            matchResult = autoMatchCard(stmt, 50); // Lower threshold when multiple cards likely
          }
          
          if (matchResult && matchResult.confidence >= 50) {
            // Use card name as key to detect multiple cards
            const cardKey = matchResult.card.name;
            if (!statementMatches.has(cardKey)) {
              statementMatches.set(cardKey, matchResult);
            }
          }
        }
        
        const uniqueMatches = Array.from(statementMatches.values());
        
        // If we have multiple unique card numbers, treat as multiple cards scenario
        const hasMultipleCardNumbers = uniqueCardNumbers.size > 1;
        
        console.log(`📊 ${bankCode} analysis:`, {
          statements: bankStatements.length,
          uniqueCardNumbers: uniqueCardNumbers.size,
          uniqueCardNames: uniqueMatches.length,
          cardNumbers: Array.from(uniqueCardNumbers),
          cardNames: uniqueMatches.map(m => m.card.name)
        });
        
        if (uniqueMatches.length === 0) {
          // No confident matches - need user input
          banksNeedingSelection.push({
            bankCode,
            bankName: getBankName(bankCode),
            availableCards: getCardsForBank(bankCode),
            mostLikelyCard: null,
            confidence: 0,
            allowMultiple: hasMultipleCardNumbers, // Allow multiple if distinct card numbers
            detectedCards: hasMultipleCardNumbers ? [] : undefined // No detected cards, but allow multi-select
          });
          needsInput[bankCode] = true;
        } else if (uniqueMatches.length === 1 && !hasMultipleCardNumbers) {
          // Single card detected and single card number - proceed normally
          matches[bankCode] = uniqueMatches;
          needsInput[bankCode] = false;
        } else {
          // MULTIPLE CARDS SCENARIO (either multiple card names OR multiple card numbers)
          // Always prompt for selection if:
          // 1. Multiple card names detected, OR
          // 2. Multiple card numbers detected (even if only one card name matched)
          console.log(`🎯 ${bankCode} has ${uniqueMatches.length} card name(s) and ${uniqueCardNumbers.size} card number(s) detected`);
          
          banksNeedingSelection.push({
            bankCode,
            bankName: getBankName(bankCode),
            availableCards: getCardsForBank(bankCode),
            mostLikelyCard: uniqueMatches[0]?.card || null,
            confidence: uniqueMatches[0]?.confidence || 0,
            detectedCards: uniqueMatches.length > 0 ? uniqueMatches.map(m => m.card) : undefined,
            allowMultiple: true // Always allow multiple when we detect multiple cards/numbers
          });
          needsInput[bankCode] = true;
        }
      }
      
      // If banks need selection, open modal with full queue
      if (banksNeedingSelection.length > 0) {
        console.log(`📋 Opening card selection modal for ${banksNeedingSelection.length} banks`);
        setCardSelectionModal({
          isOpen: true,
          bankQueue: banksNeedingSelection
        });
        setCardMatches(matches);
        setNeedsUserInput(needsInput);
        setLoading(false);
        return; // User will continue flow after card selection
      }
      
      // Second pass: process all banks with confident matches (handle multiple cards)
      for (const bankCode of supported) {
        const matchResults = matches[bankCode];
        if (!matchResults || matchResults.length === 0) continue; // Skip banks needing manual selection
        
        // Process EACH card for this bank
        for (const matchResult of matchResults) {
          const selectedCard = matchResult.card;
          
          // Create unique key for this bank+card combination
          const cardKey = `${bankCode}_${selectedCard.id}`;
          
          console.log(`🔍 Analyzing ${bankCode} card: ${selectedCard.name} (ID: ${selectedCard.id})...`);
          
          try {
            const userCardResponse = await fetch('https://card-recommendation-api-v2.bankkaro.com/cg/api/beta', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...spendVector,
                selected_card_id: selectedCard.id,
              }),
            });
            
            if (!userCardResponse.ok) {
              console.error(`Failed to get analysis for ${bankCode} card ${selectedCard.name}`);
              continue;
            }
            
            const userCardData = await userCardResponse.json();
            const userCards = userCardData.savings || userCardData.cards || userCardData;
            
            if (!Array.isArray(userCards) || userCards.length === 0) {
              console.error(`Invalid response for ${bankCode} card ${selectedCard.name}:`, userCardData);
              continue;
            }
            
            const currentCard = userCards[0];
            const bestCard = userCards.length > 1 ? userCards[1] : currentCard;
            
            console.log(`💡 ${bankCode} ${selectedCard.name} analysis:`, {
              currentCard: currentCard.card_name,
              currentSavings: currentCard.total_savings,
              bestCard: bestCard.card_name,
              bestSavings: bestCard.total_savings,
            });
            
            const warnings = detectAllOptimizations(currentCard, bestCard);
            
            // Check if user's card is ranked #1 or #2 (already optimal)
            if (userCards.length > 0) {
              const userCardRank = userCards.findIndex(c => c.id === currentCard.id) + 1;
              const isOptimal = userCardRank <= 2;
              
              if (isOptimal) {
                console.log(`✅ ${bankCode} ${selectedCard.name} is optimal (ranked #${userCardRank})`);
                setGoodCards(prev => ({
                  ...prev,
                  [cardKey]: {
                    card: currentCard,
                    rank: userCardRank
                  }
                }));
              }
            }
            
            if (warnings.length > 0) {
              warningsByBank[cardKey] = warnings;
              console.log(`⚠️ Found ${warnings.length} optimization warnings for ${bankCode} ${selectedCard.name}`);
            }
          } catch (err) {
            console.error(`Error analyzing ${bankCode} card ${selectedCard.name}:`, err);
          }
        }
      }
      
      setOptimizationWarnings(warningsByBank);
      setCardMatches(matches);
      setNeedsUserInput(needsInput);
      
    } catch (err: any) {
      console.error('Optimizer error:', err);
      setError(err.message || 'Failed to calculate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const buildSpendVector = (statements: any[]): CGSpendVector => {
    // Use the complete spend vector builder
    const { buildCompleteSpendVector } = require('@/lib/optimizer/spend-vector-builder');
    
    console.log('🔍 OptimizerResults building spend vector from statements:', statements.length);
    
    // Flatten all transactions from all statements
    const allTransactions: any[] = [];
    statements.forEach((stmt, index) => {
      console.log(`📊 Statement ${index + 1}: ${stmt.bankCode}`, {
        hasContent: !!stmt.content,
        hasNestedContent: !!stmt.content?.content,
        transactions: stmt.content?.content?.transactions?.length || 0,
        transactionCount: stmt.transactionCount
      });
      
      // Try multiple paths for transactions
      const transactions = stmt.content?.content?.transactions || 
                          stmt.content?.transactions || 
                          stmt.transactions || 
                          [];
      
      allTransactions.push(...transactions);
      console.log(`  📈 Added ${transactions.length} transactions to spend vector`);
    });

    console.log(`📊 Total transactions for optimizer: ${allTransactions.length}`);

    // Calculate actual months of data from statement dates
    const uniqueMonths = new Set<string>();
    statements.forEach(stmt => {
      const date = stmt.content?.content?.summary?.statement_date ||
                   stmt.content?.summary?.statement_date ||
                   stmt.statement_date;
      
      if (date) {
        console.log(`📅 Processing date: ${date}`);
        
        // Handle different date formats
        let year, month;
        if (date.length === 8 && /^\d{8}$/.test(date)) {
          // YYYYMMDD format (e.g., "20251024" = 24 Oct 2025)
          year = date.substring(0, 4);
          month = date.substring(4, 6);
          const day = date.substring(6, 8);
          console.log(`  📅 Parsed YYYYMMDD: year=${year}, month=${month}, day=${day}`);
        } else if (date.includes('-')) {
          // YYYY-MM-DD or YYYY-MM format
          const parts = date.split('-');
          year = parts[0];
          month = parts[1];
        } else if (date.includes('/')) {
          // DD/MM/YYYY format
          const parts = date.split('/');
          if (parts.length === 3) {
            year = parts[2];
            month = parts[1];
          }
        }
        
        if (year && month) {
          const monthKey = `${year}-${month}`;
          uniqueMonths.add(monthKey);
          console.log(`  📅 Added month: ${monthKey}`);
        }
      }
    });
    
    const monthsOfData = uniqueMonths.size || 1;
    console.log(`📊 Months of data: ${monthsOfData} (unique months: ${Array.from(uniqueMonths).join(', ')})`);
    
    if (allTransactions.length === 0) {
      console.warn('⚠️ No transactions found for optimizer');
    }
    
    return buildCompleteSpendVector(allTransactions, monthsOfData);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Calculating your potential savings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Unable to calculate recommendations</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={runOptimizer}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <p className="text-gray-600">No recommendations available</p>
      </div>
    );
  }

  const topCard = recommendations[0];
  const monthlySavings = topCard.total_savings || 0;
  const annualSavings = topCard.total_savings_yearly || 0;

  // Flatten all optimization warnings
  const allWarnings = Object.values(optimizationWarnings).flat();

  return (
    <div className="space-y-8">
      {/* Unsupported Banks Notice */}
      {unsupportedBanks.length > 0 && <UnsupportedCardNotice unsupportedBanks={unsupportedBanks} />}
      
      {/* Good Cards - Cards That Are Already Optimal */}
      {Object.entries(goodCards).map(([bankCode, data]) => (
        <GoodCardNotice
          key={bankCode}
          cardName={data.card.card_name}
          bankName={getBankName(bankCode)}
          totalSavings={data.card.total_savings}
          rank={data.rank}
          annualSavings={data.card.total_savings_yearly}
        />
      ))}

      {/* Optimization Warnings (Category Mismatches + Cap Hits) */}
      {Object.entries(optimizationWarnings).map(([cardKey, warnings]) => {
        // Parse cardKey to extract bankCode and cardId
        const [bankCode, cardId] = cardKey.split('_');
        const matchResultsRaw = cardMatches[bankCode] as any;
        const needsConfirmation = needsUserInput[bankCode];
        
        // Normalize matchResults to always be an array
        const matchResults = Array.isArray(matchResultsRaw)
          ? matchResultsRaw
          : matchResultsRaw
            ? [matchResultsRaw]
            : [];
        
        // Find the specific card match
        const matchResult = matchResults.find((m: any) => m.card.id.toString() === cardId);
        const cardName = matchResult?.card.name || getBankName(bankCode);
        
        return (
          <div key={cardKey}>
            {/* Show card match confidence if available */}
            {matchResult && matchResult.confidence < 100 && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  ℹ️ We detected your {getBankName(bankCode)} card as <strong>{matchResult.card.name}</strong> ({matchResult.confidence}% confidence).
                  {needsConfirmation && ' Please confirm if this is correct.'}
                </p>
              </div>
            )}
            
            {/* Warnings */}
            <OptimizationWarnings 
              warnings={warnings}
              userCardName={cardName}
            />
          </div>
        );
      })}

      {/* Missed Savings Hero */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-xl p-8 text-white">
        <div className="flex items-center gap-6">
          <div className="text-7xl">💰</div>
          <div className="flex-1">
            <p className="text-green-100 text-sm uppercase tracking-wide mb-2">
              Potential Monthly Savings
            </p>
            <h2 className="text-5xl font-bold mb-2">
              ₹{monthlySavings.toLocaleString()}
            </h2>
            <p className="text-green-100 text-lg">
              That's <span className="font-bold">₹{annualSavings.toLocaleString()}</span> per year!
            </p>
            <p className="text-green-100 mt-2 text-sm">
              With the right credit cards, you could be earning significantly more rewards on your everyday spending.
            </p>
          </div>
        </div>
      </div>

      {/* Top Recommended Cards */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Recommended Cards for You</h2>
          <span className="text-sm text-gray-500">
            Based on your spending pattern
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {recommendations.slice(0, 5).map((card, index) => (
            <CardRecommendation
              key={card.id}
              card={card}
              rank={index + 1}
              isTop={index === 0}
            />
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      {topCard.spending_breakdown_array && topCard.spending_breakdown_array.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-6">Where You'll Save the Most</h3>
          <div className="space-y-4">
            {topCard.spending_breakdown_array
              .filter((item: any) => item.savings > 0)
              .sort((a: any, b: any) => b.savings - a.savings)
              .slice(0, 5)
              .map((item: any) => (
                <div key={item.on} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium capitalize">
                      {item.on.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-600">
                      With {topCard.card_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ₹{item.savings.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">per month</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Action CTA */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold mb-2">Ready to Optimize?</h3>
        <p className="text-gray-600 mb-4">
          Apply for the recommended cards to start maximizing your rewards
        </p>
        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
          Compare All Cards
        </button>
      </div>

      {/* Card Selection Modal */}
      <CardSelectionModal
        isOpen={cardSelectionModal.isOpen}
        bankQueue={cardSelectionModal.bankQueue}
        bankCode={cardSelectionModal.bankCode}
        bankName={cardSelectionModal.bankName}
        availableCards={cardSelectionModal.bankCode ? getCardsForBank(cardSelectionModal.bankCode) : []}
        onCardSelected={(bankCode, card) => {
          console.log(`✅ User selected card: ${card.name} for ${bankCode}`);
          // Store selection but don't call API yet
          setCardMatches(prev => ({
            ...prev,
            [bankCode]: [
              {
                card,
                confidence: 100,
                method: 'manual'
              }
            ]
          }));
        }}
        onCardsSelected={(bankCode, cards) => {
          console.log(`✅ User selected ${cards.length} cards for ${bankCode}:`, cards.map(c => c.name));
          // Store multiple selections
          setCardMatches(prev => ({
            ...prev,
            [bankCode]: cards.map(card => ({
              card,
              confidence: 100,
              method: 'manual'
            }))
          }));
        }}
        onManualEntry={(bankCode, cardName) => {
          console.log(`✅ User entered manual card: ${cardName} for ${bankCode}`);
          const manualCard = {
            id: 999,
            name: cardName,
            bankId: getCardsForBank(bankCode)[0]?.bankId || 0,
            bankName: getBankName(bankCode)
          };
          // Store selection but don't call API yet
          setCardMatches(prev => ({
            ...prev,
            [bankCode]: [
              {
                card: manualCard,
                confidence: 100,
                method: 'manual'
              }
            ]
          }));
        }}
        onClose={async () => {
          console.log('🔄 Card selection completed. Processing all banks...');
          setCardSelectionModal({ isOpen: false });
          
          // Now process all selected cards with API calls
          const selectedCards = Object.entries(cardMatches);
          const warningsByBank: Record<string, OptimizationWarning[]> = {};
          
          for (const [bankCode, matchResults] of selectedCards) {
            // Ensure matchResults is always an array
            const resultsArray = Array.isArray(matchResults) ? matchResults : [matchResults];
            if (!resultsArray || resultsArray.length === 0) continue;
            
            // Process EACH card for this bank
            for (const matchResult of resultsArray) {
              const selectedCard = matchResult.card;
              const cardKey = `${bankCode}_${selectedCard.id}`;
              
              console.log(`🔍 Analyzing ${bankCode} with card ID ${selectedCard.id} (${selectedCard.name})...`);
              
              try {
                const spendVector = buildSpendVector(statements, selectedMonth);
                
                const userCardResponse = await fetch('https://card-recommendation-api-v2.bankkaro.com/cg/api/beta', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    ...spendVector,
                    selected_card_id: selectedCard.id,
                  }),
                });
                
                if (!userCardResponse.ok) {
                  console.error(`Failed to get analysis for ${bankCode} card ${selectedCard.name}: ${userCardResponse.status}`);
                  // Skip this card but continue with others
                  continue;
                }
                
                const userCardData = await userCardResponse.json();
                const userCards = userCardData.savings || userCardData.cards || userCardData;
                
                if (!Array.isArray(userCards) || userCards.length === 0) {
                  console.error(`Invalid response for ${bankCode} card ${selectedCard.name}:`, userCardData);
                  continue;
                }
                
                const currentCard = userCards[0];
                const bestCard = userCards.length > 1 ? userCards[1] : currentCard;
                
                const warnings = detectAllOptimizations(currentCard, bestCard);
                
                if (warnings.length > 0) {
                  warningsByBank[cardKey] = warnings;
                  console.log(`⚠️ Found ${warnings.length} optimization warnings for ${bankCode} card ${selectedCard.name}`);
                }
              } catch (err) {
                console.error(`Error analyzing ${bankCode} card ${selectedCard.name}:`, err);
                // Continue with other cards even if this one fails
                continue;
              }
            }
          }
          
          setOptimizationWarnings(prev => ({ ...prev, ...warningsByBank }));
        }}
      />
    </div>
  );
}
