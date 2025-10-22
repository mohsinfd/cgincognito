// Check localStorage for any hardcoded user data
// Run this in browser console

console.log('🔍 Checking localStorage for user data...');

// Check all localStorage keys
const keys = Object.keys(localStorage);
console.log('📋 All localStorage keys:', keys);

// Check each key for user-related data
keys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value && typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (JSON.stringify(parsed).toLowerCase().includes('rajesh') || 
          JSON.stringify(parsed).toLowerCase().includes('kumar')) {
        console.log(`🚨 Found "Rajesh Kumar" in key "${key}":`, parsed);
      }
    } catch (e) {
      // Not JSON, check as string
      if (value.toLowerCase().includes('rajesh') || 
          value.toLowerCase().includes('kumar')) {
        console.log(`🚨 Found "Rajesh Kumar" in key "${key}":`, value);
      }
    }
  }
});

// Check specific keys that might contain user data
const userKeys = ['cardgenius_statements', 'gmail_tokens', 'cardgenius_password_patterns'];
userKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    console.log(`📄 Key "${key}" exists:`, value.substring(0, 200) + '...');
  } else {
    console.log(`❌ Key "${key}" not found`);
  }
});

console.log('✅ localStorage check complete');
