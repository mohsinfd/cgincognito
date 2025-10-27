# Master TODO List - CardGenius Project

> Compiled from PRD, implementation docs, and testing checklists  
> Last Updated: Current iteration

---

## 🔥 Critical Issues (Fix Now)

### 1. **Fix Rent Categorization** ⚠️ HIGH PRIORITY
- **Problem**: Rent showing ₹157k instead of ~₹83k/month
- **Root Cause**: CRED/Dreamplug transactions not detected as rent
- **Fix**: Apply amount-based detection (₹80k-₹95k range)
- **File**: `src/lib/mapper/complete-mapper.ts`
- **Status**: Logic updated, needs re-sync to apply
- **Action**: Re-run Gmail sync or re-process statements

### 2. **Investigate SBI Parsing** ⚠️ HIGH PRIORITY
- **Problem**: SBI statements show 0 debit transactions
- **Possible Causes**: Password protection, parsing failures, wrong date format
- **Action**: Check BoostScore response, verify password hint system
- **File**: `src/app/api/gmail/process-statements-v2/route.ts`

### 3. **Fix Statement Date Fallback** ✅ DONE
- **Problem**: All statements had same date (20251025) due to faulty fallback
- **Fix**: Use email date instead of today's date
- **File**: `src/app/gmail-test/page.tsx`
- **Script**: `scripts/fix-statement-dates.js` (run once)

---

## 📊 Data Quality Issues

### 4. **Remove Duplicate Statements**
- **Problem**: HSBC had 6 statements (expected 3 months x 2 cards = 6)
- **Root Cause**: Gmail sync finding duplicates
- **Fix**: Deduplicate by `message_id` before saving
- **File**: `src/app/api/gmail/sync/route.ts`
- **Script**: `scripts/comprehensiveCleanup.js` (run once)

### 5. **Remove Empty Statements**
- **Problem**: Some statements have 0 debit transactions
- **Fix**: Filter out empty statements before saving
- **Script**: `scripts/comprehensiveCleanup.js` (run once)

### 6. **Fix Card Matching**
- **Problem**: RBL card shows "Unknown", requires manual confirmation
- **Root Cause**: LLM not extracting card type from statements
- **Files**: 
  - `src/app/api/gmail/process-statements-v2/route.ts` (LLM prompt)
  - `src/lib/optimizer/card-matcher.ts` (matching logic)
- **Status**: Prompt updated, needs re-processing

---

## 🎨 UI/UX Improvements

### 7. **Remove Parsing Popups** ✅ DONE
- **Problem**: Alert popups interrupting games/timer during parsing
- **Fix**: Replace `alert()` with `console.log()`, auto-redirect
- **File**: `src/app/gmail-test/page.tsx`

### 8. **Fix Real-Time Progress UI**
- **Problem**: Shows 0/24 statements, 0/7 banks, empty phase
- **Root Cause**: Backend endpoint deleted (`process-statements-progress`)
- **Fix**: Reverted to client-side progress simulation
- **File**: `src/components/real-time-processing-status.tsx`

### 9. **Fix Elapsed Timer Jumping**
- **Problem**: Timer jumps (41s → 25s → 45s → 26s)
- **Root Cause**: Timer not maintained on frontend, polls backend
- **Action**: Fix timer logic without breaking functionality
- **File**: `src/components/real-time-processing-status.tsx`

### 10. **Fix Game Interruptions**
- **Problem**: Popups closing games/timer during parsing
- **Fix**: Remove all `alert()`/`confirm()` calls
- **Status**: ✅ Done in previous iteration

---

## 🧪 Testing & Validation

### 11. **Test LLM Amount Parsing Fix**
- **Problem**: Large transactions incorrectly interpreted (₹22L furniture, ₹2.8L coffee)
- **Action**: Run test script on single statement without full sync
- **Script**: Need to create

### 12. **Validate Spend Calculations**
- **Problem**: Total spend incorrect on dashboard
- **Root Cause**: Duplicate transactions or wrong aggregation
- **Action**: Review spend calculation logic
- **Files**: 
  - `src/app/dashboard/page.tsx`
  - `src/lib/optimizer/spend-vector-builder.ts`

### 13. **Verify Statement Coverage**
- **Problem**: Only 20 statements detected instead of 24 (8 cards x 3 months)
- **Possible Causes**: Current month statements not generated, emails not detected
- **Action**: Check Gmail query registry for missed banks
- **File**: `src/lib/gmail/client.ts`

