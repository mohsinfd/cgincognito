# 🐛 Elapsed Time Bug Fix

## Problem

The elapsed time jumps around (41s → 25s → 45s → 26s) because:

1. **Frontend** has its own timer (line 55-64) that counts up from `startTime`
2. **Backend** returns its own `elapsedTime` in the progress API
3. **Line 91** overwrites the frontend timer with backend's time every 2 seconds

```typescript
// LINE 91 - THE BUG:
elapsedTime: realProgress.elapsedTime || prev.elapsedTime,
```

This causes the frontend timer to reset to the backend's elapsed time, which started later and is out of sync.

## The Fix

**Change line 91 from:**
```typescript
elapsedTime: realProgress.elapsedTime || prev.elapsedTime,
```

**To:**
```typescript
// Don't overwrite frontend timer with backend elapsed time
// elapsedTime: realProgress.elapsedTime || prev.elapsedTime,
```

Just remove/comment out that line so the frontend timer (lines 55-64) continues uninterrupted.

## Why This Works

- **Frontend timer** (lines 55-64) already handles elapsed time correctly
- It starts when the component mounts (`startTime = Date.now()`)
- It updates every 1 second
- It's independent and doesn't need backend data

The backend `elapsedTime` was redundant and causing conflicts.

## File to Change

`src/components/real-time-processing-status.tsx` - line 91

## When to Apply

**⚠️ APPLY AFTER CURRENT TEST IS COMPLETE**

The user has a test running on the frontend. Apply this fix after the test is deployed to avoid breaking anything mid-test.

## Testing After Fix

1. Start a Gmail sync
2. Watch the elapsed time in the UI
3. It should count up smoothly: 1s, 2s, 3s, 4s... without jumping backward
4. Other progress data (completed statements, current phase, etc.) should still update correctly

## Code Change

```diff
// src/components/real-time-processing-status.tsx

          // Update progress with real data
          setProgress(prev => ({
            ...prev,
            totalStatements: realProgress.totalStatements || totalStatements,
            completedStatements: realProgress.completedStatements || 0,
            currentStatement: realProgress.currentStatement,
            currentPhase: realProgress.currentPhase || 'pdf_processing',
            phaseProgress: realProgress.phaseProgress || 0,
-           elapsedTime: realProgress.elapsedTime || prev.elapsedTime,
+           // Frontend timer handles elapsed time (don't overwrite)
            estimatedTimeRemaining: realProgress.estimatedTimeRemaining || 0,
            completedBanks: realProgress.completedBanks || []
          }));
```

## Impact

- ✅ No breaking changes
- ✅ Elapsed time now counts smoothly
- ✅ All other progress updates still work
- ✅ No changes to backend API
- ✅ No changes to data flow

---

**Status:** 📝 Fix documented, ready to apply after test completion

