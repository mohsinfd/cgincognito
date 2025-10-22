/**
 * JSON Schema for transaction extraction
 * Used to guide LLM output structure
 */

export const TRANSACTION_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  required: ['bank', 'card_details', 'statement_period', 'summary', 'transactions'],
  properties: {
    bank: {
      type: 'string',
      enum: ['HDFC', 'AXIS', 'SBI', 'ICICI', 'KOTAK', 'AMEX', 'CITI', 'SC', 'HSBC', 'INDUSIND', 'YES', 'RBL', 'OTHER'],
      description: 'Bank identifier code',
    },
    card_details: {
      type: 'object',
      additionalProperties: false,
      required: ['card_type', 'masked_number'],
      properties: {
        card_type: {
          type: 'string',
          description: 'Card type/variant (e.g., Regalia, MoneyBack+, Magnus)',
        },
        masked_number: {
          type: 'string',
          pattern: '^[X\\d\\s]{13,19}$',
          description: 'Masked card number with last 4 digits',
        },
        credit_limit: {
          type: 'number',
          minimum: 0,
          description: 'Total credit limit',
        },
        available_credit: {
          type: 'number',
          minimum: 0,
          description: 'Available credit',
        },
      },
    },
    owner_details: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Cardholder name',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address if present',
        },
      },
    },
    statement_period: {
      type: 'object',
      additionalProperties: false,
      required: ['start_date', 'end_date', 'due_date'],
      properties: {
        start_date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Statement period start date (YYYY-MM-DD)',
        },
        end_date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Statement period end date (YYYY-MM-DD)',
        },
        due_date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Payment due date (YYYY-MM-DD)',
        },
      },
    },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['total_dues', 'minimum_due', 'previous_balance'],
      properties: {
        total_dues: {
          type: 'number',
          description: 'Total amount due',
        },
        minimum_due: {
          type: 'number',
          minimum: 0,
          description: 'Minimum amount due',
        },
        previous_balance: {
          type: 'number',
          description: 'Previous balance',
        },
        payment_received: {
          type: 'number',
          description: 'Payment received during period',
        },
        purchase_amount: {
          type: 'number',
          minimum: 0,
          description: 'Total purchases in period',
        },
      },
    },
    transactions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'description', 'amount', 'type', 'category'],
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Transaction date (YYYY-MM-DD)',
          },
          description: {
            type: 'string',
            minLength: 1,
            description: 'Transaction description/merchant name',
          },
          amount: {
            type: 'number',
            minimum: 0,
            description: 'Transaction amount (positive)',
          },
          type: {
            type: 'string',
            enum: ['Dr', 'Cr'],
            description: 'Dr for debit/spend, Cr for credit/payment',
          },
          category: {
            type: 'string',
            enum: [
              'amazon_spends',
              'flipkart_spends',
              'grocery_spends_online',
              'online_food_ordering',
              'dining_or_going_out',
              'other_online_spends',
              'other_offline_spends',
              'flights',
              'hotels',
              'mobile_phone_bills',
              'electricity_bills',
              'water_bills',
              'ott_channels',
              'fuel',
              'school_fees',
              'rent',
              'insurance_health',
              'insurance_car_or_bike',
              'large_electronics',
              'pharmacy',
              'upi_transactions',
            ],
            description: 'Spending category (our 21 categories)',
          },
          sub_category: {
            type: 'string',
            description: 'Optional sub-category',
          },
        },
      },
    },
  },
};

/**
 * Category descriptions for LLM guidance
 */
export const CATEGORY_DESCRIPTIONS = `
**20 Spending Categories:**

1. **amazon_spends** - Amazon purchases
2. **flipkart_spends** - Flipkart purchases
3. **grocery_spends_online** - Blinkit, BigBasket, Zepto, Instamart, Dunzo
4. **online_food_ordering** - Swiggy, Zomato, Talabat food delivery
5. **dining_or_going_out** - Restaurants, cafes, dine-in (NOT delivery)
6. **other_online_spends** - Other e-commerce, Uber, Ola, online services
7. **other_offline_spends** - Physical stores, shopping malls, misc retail
8. **flights** - Airlines (Indigo, Vistara, Air India, Emirates, etc.)
9. **hotels** - Hotels, resorts (Marriott, OYO, Treebo, etc.)
10. **mobile_phone_bills** - Jio, Airtel, Vi, Vodafone recharge
11. **electricity_bills** - Power/electricity bills
12. **water_bills** - Water bills
13. **ott_channels** - Netflix, Prime Video, Hotstar, Disney+
14. **fuel** - Petrol pumps (IOCL, HPCL, BPCL, Shell)
15. **school_fees** - Education, tuition, school fees
16. **rent** - House rent, housing payments
17. **insurance_health** - Health insurance premiums
18. **insurance_car_or_bike** - Vehicle insurance
19. **large_electronics** - Expensive electronics (mobile, TV, laptop > ₹10,000)
20. **pharmacy** - Medicine, pharmacy, health products
21. **upi_transactions** - All UPI payments (UPI TINKU K PAYTM, UPI VIKAS, UPI PHONEPE, UPI CITY CH, UPI NATURAL)

**Important Category Rules:**
- Swiggy/Zomato = online_food_ordering (NOT dining_or_going_out)
- Cafe/Restaurant = dining_or_going_out (NOT online_food_ordering)
- Uber/Ola = other_online_spends (NOT flights)
- Street taxi = other_offline_spends
- MakeMyTrip/Goibibo = flights (default assumption)
- DREAMPLUG TECHNOLOGIES = rent (Cred rent payments)
- CRED app = rent (rent, maintenance, education, school fees)
- All UPI transactions = upi_transactions
- PhonePe utility = mobile_phone_bills
- If uncertain = other_offline_spends
`;


