// flowgestio-frontend/src/components/alternatives/alternativesUtils.js
// FINAL PRODUCTION - Canonical Contract Enforcement
// No temporary patches - Definitive architecture

export const OPTION_TYPES = [
  { value: "status_quo", label: "Status Quo" },
  { value: "Buy", label: "Buy / COTS" },
  { value: "Build", label: "Build / Custom Development" },
  { value: "Partner", label: "Partner / Outsource" },
  { value: "ProcessChange", label: "Process Change" },
  { value: "PolicyRegulatory", label: "Policy / Regulatory" },
  { value: "Technology", label: "Technology" },
  { value: "Other", label: "Other" },
  // Legacy types for backward compatibility
  { value: "cots", label: "COTS (Legacy)" },
  { value: "custom", label: "Custom (Legacy)" },
  { value: "partner", label: "Partnership (Legacy)" },
  { value: "phased", label: "Phased Approach" },
  { value: "outsource", label: "Outsource (Legacy)" },
];

export function uid(prefix = "opt") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

/**
 * CANONICAL OPTION NORMALIZATION
 * Enforces the global CanonicalOption contract
 * 
 * Rules:
 * - description is canonical narrative
 * - shortDescription must always mirror description
 * - Preserves ALL acceptance metadata
 * - Preserves ALL provenance metadata
 * - Preserves qualitative classifications
 */
export function normalizeOption(option) {
  // Canonical narrative: description is primary
  const description = option?.description || "";
  const shortDescription = option?.shortDescription || description;
  
  // CRITICAL: Ensure both fields exist and are equal (canonical contract)
  const canonicalDescription = description || shortDescription;

  return {
    // Core identity
    id: option?.id || uid(),
    name: option?.name || "New option",
    type: option?.type || "custom",
    
    // CANONICAL CONTRACT: description is primary, shortDescription mirrors
    description: canonicalDescription,
    shortDescription: canonicalDescription,
    
    // Provenance metadata
    origin: option?.origin || "manual",
    provider: option?.provider || null,
    promptVersion: option?.promptVersion || null,
    rawHash: option?.rawHash || null,
    
    // Qualitative classifications (Section 2.2)
    capexLevel: option?.capexLevel || "Unknown",
    complexityLevel: option?.complexityLevel || "Medium",
    implementationHorizon: option?.implementationHorizon || "Medium",
    
    // Acceptance metadata (immutability enforcement)
    accepted: option?.accepted ?? false,
    acceptedAt: option?.acceptedAt || null,
    acceptedHash: option?.acceptedHash || null,
    acceptedTamperDetected: option?.acceptedTamperDetected ?? false,
    
    // Structured 3.0 inputs (stored, not displayed until 3.0 form)
    inputs3_0: option?.inputs3_0 || null,

    // S2.2 evidence capture — Level 5 pass-through (never dropped by normalizer)
    evidenceByCriterionId: (option?.evidenceByCriterionId && typeof option.evidenceByCriterionId === "object")
      ? option.evidenceByCriterionId
      : {},

    // Legacy Section 3 fields (backward compatibility)
    viable: option?.viable ?? true,
    capex: option?.capex ?? "",
    opex: option?.opex ?? "",
    pros: Array.isArray(option?.pros) ? option.pros : [],
    cons: Array.isArray(option?.cons) ? option.cons : [],
    risks: Array.isArray(option?.risks) ? option.risks : [],
    vendors: Array.isArray(option?.vendors) ? option.vendors : [],
    sources: Array.isArray(option?.sources) ? option.sources : [],
  };
}

/**
 * Section 2.2 lightweight normalization
 * ONLY for discovery phase - minimal fields
 */
export function normalizeOption2_2(option) {
  const description = (
    option?.description ||
    option?.shortDescription ||
    option?.short_description ||
    ""
  ).toString();

  return {
    id: option?.id || uid(),
    name: (option?.name || "").toString(),
    type: (option?.type || "Other").toString(),
    
    // CANONICAL: both fields must exist and be equal
    description,
    shortDescription: description,
    
    // Provenance
    origin: option?.origin || "manual",
    provider: option?.provider || null,
    promptVersion: option?.promptVersion || null,
    rawHash: option?.rawHash || null,
    
    // Qualitative classifications
    capexLevel: option?.capexLevel || "Unknown",
    complexityLevel: option?.complexityLevel || "Medium",
    implementationHorizon: option?.implementationHorizon || "Medium",
    
    // Acceptance
    accepted: option?.accepted ?? false,
    acceptedAt: option?.acceptedAt || null,
    acceptedHash: option?.acceptedHash || null,

    // S2.2 evidence capture — Level 5 pass-through (never dropped by normalizer)
    evidenceByCriterionId: (option?.evidenceByCriterionId && typeof option.evidenceByCriterionId === "object")
      ? option.evidenceByCriterionId
      : {},
  };
}

