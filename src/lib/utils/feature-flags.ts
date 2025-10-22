/**
 * Feature flags
 * Based on PRD Section O
 */

export type FeatureFlag =
  | 'gmail_sync_enabled'
  | 'optimizer_enabled'
  | 'html_statement_parser'
  | 'apply_gmail_label';

/**
 * Check if a feature is enabled
 * @param flag Feature flag name
 * @returns true if enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `FEATURE_${flag.toUpperCase()}`;
  const value = process.env[envKey];
  
  return value === 'true' || value === '1';
}

/**
 * Get all feature flag states
 */
export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  return {
    gmail_sync_enabled: isFeatureEnabled('gmail_sync_enabled'),
    optimizer_enabled: isFeatureEnabled('optimizer_enabled'),
    html_statement_parser: isFeatureEnabled('html_statement_parser'),
    apply_gmail_label: isFeatureEnabled('apply_gmail_label'),
  };
}

/**
 * Require feature to be enabled, throw if not
 */
export function requireFeature(flag: FeatureFlag): void {
  if (!isFeatureEnabled(flag)) {
    throw new Error(`Feature '${flag}' is not enabled`);
  }
}

