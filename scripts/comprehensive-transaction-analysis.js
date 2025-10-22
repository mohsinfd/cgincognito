/**
 * Comprehensive Transaction Categorization Analysis
 * Based on your terminal logs - run in browser console
 */

console.log("========================================================");
console.log("         📊 COMPREHENSIVE TRANSACTION ANALYSIS 📊       ");
console.log("========================================================");
console.log("");

// All transactions from your logs organized by category
const transactionsByCategory = {
  "online_food_ordering": [
    { bank: "IDFC", description: "ZOMATO, NEW DELHI", amount: 325.05 },
    { bank: "IDFC", description: "ZOMATO, GURGAON", amount: 573.95 },
    { bank: "IDFC", description: "ZOMATO, GURGAON", amount: 466.3 },
    { bank: "IDFC", description: "ZOMATO, NEW DELHI", amount: 822.89 },
    { bank: "YES", description: "ZOMATO PRIVATE LIMITED", amount: 726.4 },
    { bank: "YES", description: "ZOMATO", amount: 577.05 },
    { bank: "HSBC", description: "IAP Swiggy Limited Bangalore", amount: 836 },
    { bank: "HSBC", description: "WWW SWIGGY IN BANGALORE", amount: 2166 },
    { bank: "HSBC", description: "SWIGGY LIMITED BENGALURU", amount: 1190 },
    { bank: "HSBC", description: "IAP SWIGGY BANGALORE", amount: 1087 },
    { bank: "HSBC", description: "IAP SWIGGY BANGALORE", amount: 1376 },
    { bank: "HSBC", description: "SWIGGY LIMITED BANGALORE", amount: 1115 }
  ],
  
  "amazon_spends": [
    { bank: "IDFC", description: "AMAZON INDIA", amount: 1014.6 },
    { bank: "HSBC", description: "AMAZON PAY INDIA PRIVA BANGALORE", amount: 699 },
    { bank: "HSBC", description: "AMAZON PAY INDIA PRIVA WWW.AMAZON.IN", amount: 1013 },
    { bank: "HSBC", description: "AMAZON PAY INDIA PRIVA BANGALORE", amount: 598 },
    { bank: "HSBC", description: "AMAZON PAY INDIA PRIVA BANGALORE", amount: 2653 }
  ],
  
  "grocery_spends_online": [
    { bank: "HSBC", description: "BLINKIT BANGALORE", amount: 1291 },
    { bank: "HSBC", description: "BLINKIT GURGAON", amount: 1119 },
    { bank: "HSBC", description: "BLINK COMMERCE PVT LTD BANGALORE", amount: 1542 },
    { bank: "HSBC", description: "IAP Zepto Bangalore", amount: 908.14 },
    { bank: "HSBC", description: "BLINK COMMERCE PVT LTD BANGALORE", amount: 1290 },
    { bank: "HSBC", description: "BLINKIT GURGAON", amount: 1985 },
    { bank: "HSBC", description: "BLINKIT GURGAON", amount: 1410 },
    { bank: "HSBC", description: "BLINK COMMERCE PVT LTD BANGALORE", amount: 1902 },
    { bank: "HSBC", description: "BLINKIT GURGAON", amount: 1711 },
    { bank: "HSBC", description: "BLINKIT BANGALORE", amount: 1463 },
    { bank: "HSBC", description: "BLINKIT GURGAON", amount: 2471 },
    { bank: "HSBC", description: "BLINKIT BANGALORE", amount: 1283 },
    { bank: "HSBC", description: "BLINKIT GURGAON", amount: 2564 },
    { bank: "RBL", description: "ZEPTO MARKETPLACE PRIV BANGALORE", amount: 347.43 },
    // Many more Blinkit transactions from HSBC...
  ],
  
  "other_online_spends": [
    { bank: "IDFC", description: "UPI TINKU K PAYTM", amount: 340 },
    { bank: "IDFC", description: "UPI VIKAS", amount: 40 },
    { bank: "IDFC", description: "UPI VIKAS", amount: 395 },
    { bank: "IDFC", description: "UPI PHONEPE", amount: 258.25 },
    { bank: "IDFC", description: "UPI PHONEPE", amount: 1432.4 },
    { bank: "IDFC", description: "UPI VIKAS", amount: 370 },
    { bank: "IDFC", description: "UPI CITY CH", amount: 113 },
    { bank: "IDFC", description: "UPI NATURAL", amount: 313 },
    { bank: "IDFC", description: "CRED", amount: 93810.75 },
    { bank: "IDFC", description: "DREAMPLUG TECHNOLOGI", amount: 657.4 },
    { bank: "IDFC", description: "DREAMPLUG TECHNOLOGI", amount: 14391.96 },
    { bank: "IDFC", description: "DREAMPLUG TECHNOLOGI", amount: 670.67 },
    { bank: "IDFC", description: "DREAMPLUG TECHNOLOGI", amount: 7177.32 },
    { bank: "HDFC", description: "VPS", amount: 1714.06 },
    { bank: "HDFC", description: "VPS", amount: 0.37 },
    { bank: "HDFC", description: "VPS", amount: 450 },
    { bank: "HDFC", description: "PHONEPE UTILITY", amount: 967.57 }
  ],
  
  "mobile_phone_bills": [
    { bank: "HDFC", description: "BHARTI AIRTEL LTD GURGAON", amount: 2335.64 },
    { bank: "HDFC", description: "BHARTI AIRTEL LTD GURGAON", amount: 2217.64 },
    { bank: "HDFC", description: "BHARTI AIRTEL LTD GURGAON", amount: 2335.64 },
    { bank: "HSBC", description: "VODAFONE IDEA LIMIT MUMBAI", amount: 365 }
  ],
  
  "dining_or_going_out": [
    { bank: "HDFC", description: "KOBY S BLACKWATER COFFEE GURGAON", amount: 2811.94 },
    { bank: "HSBC", description: "IAP DISTRICT DINING RZP GURUGRAM", amount: 2 },
    { bank: "HSBC", description: "THEOS DLF CYBER CITY G GURGAON", amount: 778 }
  ],
  
  "electricity_bills": [
    { bank: "HDFC", description: "ELECTRICITY MUMBAI", amount: 950 }
  ],
  
  "other_offline_spends": [
    { bank: "YES", description: "MARENGO ASIA HOSPITAL", amount: 1750 },
    { bank: "YES", description: "TINKU KUMAR", amount: 340 },
    { bank: "HDFC", description: "KIERAYA FURNISHING Bengaluru", amount: 2208.99 },
    { bank: "YES", description: "HOUSE OF KIERAYA L MI IND", amount: 8399.24 }
  ]
};