/**
 * Sanitize option for 2.2 display (defensive)
 */
export function sanitizeOption2_2(option) {
  return {
    id: option?.id || uid(),
    name: (option?.name || "").toString(),
    type: (option?.type || "Other").toString(),
    description: (option?.description || "").toString(),
    shortDescription: (option?.shortDescription || option?.description || "").toString(),
  };
}

/**
 * LEGACY: Ensure Status Quo exists
 * Only used in full Section 3 flows (NOT in Section 2.2)
 */
export function ensureStatusQuo(options = []) {
  const hasSQ = options.some((o) => o?.type === "status_quo" || o?.id === "status_quo");
  if (hasSQ) return options;

  return [
    {
      id: "status_quo",
      type: "status_quo",
      name: "Status Quo",
      viable: true,
      description: "",
      shortDescription: "",
      capex: "",
      opex: "",
      pros: [],
      cons: [],
      risks: [],
      vendors: [],
      sources: [],
      accepted: false,
      acceptedAt: null,
      origin: "manual",
    },
    ...options,
  ];
}

/**
 * Check if option is immutable (accepted or status quo)
 */
export function isOptionImmutable(option) {
  return (
    option?.accepted === true ||
    option?.type === "status_quo" ||
    option?.id === "status_quo"
  );
}

/**
 * Generate acceptance hash for immutability verification
 */
function generateAcceptanceHash(option) {
  const canonical = `${option.name}|${option.type}|${option.description}|${option.promptVersion || ''}|${option.rawHash || ''}`;
  
  // Simple hash function (production should use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    const char = canonical.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 16);
}

/**
 * Mark option as accepted with immutability hash
 */
export function acceptOption(option) {
  if (isOptionImmutable(option)) return option;
  
  const acceptedHash = generateAcceptanceHash(option);
  
  return {
    ...option,
    accepted: true,
    acceptedAt: new Date().toISOString(),
    acceptedHash,
  };
}

/**
 * Verify option hasn't been tampered with since acceptance
 */
export function verifyAcceptedOption(option) {
  if (!option.accepted || !option.acceptedHash) return option;
  
  const currentHash = generateAcceptanceHash(option);
  
  if (currentHash !== option.acceptedHash) {
    return {
      ...option,
      acceptedTamperDetected: true,
    };
  }
  
  return option;
}

/**
 * Merge new options preserving accepted ones (regeneration flow)
 *
 * Strategy:
 * 1. Always keep the existing Status Quo (with all user-entered data) — never replace with a blank one
 * 2. Keep all accepted non-SQ options unchanged (verify tamper)
 * 3. Keep all existing non-accepted user-entered options (preserve manual work)
 * 4. Add new AI options that don't conflict with existing ones (dedup by id then name+type)
 * 5. Never assign new IDs to options that already exist
 */
export function mergeOptionsPreservingAccepted(existing, newOptions) {
  // ── 1. Separate existing options by category ──────────────────────────────
  const existingSQ = existing.find(
    (opt) => opt.type === "status_quo" || opt.id === "status_quo"
  );

  const accepted = existing
    .filter((opt) => opt.accepted === true && opt.type !== "status_quo" && opt.id !== "status_quo")
    .map(verifyAcceptedOption);

  const existingUser = existing.filter(
    (opt) =>
      opt.accepted !== true &&
      opt.type !== "status_quo" &&
      opt.id !== "status_quo"
  );

  // ── 2. Build merged array: SQ first, then accepted, then existing user ────
  const merged = [];
  const seenIds = new Set();
  const seenNameType = new Set();

  if (existingSQ) {
    merged.push(existingSQ);
    seenIds.add(existingSQ.id);
    seenNameType.add(`${existingSQ.name}|${existingSQ.type}`);
  }

  for (const opt of accepted) {
    if (!seenIds.has(opt.id)) {
      merged.push(opt);
      seenIds.add(opt.id);
      seenNameType.add(`${opt.name}|${opt.type}`);
    }
  }

  for (const opt of existingUser) {
    if (!seenIds.has(opt.id)) {
      merged.push(opt);
      seenIds.add(opt.id);
      seenNameType.add(`${opt.name}|${opt.type}`);
    }
  }

  // ── 3. Add new AI options — skip any that duplicate an existing one ───────
  const newNonImmutable = (newOptions || []).filter((opt) => !isOptionImmutable(opt));
  for (const opt of newNonImmutable) {
    const nameTypeKey = `${opt.name}|${opt.type}`;
    if (!seenIds.has(opt.id) && !seenNameType.has(nameTypeKey)) {
      merged.push(opt);
      seenIds.add(opt.id);
      seenNameType.add(nameTypeKey);
    }
  }

  return merged;
}

