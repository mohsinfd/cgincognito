# CardGenius Implementation Roadmap

Now that statement upload and parsing is working, here's your step-by-step implementation plan.

---

## ✅ Completed
- [x] Statement upload to BoostScore
- [x] Statement parsing and polling
- [x] Transaction normalization
- [x] Category mapping (regex rules)
- [x] Environment configuration
- [x] Mock mode for testing

---

## 🎯 Phase 1: Database Integration (Start Here)

### Goal
Store parsed statements and transactions in database for later retrieval and analysis.

### Tasks

#### 1.1 Set Up Supabase
```bash
# Option A: Use Supabase (Recommended)
1. Go to supabase.com and create account
2. Create new project
3. Copy connection string
4. Update DATABASE_URL in .env

# Option B: Use Local Postgres
createdb cardgenius
npm run db:migrate
npm run db:seed
```

#### 1.2 Create Database Client
**File**: `src/lib/db/client.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

#### 1.3 Create Statement Storage Functions
**File**: `src/lib/db/statements.ts`
```typescript
import { supabase } from './client';
import type { Statement } from '@/types/database';

export async function saveStatement(data: {
  user_id: string;
  vendor_stmt_id: string;
  bank_code: string;
  card_last4?: string;
  period_start?: Date;
  period_end?: Date;
  source: 'upload' | 'gmail_statement';
}): Promise<Statement> {
  const { data: statement, error } = await supabase
    .from('statements')
    .insert({
      ...data,
      status: 'completed',
      created_at: new Date(),
    })
    .select()
    .single();

  if (error) throw error;
  return statement;
}

export async function getStatements(userId: string): Promise<Statement[]> {
  const { data, error } = await supabase
    .from('statements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

#### 1.4 Create Transaction Storage Functions
**File**: `src/lib/db/transactions.ts`
```typescript
import { supabase } from './client';
import type { Txn } from '@/types/transaction';

export async function saveTransactions(txns: Txn[]): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .insert(txns);

  if (error) throw error;
}

export async function getTransactionsByStatement(
  statementId: string
): Promise<Txn[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('statement_id', statementId)
    .order('txn_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getTransactionsByMonth(
  userId: string,
  month: string
): Promise<Txn[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      statements!inner(user_id)
    `)
    .eq('statements.user_id', userId)
    .gte('txn_date', `${month}-01`)
    .lt('txn_date', `${month}-32`)
    .order('txn_date', { ascending: false });

  if (error) throw error;
  return data;
}
```

#### 1.5 Update Upload Route to Save Data
**File**: `src/app/api/cg/stmt/upload/route.ts`

After successfully getting parsed content, save it:
```typescript
// After content is parsed
const { normalizeContent } = await import('@/lib/boostscore/normalizer');
const { transactions, cardLast4, periodStart, periodEnd } = normalizeContent(
  content,
  statementId
);

// Save statement
const statement = await saveStatement({
  user_id: 'temp_user_id', // TODO: Get from session
  vendor_stmt_id: statementId,
  bank_code: payload.bank,
  card_last4: cardLast4,
  period_start: periodStart ? new Date(periodStart) : undefined,
  period_end: periodEnd ? new Date(periodEnd) : undefined,
  source: 'upload',
});

// Save transactions
await saveTransactions(transactions);
```

### Estimated Time: 2-3 days

---

## 🎯 Phase 2: Dashboard UI (Next Priority)

### Goal
Build a dashboard where users can view all their statements and transactions.

### Tasks

#### 2.1 Create Dashboard Layout
**File**: `src/app/dashboard/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import StatementsList from '@/components/statements-list';
import SpendSummary from '@/components/spend-summary';

