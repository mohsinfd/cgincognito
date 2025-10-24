/**
 * Card Registry: Maps statement bank codes to CardGenius card IDs
 * 
 * This registry is used to:
 * 1. Identify which CardGenius cards correspond to user's statements
 * 2. Call CardGenius API with selected_card_id for current card analysis
 * 3. Detect unsupported banks that can't be optimized
 */

export type CardInfo = {
  id: number;
  name: string;
  bankId: number;
  bankName: string;
  isPopular?: boolean; // Flag for most commonly used cards per bank
};

/**
 * Complete CardGenius card database
 */
export const CARDGENIUS_CARDS: CardInfo[] = [
  // American Express (Bank ID: 3)
  { id: 8, name: "MRCC", bankId: 3, bankName: "American Express" },
  { id: 11, name: "AMEX PLATINUM TRAVEL", bankId: 3, bankName: "American Express" },
  { id: 12, name: "AMEX SMART EARN", bankId: 3, bankName: "American Express" },
  { id: 66, name: "AMEX GOLD CREDIT CARD", bankId: 3, bankName: "American Express" },
  { id: 113, name: "Amex Express Platinum Card", bankId: 3, bankName: "American Express" },
  
  // AU Bank (Bank ID: 5)
  { id: 13, name: "AU ALTURA", bankId: 5, bankName: "AU Bank" },
  { id: 14, name: "AU ZENITH", bankId: 5, bankName: "AU Bank" },
  { id: 15, name: "AU ZENITH PLUS", bankId: 5, bankName: "AU Bank" },
  { id: 103, name: "AU Nomo Credit Card", bankId: 5, bankName: "AU Bank" },
  
  // Axis Bank (Bank ID: 1)
  { id: 16, name: "AXIS AIRTEL CC", bankId: 1, bankName: "Axis Bank" },
  { id: 17, name: "AXIS FLIPKART", bankId: 1, bankName: "Axis Bank" },
  { id: 18, name: "AXIS INDIAN OIL RUPAY", bankId: 1, bankName: "Axis Bank" },
  { id: 19, name: "AXIS MAGNUS", bankId: 1, bankName: "Axis Bank", isPopular: true },
  { id: 20, name: "AXIS MY ZONE", bankId: 1, bankName: "Axis Bank" },
  { id: 21, name: "AXIS VISTARA", bankId: 1, bankName: "Axis Bank" },
  { id: 49, name: "AXIS PRIVILEGE CREDIT CARD", bankId: 1, bankName: "Axis Bank" },
  { id: 50, name: "Samsung Axis Bank Infinite Credit Card", bankId: 1, bankName: "Axis Bank" },
  { id: 51, name: "Samsung Axis Bank Signature Credit Card", bankId: 1, bankName: "Axis Bank" },
  { id: 53, name: "AXIS SELECT CREDIT CARD", bankId: 1, bankName: "Axis Bank" },
  { id: 67, name: "Axis Rewards Credit Card", bankId: 1, bankName: "Axis Bank" },
  { id: 68, name: "AXIS AURA CREDIT CARD", bankId: 1, bankName: "Axis Bank" },
  { id: 74, name: "AXIS ATLAS CC", bankId: 1, bankName: "Axis Bank" },
  { id: 100, name: "Axis Neo", bankId: 1, bankName: "Axis Bank" },
  { id: 135, name: "Axis Shopper Stop", bankId: 1, bankName: "Axis Bank" },
  { id: 137, name: "Axis Supermoney Rupay Card", bankId: 1, bankName: "Axis Bank" },
  { id: 142, name: "Axis Cashback Credit Card", bankId: 1, bankName: "Axis Bank" },
  { id: 145, name: "IndianOil Axis Bank Rupay Credit Card", bankId: 1, bankName: "Axis Bank" },
  
  // HDFC (Bank ID: 8)
  { id: 22, name: "HDFC INDIAN OIL", bankId: 8, bankName: "HDFC" },
  { id: 23, name: "HDFC INFINIA", bankId: 8, bankName: "HDFC" },
  { id: 24, name: "HDFC MILLENIA", bankId: 8, bankName: "HDFC", isPopular: true },
  { id: 25, name: "HDFC SWIGGY", bankId: 8, bankName: "HDFC" },
  { id: 27, name: "HDFC SHOPPERS STOP", bankId: 8, bankName: "HDFC" },
  { id: 54, name: "HDFC Marriott Bonvoy Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 55, name: "HDFC IRCTC Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 56, name: "HDFC RuPay Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 69, name: "HDFC Freedom Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 70, name: "6E Rewards - Indigo HDFC", bankId: 8, bankName: "HDFC" },
  { id: 80, name: "HDFC Regalia Gold Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 83, name: "Tata Neu Infinity HDFC Bank Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 88, name: "HDFC Diners Black Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 98, name: "HDFC MoneyBack Plus Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 114, name: "HDFC Diners Club Black Metal Edition", bankId: 8, bankName: "HDFC" },
  { id: 116, name: "HDFC Superia Airline Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 120, name: "HDFC TATA NEU PLUS", bankId: 8, bankName: "HDFC" },
  { id: 123, name: "PIXEL Play Credit Card", bankId: 8, bankName: "HDFC" },
  { id: 138, name: "Biz Black Metal Edition", bankId: 8, bankName: "HDFC" },
  
  // HSBC (Bank ID: 10)
  { id: 77, name: "HSBC Live+ Credit Card", bankId: 10, bankName: "HSBC", isPopular: true },
  { id: 78, name: "HSBC Platinum Credit Card", bankId: 10, bankName: "HSBC" },
  { id: 87, name: "HSBC Premier Credit Card", bankId: 10, bankName: "HSBC" },
  { id: 134, name: "HSBC TravelOne Credit Card", bankId: 10, bankName: "HSBC" },
  
  // ICICI (Bank ID: 4)
  { id: 34, name: "ICICI HPCL SUPER SAVER", bankId: 4, bankName: "ICICI" },
  { id: 35, name: "ICICI HPCL CORAL", bankId: 4, bankName: "ICICI" },
  { id: 36, name: "ICICI EMERLADE PRIVATE METAL", bankId: 4, bankName: "ICICI" },
  { id: 45, name: "ICICI PLATINUM CHIP", bankId: 4, bankName: "ICICI", isPopular: true },
  { id: 46, name: "MakeMyTrip ICICI Bank Credit Card", bankId: 4, bankName: "ICICI" },
  { id: 76, name: "ICICI Amazon Pay Credit Card", bankId: 4, bankName: "ICICI" },
  { id: 89, name: "ICICI Sapphiro Credit Card", bankId: 4, bankName: "ICICI" },
  { id: 106, name: "ICICI Rubyx Credit Card", bankId: 4, bankName: "ICICI" },
  { id: 125, name: "MakeMyTrip ICICI Bank Signature Credit Card", bankId: 4, bankName: "ICICI" },
  { id: 139, name: "Times Black ICICI Bank Credit Card", bankId: 4, bankName: "ICICI" },
  
  // IDFC First (Bank ID: 7)
  { id: 39, name: "IDFC FIRST SELECT", bankId: 7, bankName: "IDFC First", isPopular: true },
  { id: 40, name: "IDFC POWER PLUS", bankId: 7, bankName: "IDFC First" },
  { id: 47, name: "IDFC CLUB VISTARA", bankId: 7, bankName: "IDFC First" },
  { id: 57, name: "IDFC FIRST WOW CREDIT CARD", bankId: 7, bankName: "IDFC First" },
  { id: 58, name: "IDFC FIRST MILLENIA CREDIT CARD", bankId: 7, bankName: "IDFC First" },
  { id: 59, name: "IDFC ASHVA CREDIT CARD", bankId: 7, bankName: "IDFC First" },
  { id: 60, name: "IDFC MAYURA CREDIT CARD", bankId: 7, bankName: "IDFC First" },
  { id: 71, name: "IDFC Wealth Credit Card", bankId: 7, bankName: "IDFC First" },
  { id: 72, name: "IDFC FIRST CLASSIC CREDIT CARD", bankId: 7, bankName: "IDFC First" },
  { id: 73, name: "IDFC POWER", bankId: 7, bankName: "IDFC First" },
  { id: 91, name: "IDFC First Private Credit Card", bankId: 7, bankName: "IDFC First" },
  { id: 121, name: "IDFC First SWYP Credit Card", bankId: 7, bankName: "IDFC First" },
  { id: 141, name: "IDFC FIRST Indigo Credit Card", bankId: 7, bankName: "IDFC First" },
  
  // IndusInd (Bank ID: 6)
  { id: 41, name: "IndusInd EASYDINER", bankId: 6, bankName: "IndusInd" },
  { id: 43, name: "IndusInd LEGEND", bankId: 6, bankName: "IndusInd" },
  { id: 44, name: "IndusInd PLATINUM RUPAY", bankId: 6, bankName: "IndusInd", isPopular: true },
  { id: 61, name: "IndusInd Platinum Aura Edge Credit Card", bankId: 6, bankName: "IndusInd" },
  { id: 62, name: "IndusInd Tiger Credit Card", bankId: 6, bankName: "IndusInd" },
  
  // SBI (Bank ID: 11)
  { id: 29, name: "SBI BPCL OCTANE", bankId: 11, bankName: "SBI" },
  { id: 30, name: "SBI CASHBACK", bankId: 11, bankName: "SBI", isPopular: true },
  { id: 31, name: "SBI SIMPLY CLICK", bankId: 11, bankName: "SBI" },
  { id: 63, name: "SBI ELITE CREDIT CARD", bankId: 11, bankName: "SBI" },
  { id: 64, name: "SBI Prime Credit Card", bankId: 11, bankName: "SBI" },
  { id: 65, name: "SBI SimplySave Credit Card", bankId: 11, bankName: "SBI" },
  { id: 90, name: "SBI AURUM Credit CARD", bankId: 11, bankName: "SBI" },
  { id: 104, name: "SBI ELITE Card", bankId: 11, bankName: "SBI" },
  { id: 126, name: "IRCTC SBI Platinum Card", bankId: 11, bankName: "SBI" },
  { id: 127, name: "SBI Card PULSE", bankId: 11, bankName: "SBI" },
  { id: 128, name: "SBI Card Miles Credit Card", bankId: 11, bankName: "SBI" },
  { id: 143, name: "Flipkart SBI Credit Card", bankId: 11, bankName: "SBI" },
  { id: 144, name: "SBI BPCL Credit Card", bankId: 11, bankName: "SBI" },
  
  // Standard Chartered (Bank ID: 12)
  { id: 32, name: "StanC EASE MY TRIP", bankId: 12, bankName: "Standard Chartered" },
  { id: 33, name: "StanC SMART", bankId: 12, bankName: "Standard Chartered", isPopular: true },
  { id: 102, name: "Standard Chartered Ultimate", bankId: 12, bankName: "Standard Chartered" },
  
  // RBL (Bank ID: 13)
  { id: 81, name: "RBL Shoprite Credit Card", bankId: 13, bankName: "RBL" },
  { id: 85, name: "IndianOil RBL Bank Credit Card", bankId: 13, bankName: "RBL" },
  { id: 86, name: "Indian Oil RBL Bank XTRA Credit Card", bankId: 13, bankName: "RBL" },
  { id: 96, name: "RBL World Safari Credit Card", bankId: 13, bankName: "RBL" },
  { id: 109, name: "RBL Insignia Preferred Credit Card", bankId: 13, bankName: "RBL" },
  { id: 118, name: "IRCTC RBL Credit Card", bankId: 13, bankName: "RBL" },
  { id: 129, name: "RBL Bank Play Credit Card", bankId: 13, bankName: "RBL" },
  { id: 132, name: "RBL Platinum Maxima Plus Credit Card", bankId: 13, bankName: "RBL", isPopular: true },
  
  // YES Bank (Bank ID: 14)
  { id: 84, name: "YES BANK POP-CLUB Credit Card", bankId: 14, bankName: "YES Bank", isPopular: true },
  { id: 115, name: "Kiwi", bankId: 14, bankName: "YES Bank" },
  { id: 122, name: "Rio Rupay Credit Card", bankId: 14, bankName: "YES Bank" },
  
  // Kotak (Bank ID: 15)
  { id: 99, name: "Kotak Zen Signature", bankId: 15, bankName: "Kotak" },
  { id: 105, name: "Kotak IndianOil Platinum Credit Card", bankId: 15, bankName: "Kotak" },
  { id: 124, name: "Myntra Kotak Credit Card", bankId: 15, bankName: "Kotak" },
  { id: 131, name: "Kotak Mojo Platinum", bankId: 15, bankName: "Kotak" },
  { id: 140, name: "Kotak Essentia Platinum Credit Card", bankId: 15, bankName: "Kotak", isPopular: true },
  
  // Federal Bank (Bank ID: 16)
  { id: 117, name: "Federal Scapia Credit Card", bankId: 16, bankName: "Federal Bank" },
  { id: 130, name: "Jupiter Edge", bankId: 16, bankName: "Federal Bank" },
];

/**
 * Map statement bank codes to bank IDs
 */
export const STATEMENT_BANK_TO_BANK_ID: Record<string, number> = {
  'amex': 3,
  'au': 5,
  'axis': 1,
  'hdfc': 8,
  'hsbc': 10,
  'icici': 4,
  'idfc': 7,
  'indusind': 6,
  'sbi': 11,
  'stanc': 12,
  'rbl': 13,
  'yes': 14,
  'kotak': 15,
  'federal': 16,
};

/**
 * Banks that we can parse statements from but don't have CardGenius support
 */
export const UNSUPPORTED_BANKS = [
  'onecard',
  'jupiter', // Note: Jupiter Edge is under Federal Bank (ID 16)
  'aurum',
  'niyo',
];

/**
 * Get CardGenius cards for a given statement bank code
 */
export function getCardsForBank(statementBankCode: string): CardInfo[] {
  const bankId = STATEMENT_BANK_TO_BANK_ID[statementBankCode.toLowerCase()];
  if (!bankId) return [];
  
  return CARDGENIUS_CARDS.filter(card => card.bankId === bankId);
}

/**
 * Get the most popular card for a bank (for default analysis)
 */
export function getPopularCardForBank(statementBankCode: string): CardInfo | null {
  const cards = getCardsForBank(statementBankCode);
  const popularCard = cards.find(card => card.isPopular);
  
  // If no popular card marked, return first card as default
  return popularCard || cards[0] || null;
}

/**
 * Check if a bank is supported in CardGenius
 */
export function isBankSupported(statementBankCode: string): boolean {
  return !!STATEMENT_BANK_TO_BANK_ID[statementBankCode.toLowerCase()];
}

/**
 * Get bank name from statement code
 */
export function getBankName(statementBankCode: string): string {
  const bankId = STATEMENT_BANK_TO_BANK_ID[statementBankCode.toLowerCase()];
  if (!bankId) return statementBankCode.toUpperCase();
  
  const card = CARDGENIUS_CARDS.find(c => c.bankId === bankId);
  return card?.bankName || statementBankCode.toUpperCase();
}

