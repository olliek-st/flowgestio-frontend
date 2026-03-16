// src/utils/scoring/buildEngineInputFromSnapshot.js

console.log("✅ LOADED buildEngineInputFromSnapshot.js (PATCHED - Feb 9 2026)");

function safeParseJson(value, fallback) {
  try {
    if (value == null) return fallback;
    if (typeof value === "string") {
      const t = value.trim();
      if (!t) return fallback;
      return JSON.parse(t);
    }
    // already object/array
    return value;
  } catch {
    return fallback;
  }
}

function toNumber(x) {
  if (x === null || x === undefined || x === "") return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

function toStringSafe(x) {
  if (x === null || x === undefined) return "";
  return typeof x === "string" ? x : String(x);
}

function normalizeOption(raw, idx) {
  const id =
    toStringSafe(raw?.optionId || raw?.id || raw?._id || `opt_${idx + 1}`).trim();

  const name =
    toStringSafe(raw?.name || raw?.title || raw?.label || `Option ${idx + 1}`).trim();

  const description = toStringSafe(raw?.description || raw?.desc || "").trim();

  // financial inputs can be in different shapes
  const fin = raw?.financialInputs || raw?.financialData || raw?.financial || {};
  const capex = toNumber(fin?.capex ?? raw?.capex);
  const opexAnnual = toNumber(fin?.opexAnnual ?? fin?.opex ?? raw?.opexAnnual);
  const benefitsAnnual = toNumber(fin?.benefitsAnnual ?? fin?.benefits ?? raw?.benefitsAnnual);

  return {
    optionId: id,     // ← normalized key
    id,               // keep alias
    name,
    description,
    financialInputs: {
      capex: capex ?? 0,
      opexAnnual: opexAnnual ?? 0,
      benefitsAnnual: benefitsAnnual ?? 0,
    },
    // keep raw fields if needed later (audit/debug)
    _raw: raw,
  };
}

function readOptionsFromSection(section) {
  // ✅ NEW: accept arrays directly (your schema stores arrays in S3_0_* keys)
  if (Array.isArray(section)) {
    console.log("  → readOptionsFromSection: Array format (new)", section.length);
    return section;
  }

  if (!section || typeof section !== "object") {
    console.log("  → readOptionsFromSection: null/invalid", typeof section);
    return [];
  }

  // 1) narrative (stringified JSON)
  const fromNarrative = safeParseJson(section?.narrative, null);
  if (Array.isArray(fromNarrative)) {
    console.log("  → readOptionsFromSection: from narrative JSON", fromNarrative.length);
    return fromNarrative;
  }

  // 2) optionsJson (stringified JSON)
  const fromOptionsJson = safeParseJson(section?.optionsJson, null);
  if (Array.isArray(fromOptionsJson)) {
    console.log("  → readOptionsFromSection: from optionsJson", fromOptionsJson.length);
    return fromOptionsJson;
  }

  // 3) options (already array)
  if (Array.isArray(section?.options)) {
    console.log("  → readOptionsFromSection: from section.options", section.options.length);
    return section.options;
  }

  console.log("  → readOptionsFromSection: no options found");
  return [];
}

export function buildEngineInputFromSnapshot(snapshot) {
  console.log("🔍 buildEngineInputFromSnapshot called", {
    hasS30: !!snapshot?.S3_0_OPTIONS_DATA,
    s30Type: typeof snapshot?.S3_0_OPTIONS_DATA,
    s30IsArray: Array.isArray(snapshot?.S3_0_OPTIONS_DATA),
  });

  const s21 = snapshot?.S2_1_EVAL_CRITERIA || {};
  const s30 = snapshot?.S3_0_OPTIONS_DATA || {};
  const s30Viable = snapshot?.S3_0_VIABLE_OPTIONS || {};

  // section2_1: normalize to what engine expects (numbers, consistent keys)
  const section2_1 = {
    discountRate: toNumber(s21?.discountRate) ?? 0.05,
    timeHorizonYears: toNumber(s21?.timeHorizonYears) ?? 5,
    inflationRate: toNumber(s21?.inflationRate),
    currencyUnit: toStringSafe(s21?.currencyUnit || s21?.currency || "CAD") || "CAD",
    profileType: toStringSafe(s21?.profileType || "balanced") || "balanced",

    // tier weights (keep both naming styles to be safe)
    weightFinancial: toNumber(s21?.weightFinancial ?? s21?.weight_financial) ?? 0.5,
    weightStrategic: toNumber(s21?.weightStrategic ?? s21?.weight_strategic) ?? 0.3,
    weightFeasibility: toNumber(s21?.weightFeasibility ?? s21?.weight_feasibility) ?? 0.2,

    lockMethodology: Boolean(s21?.lockMethodology),
    methodologyHash: toStringSafe(s21?.methodologyHash || ""),
  };

  // options
  console.log("📊 Reading options from S3_0_OPTIONS_DATA...");
  const rawOptions = readOptionsFromSection(s30);
  console.log("📊 Raw options extracted:", rawOptions.length);
  
  const options = rawOptions.map(normalizeOption);
  console.log("✅ Options normalized:", options.length);

  // viable options (optional)
  // support narrative JSON: ["opt_1","opt_2"] or [{id:"opt_1"}]
  const viableRaw = readOptionsFromSection(s30Viable);
  let viableOptionIds = [];
  if (Array.isArray(viableRaw)) {
    if (viableRaw.every((x) => typeof x === "string")) {
      viableOptionIds = viableRaw;
    } else {
      viableOptionIds = viableRaw
        .map((x) => toStringSafe(x?.optionId || x?.id).trim())
        .filter(Boolean);
    }
  }

  console.log("🎯 Engine input ready:", {
    optionsCount: options.length,
    viableCount: viableOptionIds.length,
    currency: section2_1.currencyUnit,
    discountRate: section2_1.discountRate,
  });

  return {
    section2_1,
    options,
    viableOptionIds,
  };
}
