/**
 * Password Pattern Caching System
 * Browser storage for learned password patterns per bank
 */

export type PasswordRequirement = {
  fields: ('name' | 'dob' | 'card_last4' | 'card_last2' | 'pan' | 'mobile')[];
  format: string;
  instructions: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'regex' | 'llm' | 'cache';
  bankCode: string;
  createdAt: string;
  successCount: number; // How many times this pattern worked
  totalAttempts: number; // How many times this pattern was tried
};

const CACHE_KEY = 'cardgenius_password_patterns';
const MAX_CACHE_SIZE = 50; // Limit cache size

/**
 * Get cached password pattern for a bank
 */
export function getCachedPattern(bankCode: string): PasswordRequirement | null {
  try {
    const cache = getCache();
    const pattern = cache[bankCode.toLowerCase()];
    
    if (pattern) {
      console.log(`🎯 Cache hit for ${bankCode}: ${pattern.format}`);
      return {
        ...pattern,
        source: 'cache' as const
      };
    }
    
    console.log(`❌ Cache miss for ${bankCode}`);
    return null;
  } catch (error) {
    console.error('Failed to get cached pattern:', error);
    return null;
  }
}

/**
 * Cache a successful password pattern
 */
export function cachePattern(
  bankCode: string, 
  pattern: Omit<PasswordRequirement, 'bankCode' | 'createdAt' | 'successCount' | 'totalAttempts'>
): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      // Server-side: skip caching silently
      return;
    }
    const cache = getCache();
    const key = bankCode.toLowerCase();
    
    const cachedPattern: PasswordRequirement = {
      ...pattern,
      bankCode: key,
      createdAt: new Date().toISOString(),
      successCount: 1,
      totalAttempts: 1,
    };
    
    // Update existing pattern or create new one
    if (cache[key]) {
      cachedPattern.successCount = cache[key].successCount + 1;
      cachedPattern.totalAttempts = cache[key].totalAttempts + 1;
      cachedPattern.createdAt = cache[key].createdAt; // Keep original date
    }
    
    cache[key] = cachedPattern;
    
    // Limit cache size
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_SIZE) {
      // Remove oldest entries
      const sorted = keys
        .map(k => ({ key: k, date: cache[k].createdAt }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const toRemove = sorted.slice(0, keys.length - MAX_CACHE_SIZE);
      toRemove.forEach(item => delete cache[item.key]);
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`💾 Cached pattern for ${bankCode}: ${pattern.format}`);
    
  } catch (error) {
    console.error('Failed to cache pattern:', error);
  }
}

/**
 * Update pattern success/failure stats
 */
export function updatePatternStats(bankCode: string, success: boolean): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      // Server-side: skip stats update silently
      return;
    }
    const cache = getCache();
    const key = bankCode.toLowerCase();
    
    if (cache[key]) {
      cache[key].totalAttempts += 1;
      if (success) {
        cache[key].successCount += 1;
      }
      
      // Update confidence based on success rate
      const successRate = cache[key].successCount / cache[key].totalAttempts;
      if (successRate >= 0.8) {
        cache[key].confidence = 'high';
      } else if (successRate >= 0.5) {
        cache[key].confidence = 'medium';
      } else {
        cache[key].confidence = 'low';
      }
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      console.log(`📊 Updated ${bankCode} stats: ${cache[key].successCount}/${cache[key].totalAttempts} (${(successRate * 100).toFixed(1)}%)`);
    }
  } catch (error) {
    console.error('Failed to update pattern stats:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  hitRate: number;
  patterns: number;
  totalAttempts: number;
  totalSuccesses: number;
  banks: string[];
} {
  try {
    const cache = getCache();
    const patterns = Object.values(cache);
    
    const totalAttempts = patterns.reduce((sum, p) => sum + p.totalAttempts, 0);
    const totalSuccesses = patterns.reduce((sum, p) => sum + p.successCount, 0);
    const hitRate = totalAttempts > 0 ? totalSuccesses / totalAttempts : 0;
    
    return {
      hitRate,
      patterns: patterns.length,
      totalAttempts,
      totalSuccesses,
      banks: Object.keys(cache),
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      hitRate: 0,
      patterns: 0,
      totalAttempts: 0,
      totalSuccesses: 0,
      banks: [],
    };
  }
}

/**
 * Clear all cached patterns
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Cleared password pattern cache');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Get all cached patterns
 */
export function getAllCachedPatterns(): Record<string, PasswordRequirement> {
  return getCache();
}

/**
 * Private helper to get cache from localStorage
 * Note: Only works in browser environment, returns empty cache on server
 */
function getCache(): Record<string, PasswordRequirement> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {}; // Server-side, no cache available
  }
  
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to parse cache data:', error);
    return {};
  }
}

/**
 * Export cache data for backup/debugging
 */
export function exportCache(): string {
  const cache = getCache();
  const stats = getCacheStats();
  
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats,
    patterns: cache,
  }, null, 2);
}

/**
 * Import cache data from backup
 */
export function importCache(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    if (parsed.patterns && typeof parsed.patterns === 'object') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(parsed.patterns));
      console.log('📥 Imported password pattern cache');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to import cache:', error);
    return false;
  }
}