### 14. **Test Card Auto-Matching**
- **Problem**: Wrong cards selected (HDFC Millenia instead of Regalia Gold)
- **Action**: Test LLM extraction, improve confidence thresholds
- **Files**: 
  - `src/lib/optimizer/card-matcher.ts`
  - `src/app/api/gmail/process-statements-v2/route.ts`

---

## 🚀 Feature Enhancements

### 15. **Integrate Two-Stage Categorization Pipeline** 🆕
- **Benefit**: Reduce LLM costs by 60%
- **Approach**: Regex first for known merchants, LLM for ambiguous
- **Files**: 
  - `src/lib/mapper/pre-categorizer.ts` (✅ created)
  - `src/app/api/gmail/process-statements-v2/route.ts` (integration needed)
- **Status**: Pre-categorizer ready, not integrated

### 16. **Test Categorization Coverage**
- **Goal**: Measure how many transactions caught by regex vs LLM
- **Action**: Run test against 219 transactions
- **Expected**: ~60% caught by regex, 40% sent to LLM

### 17. **Refine Merchant Patterns**
- **Goal**: Generate comprehensive merchant master list
- **Script**: `scripts/build-merchant-master-list.js` (✅ run)
- **Output**: Categories from your 219 transactions
- **Action**: Update regex patterns based on results

### 18. **Implement User-Driven Categorization**
- **Goal**: Ask user to categorize unknown spends
- **Component**: `src/components/category-review.tsx` (exists)
- **Action**: Improve UX, make it more prominent

---

## 🔧 Core Functionality

### 19. **Fix Optimizer to Analyze ALL Banks** ✅ DONE (Current Iteration)
- **Problem**: Only HDFC showed optimization warnings
- **Root Cause**: Low-confidence banks skipped API calls
- **Fix**: Two-stage flow - collect queue, then process all
- **Files**: 
  - `src/components/optimizer-results.tsx`
  - `src/components/card-selection-modal.tsx`

### 20. **Fix Card Selection Modal**
- **Problem**: Modal didn't handle multiple banks sequentially
- **Fix**: Carousel UI for bank queue
- **Files**: 
  - `src/components/card-selection-modal.tsx` (✅ updated)
  - `src/components/card-selection.tsx`

