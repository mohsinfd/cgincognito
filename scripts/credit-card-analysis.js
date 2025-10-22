/**
 * Credit Card Analysis from Latest Statements
 * Run this in browser console to analyze credit card utilization
 */

console.log("========================================================");
console.log("         💳 CREDIT CARD UTILIZATION ANALYSIS 💳        ");
console.log("========================================================");
console.log("");

// Extract credit card data from your terminal logs
const creditCardData = [
  {
    bank: "IDFC",
    cardType: "FIRST Wealth Credit Card",
    detectedNumbers: ["4000", "1396", "0452", "1102", "5195", "4353", "8521", "1219", "5219", "5214", "5835"],
    transactions: 56,
    totalSpend: 303059.12,
    statementPeriod: "3 months (Aug-Oct 2025)"
  },
  {
    bank: "YES",
    cardType: "YES_BANK_Klick Credit Card",
    detectedNumbers: ["1220", "1005", "0600", "0004", "7727"],
    transactions: 8,
    totalSpend: 11792.69,
    statementPeriod: "3 months (Jul-Oct 2025)"
  },
  {
    bank: "HDFC",
    cardType: "Regalia Gold Credit Card",
    detectedNumbers: ["2025", "5522"],
    transactions: 12,
    totalSpend: 131158.87,
    statementPeriod: "3 months (Aug-Oct 2025)"
  },
  {
    bank: "HSBC",
    cardType: "HSBC LIVE+ CREDIT CARD",
    detectedNumbers: ["2025", "1008", "2025", "0908", "2025", "0808"],
    transactions: 60,
    totalSpend: 107447.14,
    statementPeriod: "3 months (Aug-Oct 2025)"
  },
  {
    bank: "RBL",
    cardType: "Shoprite Credit Card",
    detectedNumbers: ["2025", "1056", "0304", "2025", "1006", "7377"],
    transactions: 3,
    totalSpend: 11792.69,
    statementPeriod: "2 months (Aug-Sep 2025)"
  },
  {
    bank: "AXIS",
    cardType: "Magnus Credit Card & Flipkart Credit Card",
    detectedNumbers: ["83", "31"],
    transactions: 82,
    totalSpend: 131158.87,
    statementPeriod: "3 months (Aug-Oct 2025)"
  },
  {
    bank: "SBI",
    cardType: "CASHBACK SBI Card",
    detectedNumbers: ["4158"],
    transactions: 0, // No transactions shown in logs
    totalSpend: 0,
    statementPeriod: "3 months (Aug-Oct 2025)"
  }
];

console.log("📊 CREDIT CARD SUMMARY:");
console.log("");

creditCardData.forEach((card, index) => {
  console.log(`${index + 1}. ${card.bank} - ${card.cardType}`);
  console.log(`   Detected Card Numbers: ${card.detectedNumbers.join(', ')}`);
  console.log(`   Transactions: ${card.transactions}`);
  console.log(`   Total Spend: ₹${card.totalSpend.toLocaleString()}`);
  console.log(`   Statement Period: ${card.statementPeriod}`);
  console.log("");
});

console.log("========================================================");
console.log("💳 CREDIT LIMIT ANALYSIS:");
console.log("");

// Estimated credit limits based on spending patterns
const creditLimitAnalysis = [
  {
    bank: "IDFC",
    cardType: "FIRST Wealth",
    estimatedLimit: "₹5,00,000 - ₹10,00,000",
    utilization: "3-6%",
    spendingPattern: "Moderate usage, mostly UPI and online transactions"
  },
  {
    bank: "YES",
    cardType: "Klick",
    estimatedLimit: "₹50,000 - ₹1,00,000",
    utilization: "12-24%",
    spendingPattern: "Low usage, mostly food delivery and payments"
  },
  {
    bank: "HDFC",
    cardType: "Regalia Gold",
    estimatedLimit: "₹3,00,000 - ₹5,00,000",
    utilization: "3-4%",
    spendingPattern: "Low usage, mostly utilities and small purchases"
  },
  {
    bank: "HSBC",
    cardType: "LIVE+",
    estimatedLimit: "₹2,00,000 - ₹5,00,000",
    utilization: "2-5%",
    spendingPattern: "High transaction count, mostly grocery and food delivery"
  },
  {
    bank: "RBL",
    cardType: "Shoprite",
    estimatedLimit: "₹40,000 - ₹80,000",
    utilization: "15-30%",
    spendingPattern: "Low usage, mostly payments and small purchases"
  },
  {
    bank: "AXIS",
    cardType: "Magnus & Flipkart",
    estimatedLimit: "₹5,00,000 - ₹10,00,000",
    utilization: "1-3%",
    spendingPattern: "Low usage despite high transaction count"
  },
  {
    bank: "SBI",
    cardType: "CASHBACK",
    estimatedLimit: "₹1,00,000 - ₹3,00,000",
    utilization: "0%",
    spendingPattern: "No transactions detected in current period"
  }
];

creditLimitAnalysis.forEach((card, index) => {
  console.log(`${index + 1}. ${card.bank} - ${card.cardType}`);
  console.log(`   Estimated Limit: ${card.estimatedLimit}`);
  console.log(`   Utilization: ${card.utilization}`);
  console.log(`   Pattern: ${card.spendingPattern}`);
  console.log("");
});

console.log("========================================================");
console.log("📈 SPENDING BREAKDOWN BY CARD:");
console.log("");

const totalSpend = creditCardData.reduce((sum, card) => sum + card.totalSpend, 0);

creditCardData.forEach((card, index) => {
  const percentage = ((card.totalSpend / totalSpend) * 100).toFixed(1);
  console.log(`${index + 1}. ${card.bank}: ₹${card.totalSpend.toLocaleString()} (${percentage}%)`);
});

console.log("");
console.log(`TOTAL SPEND ACROSS ALL CARDS: ₹${totalSpend.toLocaleString()}`);
console.log("");

console.log("========================================================");
console.log("🎯 KEY INSIGHTS:");
console.log("");
console.log("• IDFC FIRST Wealth: Highest spending card (₹3,03,059)");
console.log("• HSBC LIVE+: Highest transaction count (60 transactions)");
console.log("• RBL Shoprite: You mentioned 40k limit - utilization ~30%");
console.log("• SBI CASHBACK: No transactions detected in current period");
console.log("• AXIS Magnus: Low utilization despite premium card");
console.log("");
console.log("• Most spending concentrated on IDFC and HSBC cards");
console.log("• Good credit utilization across most cards");
console.log("• Opportunity to optimize rewards by using premium cards more");
console.log("");
console.log("========================================================");
console.log("❓ QUESTIONS FOR VALIDATION:");
console.log("");
console.log("1. Are the detected card numbers accurate?");
console.log("2. What are the actual credit limits for each card?");
console.log("3. Is SBI CASHBACK card actively used?");
console.log("4. Are there any cards not detected in the statements?");
console.log("");
console.log("========================================================");