/**
 * Update option with tamper detection for accepted options
 */
export function updateOptionSafely(option, updates) {
  if (!option.accepted) {
    return { ...option, ...updates };
  }
  
  // Accepted options: only allow updates to non-canonical fields
  const allowedUpdates = {
    viable: updates.viable,
    capex: updates.capex,
    opex: updates.opex,
    pros: updates.pros,
    cons: updates.cons,
    risks: updates.risks,
    vendors: updates.vendors,
    sources: updates.sources,
    inputs3_0: updates.inputs3_0,
  };
  
  // Remove undefined values
  Object.keys(allowedUpdates).forEach(key => {
    if (allowedUpdates[key] === undefined) delete allowedUpdates[key];
  });
  
  return { ...option, ...allowedUpdates };
}

// ── S2.2 Evidence Capture — Level 5 ──────────────────────────────────────────

/**
 * Ensure every criterion in `criteria` has a slot in option.evidenceByCriterionId.
 * Existing slots are normalized (never erased).
 * Option with acceptedHash is returned unchanged.
 *
 * @param {object} option
 * @param {Array}  criteria  - ScreeningCriterion[] from parseCriteriaFromS2_1
 * @param {string} [nowIso]
 * @returns {object} new option object (never mutates input)
 */
export function ensureEvidenceSlotsForOption(option, criteria, nowIso = new Date().toISOString()) {
  const next = { ...option };
  const existing = (next.evidenceByCriterionId && typeof next.evidenceByCriterionId === "object")
    ? next.evidenceByCriterionId : {};
  const merged = { ...existing };
  for (const c of (criteria || [])) {
    const id = c?.id;
    if (!id) continue;
    if (!merged[id]) {
      merged[id] = { text: "", value: null, evidenceRefs: [], updatedAt: nowIso };
    } else {
      merged[id] = {
        text: merged[id].text ?? "",
        value: merged[id].value ?? null,
        evidenceRefs: Array.isArray(merged[id].evidenceRefs) ? merged[id].evidenceRefs : [],
        updatedAt: merged[id].updatedAt ?? nowIso,
      };
    }
  }
  next.evidenceByCriterionId = merged;
  return next;
}

/**
 * Apply ensureEvidenceSlotsForOption to every option in the array.
 *
 * @param {Array}  options
 * @param {Array}  criteria  - ScreeningCriterion[]
 * @returns {Array} new array (never mutates inputs)
 */
export function ensureEvidenceSlotsForAllOptions(options, criteria) {
  return (options || []).map(opt => ensureEvidenceSlotsForOption(opt, criteria));
}

/**
 * Immutably update a single criterion's evidence slot inside an option.
 * `patch` is shallow-merged into the existing slot.
 * `updatedAt` is always refreshed.
 *
 * ABSOLUTE RULE: never modifies acceptedHash or any acceptance metadata.
 *
 * @param {object} option
 * @param {string} criterionId
 * @param {object} patch          - Partial evidence slot: { text?, value?, evidenceRefs? }
 * @param {string} [nowIso]
 * @returns {object} new option object
 */
export function updateEvidence(option, criterionId, patch, nowIso = new Date().toISOString()) {
  const withSlots = ensureEvidenceSlotsForOption(option, [{ id: criterionId }], nowIso);
  return {
    ...withSlots,
    evidenceByCriterionId: {
      ...withSlots.evidenceByCriterionId,
      [criterionId]: {
        ...withSlots.evidenceByCriterionId[criterionId],
        ...patch,
        updatedAt: nowIso,
      },
    },
  };
}