// Display analysis
Object.entries(transactionsByCategory).forEach(([category, transactions]) => {
  console.log(`🔍 ${category.toUpperCase().replace(/_/g, ' ')}:`);
  console.log(`   Total transactions: ${transactions.length}`);
  console.log(`   Total amount: ₹${transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}`);
  console.log("");
  
  transactions.forEach((txn, index) => {
    console.log(`   ${index + 1}. [${txn.bank}] ${txn.description} - ₹${txn.amount}`);
  });
  console.log("");
});

console.log("========================================================");
console.log("VALIDATION QUESTIONS:");
console.log("");
console.log("❓ POTENTIALLY INCORRECT CATEGORIZATIONS:");
console.log("");
console.log("1. CRED (₹93,810.75) → Currently 'other_online_spends'");
console.log("   → Should be 'other_offline_spends' (credit card payment)");
console.log("");
console.log("2. PHONEPE UTILITY (₹967.57) → Currently 'other_online_spends'");
console.log("   → Should be 'mobile_phone_bills'");
console.log("");
console.log("3. DREAMPLUG TECHNOLOGIES (₹22,896.35 total) → Currently 'other_online_spends'");
console.log("   → What service is this? Need clarification");
console.log("");
console.log("4. VPS (₹2,164.43 total) → Currently 'other_online_spends'");
console.log("   → What service is this? Need clarification");
console.log("");
console.log("5. KIERAYA FURNISHING (₹2,208.99) → Currently 'other_offline_spends'");
console.log("   → Should be 'other_online_spends' if it's online furniture rental");
console.log("");
console.log("6. HOUSE OF KIERAYA (₹8,399.24) → Currently 'other_online_spends'");
console.log("   → Should be 'other_offline_spends' if it's hospital/medical");
console.log("");
console.log("========================================================");
console.log("RECOMMENDED CATEGORY CHANGES:");
console.log("");
console.log("✅ CORRECT:");
console.log("   • Zomato, Swiggy → online_food_ordering");
console.log("   • Amazon Pay → amazon_spends");
console.log("   • Blinkit, Zepto → grocery_spends_online");
console.log("   • UPI transactions → other_online_spends");
console.log("   • Airtel, Vodafone → mobile_phone_bills");
console.log("");
console.log("❌ NEEDS CORRECTION:");
console.log("   • CRED → other_offline_spends (credit card payment)");
console.log("   • PHONEPE UTILITY → mobile_phone_bills");
console.log("   • KIERAYA FURNISHING → other_online_spends (if online rental)");
console.log("   • HOUSE OF KIERAYA → other_offline_spends (if hospital)");
console.log("");
console.log("❓ NEEDS CLARIFICATION:");
console.log("   • DREAMPLUG TECHNOLOGIES → What service?");
console.log("   • VPS → What service?");
console.log("");
console.log("========================================================");