export default function DashboardPage() {
  const [statements, setStatements] = useState([]);

  useEffect(() => {
    // Fetch user's statements
    fetch('/api/statements')
      .then(res => res.json())
      .then(data => setStatements(data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        <SpendSummary />
        <StatementsList statements={statements} />
      </div>
    </div>
  );
}
```

#### 2.2 Create Statements List Component
**File**: `src/components/statements-list.tsx`
```typescript
type Props = {
  statements: Statement[];
};

export default function StatementsList({ statements }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Your Statements</h2>
      <div className="space-y-4">
        {statements.map(stmt => (
          <div key={stmt.id} className="border rounded p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{stmt.bank_code.toUpperCase()}</p>
                <p className="text-sm text-gray-600">
                  Card ending in {stmt.card_last4}
                </p>
                <p className="text-sm text-gray-500">
                  {stmt.period_start} to {stmt.period_end}
                </p>
              </div>
              <Link
                href={`/dashboard/statements/${stmt.id}`}
                className="text-blue-600 hover:underline"
              >
                View →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 2.3 Create Statement Detail Page
**File**: `src/app/dashboard/statements/[id]/page.tsx`
```typescript
// Show all transactions for a specific statement
```

#### 2.4 Create API Routes
**Files**:
- `src/app/api/statements/route.ts` - GET list of statements
- `src/app/api/statements/[id]/route.ts` - GET specific statement
- `src/app/api/transactions/route.ts` - GET transactions with filters

### Estimated Time: 3-4 days

---

## 🎯 Phase 3: Optimizer UI (Core Value!)

### Goal
Show users how much money they're leaving on the table and which cards to use.

### Tasks

#### 3.1 Create Optimizer Page
**File**: `src/app/dashboard/optimize/page.tsx`

Shows:
- Month selector
- Total missed savings
- Category breakdown
- Top routing rules
- Recommended cards

#### 3.2 Build Monthly Spend View
**File**: `src/components/monthly-spend.tsx`

Display:
- Total spend by category (chart)
- Top merchants
- Debit vs Credit ratio

#### 3.3 Create Optimizer Results Component
**File**: `src/components/optimizer-results.tsx`

Shows:
```
💰 You could have saved ₹1,240 this month!

Top Opportunities:
1. Use SBI Cashback for Amazon (₹520 saved)
2. Use HDFC Swiggy Card for food delivery (₹420 saved)
3. Use Axis Ace for utility bills (₹300 saved)

Routing Rules:
✅ Amazon → SBI Cashback (5% vs 0%)
✅ Swiggy/Zomato → HDFC Swiggy Card (10% vs 1%)
✅ Bills → Axis Ace (5% vs 0%)
```

#### 3.4 Add Card Recommendation Cards
**File**: `src/components/card-recommendation.tsx`

For each recommended card, show:
- Card image
- Bank name
- Estimated monthly savings
- Key benefits
- "Apply Now" CTA

### Estimated Time: 4-5 days

---

## 🎯 Phase 4: Enhanced Features

### 4.1 Spend Analytics
- Monthly trends chart
- Category breakdown pie chart
- Merchant leaderboard
- Month-over-month comparison

### 4.2 Export Features
- Export transactions as CSV
- Export monthly report as PDF
- Share savings report

### 4.3 Settings Page
- View/delete statements
- Delete all data
- Change retention period
- Export all data

### 4.4 Multi-User Support
- User authentication (Supabase Auth)
- User sessions
- Per-user data isolation

### Estimated Time: 5-7 days

---

## 🎯 Phase 5: Gmail Integration (Later)

Since you have manual upload working, do this last:

### 5.1 OAuth Flow
- Complete Google OAuth verification
- Handle token refresh
- Store encrypted tokens

### 5.2 Background Sync
- Poll Gmail every 15 minutes
- Detect new statements
- Auto-upload and parse
- Notify user of new data

### Estimated Time: 3-4 days

---

## 📊 Recommended Order

**Week 1**: Database + Basic Dashboard
**Week 2**: Optimizer UI + Results View
**Week 3**: Analytics + Settings
**Week 4**: Polish + Testing
**Week 5+**: Gmail Integration

---

## 🔧 Quick Wins (Do These Anytime)

1. **Better error messages** - User-friendly error screens
2. **Loading states** - Skeleton screens instead of spinners
3. **Animations** - Smooth transitions between states
4. **Mobile optimization** - Test on phone, fix any issues
5. **SEO** - Add meta tags, titles
6. **Analytics** - Actually implement event tracking
7. **Toast notifications** - Success/error toasts

---

## 🎯 Success Metrics

Track these to know you're on track:

- ✅ Parse success rate (target: >85%)
- ✅ Average parse time (target: <30s P95)
- ✅ User retention (do they come back?)
- ✅ Statements per user (target: >3)
- ✅ Optimizer engagement (% who view it)

---

## 📝 Notes

- Start with Supabase (easier than managing Postgres)
- Test with your own real statements
- Focus on one phase at a time
- Deploy early and iterate
- Get user feedback ASAP

---

**Current Status**: ✅ Statement upload working, ready for Phase 1!

