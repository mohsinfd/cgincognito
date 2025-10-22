/**
 * Script to validate "other_online_spends" categorization
 * Run this in browser console to check transaction categorization
 */

console.log("========================================================");
console.log("         📊 OTHER ONLINE SPENDS VALIDATION 📊           ");
console.log("========================================================");
console.log("");

// Extract from your terminal logs
const otherOnlineSpends = [
  // IDFC Bank
  { bank: "IDFC", description: "UPI TINKU K PAYTM", amount: 340, category: "other_online_spends" },
  { bank: "IDFC", description: "UPI VIKAS", amount: 40, category: "other_online_spends" },
  { bank: "IDFC", description: "UPI VIKAS", amount: 395, category: "other_online_spends" },
  { bank: "IDFC", description: "UPI PHONEPE", amount: 258.25, category: "other_online_spends" },
  { bank: "IDFC", description: "UPI PHONEPE", amount: 1432.4, category: "other_online_spends" },
  { bank: "IDFC", description: "UPI VIKAS", amount: 370, category: "other_online_spends" },
  { bank: "IDFC", description: "UPI CITY CH", amount: 113, category: "other_online_spends" },
  { bank: "IDFC", description: "UPI NATURAL", amount: 313, category: "other_online_spends" },
  { bank: "IDFC", description: "CRED", amount: 93810.75, category: "other_online_spends" },
  { bank: "IDFC", description: "DREAMPLUG TECHNOLOGI", amount: 657.4, category: "other_online_spends" },
  { bank: "IDFC", description: "DREAMPLUG TECHNOLOGI", amount: 14391.96, category: "other_online_spends" },
  { bank: "IDFC", description: "DREAMPLUG TECHNOLOGI", amount: 670.67, category: "other_online_spends" },
  { bank: "IDFC", description: "DREAMPLUG TECHNOLOGI", amount: 7177.32, category: "other_online_spends" },
  
  // HDFC Bank
  { bank: "HDFC", description: "VPS", amount: 1714.06, category: "other_online_spends" },
  { bank: "HDFC", description: "VPS", amount: 0.37, category: "other_online_spends" },
  { bank: "HDFC", description: "VPS", amount: 450, category: "other_online_spends" },
  { bank: "HDFC", description: "PHONEPE UTILITY", amount: 967.57, category: "other_online_spends" }
];

console.log("🔍 OTHER ONLINE SPENDS TRANSACTIONS:");
console.log("");

otherOnlineSpends.forEach((txn, index) => {
  console.log(`${index + 1}. [${txn.bank}] ${txn.description} - ₹${txn.amount}`);
});

console.log("");
console.log("========================================================");
console.log("VALIDATION QUESTIONS:");
console.log("");
console.log("❓ UPI Transactions:");
console.log("   • UPI TINKU K PAYTM - ₹340");
console.log("   • UPI VIKAS - ₹40, ₹395, ₹370");
console.log("   • UPI PHONEPE - ₹258.25, ₹1432.4");
console.log("   • UPI CITY CH - ₹113");
console.log("   • UPI NATURAL - ₹313");
console.log("   → Are these correctly categorized as 'other_online_spends'?");
console.log("");
console.log("❓ CRED App:");
console.log("   • CRED - ₹93,810.75");
console.log("   → This is likely a credit card payment. Should this be 'other_offline_spends'?");
console.log("");
console.log("❓ DREAMPLUG TECHNOLOGIES:");
console.log("   • DREAMPLUG TECHNOLOGI - ₹657.4, ₹14,391.96, ₹670.67, ₹7,177.32");
console.log("   → What is this? Should it be categorized differently?");
console.log("");
console.log("❓ VPS (HDFC):");
console.log("   • VPS - ₹1,714.06, ₹0.37, ₹450");
console.log("   → What is VPS? Should it be categorized differently?");
console.log("");
console.log("❓ PHONEPE UTILITY:");
console.log("   • PHONEPE UTILITY - ₹967.57");
console.log("   → Should this be 'mobile_phone_bills' instead?");
console.log("");
console.log("========================================================");
console.log("RECOMMENDATIONS:");
console.log("");
console.log("✅ CORRECTLY CATEGORIZED:");
console.log("   • UPI transactions → other_online_spends");
console.log("");
console.log("❌ POTENTIALLY INCORRECT:");
console.log("   • CRED (₹93,810.75) → Should be 'other_offline_spends' (credit card payment)");
console.log("   • PHONEPE UTILITY → Should be 'mobile_phone_bills'");
console.log("");
console.log("❓ NEEDS CLARIFICATION:");
console.log("   • DREAMPLUG TECHNOLOGIES → What service is this?");
console.log("   • VPS → What service is this?");
console.log("");
console.log("========================================================");
