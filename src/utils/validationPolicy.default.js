// src/utils/validationPolicy.default.js
// Default validation policy used by ruleEngine.js
// Keep it conservative: nothing disabled, no overrides.

export const DEFAULT_VALIDATION_POLICY = {
  id: "default",
  // Global params used by some rules (optional)
  params: {
    // Example placeholders (safe defaults)
    currency: "USD",
    minBusinessCaseHorizonMonths: 12,
  },

  // Disable specific rule IDs here if needed
  disabledRuleIds: [],

  // Per-rule shallow overrides (severity/message/targetFieldKey/etc.)
  overrides: {},

  // Capability profiles (optional, can stay empty)
  enabledCapabilities: [],
};