### 21. **Fix Cap Warning Logic**
- **Problem**: 3 separate messages for shared caps (Grocery, Online Food, Dining)
- **Root Cause**: Not detecting shared caps (₹1,000 total across 3 categories)
- **Action**: Implement heuristic for shared cap detection
- **File**: `src/lib/optimizer/cap-analyzer.ts` (doesn't exist yet)

### 22. **Handle Unsupported Cards**
- **Problem**: Jupiter Edge, OneCard not supported
- **Action**: Add to unsupported list, show notice on frontend
- **File**: `src/lib/optimizer/card-registry.ts`

---

## 📋 Database & Storage

### 23. **Migrate from Browser Storage to Database**
- **Current**: Using `localStorage` for all data
- **Target**: PostgreSQL/Supabase
- **Files**: Need to create
  - `src/lib/db/client.ts`
  - `src/lib/db/statements.ts`
  - `src/lib/db/transactions.ts`
- **Priority**: Low (working fine with localStorage for now)

### 24. **Implement User Authentication**
- **Current**: Anonymous users (temp_user_id)
- **Target**: Supabase Auth
- **Files**: Need to create
- **Priority**: Low

---

## 🔐 Security & Privacy

### 25. **Implement Privacy Center** ✅ DELETED
- **Files**: 
  - `src/app/api/privacy/route.ts` (deleted)
  - `src/app/api/privacy/export/route.ts` (deleted)
  - `src/app/privacy/page.tsx` (deleted)
- **Status**: Features were deleted, may need to re-implement

### 26. **Implement One-Click Delete**
- **Component**: `src/components/one-click-delete.tsx` (deleted)
- **Status**: Needs re-implementation

### 27. **Add Data Retention Policy**
- **Current**: No expiration
- **Target**: 180-day default retention
- **File**: Need to create

---

## 📱 Gmail Integration

### 28. **Fix Gmail OAuth Redirect**
- **Problem**: 404 error on callback route
- **File**: `src/app/api/oauth2/callback/route.ts`
- **Status**: Fixed in previous iteration

### 29. **Add Gmail Polling Schedule**
- **Current**: Manual sync only
- **Target**: Auto-poll every 15 minutes
- **File**: Need to create scheduler
- **Priority**: Low

### 30. **Implement Gmail Labeling**
- **Current**: Not applying labels
- **Target**: Apply "CardGenius/Statement" label when modify scope granted
- **File**: `src/lib/gmail/client.ts`

---

## 🎯 Production Readiness

### 31. **Deploy to Production**
- **Current**: Running on localhost:3000
- **Target**: Render.com / Railway / DigitalOcean
- **Priority**: Medium
- **Blockers**: None currently

### 32. **Add Environment Variables**
- **Current**: Some hardcoded values
- **Target**: All config via `.env`
- **File**: `.env.example` (✅ exists)

### 33. **Add Error Monitoring**
- **Current**: Console logs only
- **Target**: Sentry / LogRocket
- **Priority**: Low

### 34. **Add Analytics**
- **Current**: No tracking
- **Target**: Track all events from PRD Section P
- **File**: `src/lib/analytics/events.ts` (✅ exists)

---

## 📊 Reporting & Insights

### 35. **Add Dashboard Summaries**
- **Current**: Basic transaction list
- **Target**: 
  - Month-by-month breakdown
  - Category breakdown
  - Card-wise spending
- **Files**: 
  - `src/app/dashboard/page.tsx` (✅ some features added)
  - `src/components/monthly-spend-summary.tsx`

### 36. **Add Export Functionality**
- **Current**: No export
- **Target**: CSV/PDF export of transactions
- **File**: Need to create

### 37. **Add Spend Analytics**
- **Current**: No trends
- **Target**: Charts for monthly trends, category distribution
- **File**: Need to create

---

## 🐛 Bug Fixes

### 38. **Fix Transaction Review Mapping**
- **Problem**: Shows "undefined (undefined)" for transactions needing review
- **Fix**: Correctly map indices to transaction objects
- **File**: `src/app/dashboard/page.tsx`
- **Status**: ✅ Fixed in previous iteration

### 39. **Fix Date Parsing**
- **Problem**: Incorrect date parsing (20251024 → 1024-25)
- **Fix**: Correct substring indices for YYYYMMDD format
- **Files**: 
  - `src/components/optimizer-results.tsx`
  - `src/app/dashboard/page.tsx`
- **Status**: ✅ Fixed in previous iteration

### 40. **Fix TypeScript Errors**
- **Problem**: Various unused variables, type errors
- **Files**: Multiple
- **Status**: Most fixed, some remaining

---

## 🎮 Games & UX

### 41. **Fix Broken Games** ✅ DONE
- **Problem**: Pong and Space Invaders broken/unusable
- **Fix**: Removed broken games, kept only Tetris and Snake
- **File**: `src/components/game-selector.tsx`

### 42. **categorization  UI Enhancement**
- **Problem**: Too many transactions flagged for review
- **Action**: Implement smart review (only flag truly ambiguous)
- **File**: `src/lib/mapper/smart-mapper.ts`

---

## 🔄 Refactoring

### 43. **Consolidate Mapper Files**
- **Current**: Multiple mapper files (`rules.ts`, `complete-mapper.ts`, `smart-mapper.ts`)
- **Target**: Single source of truth
- **Files**: Multiple
- **Priority**: Low

### 44. **Add Unit Tests**
- **Current**: No tests
- **Target**: Jest tests for mapper functions
- **Files**: Need to create
- **Priority**: Low

### 45. **Add Integration Tests**
- **Current**: No integration tests
- **Target**: Test full upload → parse → optimize flow
- **Files**: Need to create
- **Priority**: Low

---

## 📝 Documentation

### 46. **Update README**
- **Current**: Basic README
- **Target**: Comprehensive setup guide
- **File**: `README.md`

### 47. **Add API Documentation**
- **Current**: Comments in code
- **Target**: OpenAPI/Swagger docs
- **File**: Need to create

### 48. **Add Deployment Guide**
- **Current**: No deployment guide
- **Target**: Step-by-step deployment instructions
- **File**: `docs/DEPLOYMENT.md` (✅ exists)

---

## 🎯 Summary

### Completed in Current Iteration ✅
- Fix optimizer to analyze ALL banks
- Fix card selection modal for multiple banks
- Remove parsing popups
- Fix game bugs (Pong, Space Invaders)
- Create pre-categorizer with merchant patterns
- Fix duplicate statement removal
- Fix empty statement removal

### High Priority 🔥
- Fix rent categorization (₹157k → ₹83k)
- Investigate SBI parsing (0 transactions)
- Fix elapsed timer jumping
- Test LLM amount parsing fix

### Medium Priority 📊
- Integrate two-stage categorization pipeline
- Fix cap warning logic
- Test categorization coverage
- Refine merchant patterns

### Low Priority 🔧
- Migrate to database
- Add authentication
- Add analytics
- Add tests

---

**Total TODOs**: 48  
**Completed**: 8  
**In Progress**: 4  
**Pending**: 36

