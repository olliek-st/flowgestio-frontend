// src/utils/buildStep1Payload.js

/**
 * Canonical Step1 payload builder (LOCKED CONTRACT)
 * Always returns: { step1: { inputs: { ... } } }
 */
export function buildStep1Payload(step1Inputs) {
  const inputs =
    step1Inputs && typeof step1Inputs === "object" && !Array.isArray(step1Inputs)
      ? step1Inputs
      : {};

  return { step1: { inputs } };
}
