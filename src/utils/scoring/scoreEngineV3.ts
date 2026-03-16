import type {
  EngineInput,
  EngineOutput,
  EvaluationProfileType,
  FinancialMetrics,
  OptionEntry,
  OptionScoreEntry,
  RubricCriterion,
  Section2_1_Input,
  TierWeights,
} from "./SCORING_ENGINE_CONTRACT_V3";

console.log("✅ scoreEngineV3.js loaded");

type AnyRecord = Record<string, any>; // justified: loose runtime API data

const VALID_PROFILE_TYPES = ["balanced", "transformation", "efficiency", "compliance"] as const;
function toProfileType(v: unknown): EvaluationProfileType {
  const s = String(v ?? "balanced");
  return (VALID_PROFILE_TYPES as readonly string[]).includes(s)
    ? (s as EvaluationProfileType)
    : "balanced";
}

function safeNumber(x: any, fallback: number = 0): number {
  const n = typeof x === "number" ? x : parseFloat(String(x ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function pv(amount: number, yearIndex: number, discountRate: number): number {
  return amount / Math.pow(1 + discountRate, yearIndex);
}

function normalizeTo1to5(value: number, minV: number, maxV: number, higherIsBetter: boolean): number {
  if (maxV === minV) return 3;
  const t = (value - minV) / (maxV - minV);
  const s = higherIsBetter ? t : 1 - t;
  return 1 + 4 * clamp(s, 0, 1);
}

function weightedRubricScore(
  criteria: RubricCriterion[],
  scores: Record<string, OptionScoreEntry> | undefined,
  flags: Array<{ level: "WARN" | "BLOCK"; code: string; message: string }>
): number {
  if (!criteria.length) return 3;

  let totalWeight = 0;
  let acc = 0;

  for (const c of criteria) {
    const w = safeNumber(c.weight, 0);
    totalWeight += w;

    const entry = scores?.[c.id];
    const raw = safeNumber(entry?.score, 3);
    const score = clamp(raw, 1, 5);

    const thr = safeNumber(c.requiresJustificationAbove, 3);
    if (score > thr) {
      const minLen = safeNumber(c.minJustificationLength, 100);
      const j = String(entry?.justification ?? "");
      if (j.trim().length < minLen) {
        flags.push({
          level: "WARN",
          code: "JUSTIFICATION_TOO_SHORT",
          message: `Score ${score} for '${c.id}' but justification too short.`,
        });
      }
      const refs = entry?.evidenceRefs ?? [];
      if (!Array.isArray(refs) || refs.length === 0) {
        flags.push({
          level: "WARN",
          code: "MISSING_EVIDENCE_REFS",
          message: `Score ${score} for '${c.id}' but no evidence refs.`,
        });
      }
    }

    acc += score * w;
  }

  if (totalWeight <= 0) return 3;
  return acc / totalWeight;
}

function computeFinancialMetrics(opt: OptionEntry, s21: Section2_1_Input): FinancialMetrics {
  const dr = safeNumber(s21.discountRate, 0.05);
  const horizon = Math.max(1, Math.floor(safeNumber(s21.timeHorizonYears, 5)));

  const fin = opt.financialInputs ?? {};

  const capexByYear = Array.isArray(fin.capexByYear) ? fin.capexByYear : [safeNumber(fin.capex, 0)];
  const opexByYear = Array.isArray(fin.opexByYear)
    ? fin.opexByYear
    : Array.from({ length: horizon }, () => safeNumber(fin.opexAnnual, 0));
  const benByYear = Array.isArray(fin.benefitsByYear)
    ? fin.benefitsByYear
    : Array.from({ length: horizon }, () => safeNumber(fin.benefitsAnnual, 0));

  const oneTimeBenefits = safeNumber(fin.oneTimeBenefits, 0);

  let pvCosts = 0;
  let pvBenefits = 0;

  for (let i = 0; i < capexByYear.length; i++) pvCosts += pv(safeNumber(capexByYear[i], 0), i, dr);

  for (let year = 1; year <= horizon; year++) {
    const idx = year - 1;
    pvCosts += pv(safeNumber(opexByYear[idx] ?? 0, 0), year, dr);
    pvBenefits += pv(safeNumber(benByYear[idx] ?? 0, 0), year, dr);
  }

  pvBenefits += pv(oneTimeBenefits, 0, dr);

  const tco = pvCosts;
  const npv = pvBenefits - pvCosts;
  const roi = pvCosts > 0 ? (pvBenefits - pvCosts) / pvCosts : null;

  let payback: number | null = null;
  const capex0 = safeNumber(fin.capex, capexByYear[0] ?? 0);
  const annualNet = safeNumber(fin.benefitsAnnual, 0) - safeNumber(fin.opexAnnual, 0);
  if (capex0 > 0 && annualNet > 0) payback = capex0 / annualNet;

  return { tco, npv, roi, paybackYears: payback };
}

function tierWeightsFromSection(section2_1: Section2_1_Input): TierWeights {
  const w = section2_1.weights;
  const fin = clamp(safeNumber(w.financial, 0.5), 0, 1);
  const strat = clamp(safeNumber(w.strategic, 0.3), 0, 1);
  const feas = clamp(safeNumber(w.feasibility, 0.2), 0, 1);
  const s = fin + strat + feas;
  if (s === 0) return { financial: 0.5, strategic: 0.3, feasibility: 0.2 };
  return { financial: fin / s, strategic: strat / s, feasibility: feas / s };
}

function safeParseArray<T = any>(value: any, fallback: T[] = []): T[] {
  try {
    if (value == null) return fallback;
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      const t = value.trim();
      if (!t) return fallback;
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed : fallback;
    }
    // if it's an object but not an array, can't use as list
    return fallback;
  } catch {
    return fallback;
  }
}


export function scoreEngineV3(input: EngineInput): EngineOutput {
  const s21 = input.section2_1;
  const weights = tierWeightsFromSection(s21);
  const options = input.options ?? [];

  const scored = options.map((opt) => {
    const flags: Array<{ level: "WARN" | "BLOCK"; code: string; message: string }> = [];

    const complianceCriterion = s21.feasibilityCriteria.find((c) => c.id === "policy_compliance");
    if (complianceCriterion?.complianceMode && complianceCriterion.complianceMode !== "rubric") {
      const entry = opt.qualitativeScores?.feasibility?.["policy_compliance"];
      if (entry?.complianceTier === "NON_COMPLIANT") {
        flags.push({
          level: "BLOCK",
          code: "NON_COMPLIANT",
          message: "Option marked NON_COMPLIANT with mandatory policy/standards.",
        });
      }
    }

    const fin = computeFinancialMetrics(opt, s21);

    return {
      optionId: opt.optionId,
      name: opt.name,
      financial: fin,
      flags,
      financialScore1to5: 3,
      strategicScore1to5: 3,
      feasibilityScore1to5: 3,
      finalScore0to100: 0,
      rank: 0,
    };
  });

  // Financial normalization
  const npvs = scored.map((s) => s.financial.npv);
  const tcos = scored.map((s) => s.financial.tco);
  const minNPV = npvs.length ? Math.min(...npvs) : 0;
  const maxNPV = npvs.length ? Math.max(...npvs) : 0;
  const minTCO = tcos.length ? Math.min(...tcos) : 0;
  const maxTCO = tcos.length ? Math.max(...tcos) : 0;

  for (const s of scored) {
    const npvScore = normalizeTo1to5(s.financial.npv, minNPV, maxNPV, true);
    const tcoScore = normalizeTo1to5(s.financial.tco, minTCO, maxTCO, false);
    s.financialScore1to5 = npvScore * 0.6 + tcoScore * 0.4;
  }

  // Rubrics
  for (const s of scored) {
    const opt = options.find((o) => o.optionId === s.optionId);
    s.strategicScore1to5 = weightedRubricScore(s21.strategicCriteria, opt?.qualitativeScores?.strategic, s.flags);
    s.feasibilityScore1to5 = weightedRubricScore(s21.feasibilityCriteria, opt?.qualitativeScores?.feasibility, s.flags);
  }

  // Composite
  for (const s of scored) {
    const raw =
      s.financialScore1to5 * weights.financial +
      s.strategicScore1to5 * weights.strategic +
      s.feasibilityScore1to5 * weights.feasibility;

    s.finalScore0to100 = Math.round(((raw - 1) / 4) * 1000) / 10;

    if (s.flags.some((f) => f.level === "BLOCK")) {
      s.finalScore0to100 = Math.min(s.finalScore0to100, 10);
    }
  }

  // Rank
  scored.sort((a, b) => {
    const aBlocked = a.flags.some((f) => f.level === "BLOCK") ? 1 : 0;
    const bBlocked = b.flags.some((f) => f.level === "BLOCK") ? 1 : 0;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked; // non-blocked first
    if (b.finalScore0to100 !== a.finalScore0to100) return b.finalScore0to100 - a.finalScore0to100;
    if (b.feasibilityScore1to5 !== a.feasibilityScore1to5) return b.feasibilityScore1to5 - a.feasibilityScore1to5;
    return b.financialScore1to5 - a.financialScore1to5;
  });

  scored.forEach((s, i) => (s.rank = i + 1));

  return {
    scoredOptions: scored,
    comparativeTable: scored.map((s) => ({
      optionId: s.optionId,
      name: s.name,
      financialScore1to5: Math.round(s.financialScore1to5 * 100) / 100,
      strategicScore1to5: Math.round(s.strategicScore1to5 * 100) / 100,
      feasibilityScore1to5: Math.round(s.feasibilityScore1to5 * 100) / 100,
      finalScore0to100: Math.round(s.finalScore0to100 * 10) / 10,
      rank: s.rank,
      flags: s.flags.map((f) => `${f.level}:${f.code}`),
    })),
  };
}

/**
 * Adapter: expects snapshot to contain S2_1_EVAL_CRITERIA and S3_0_OPTIONS_DATA
 * - snapshot[sectionId][fieldKey]
 * - or snapshot.sections[sectionId][fieldKey]
 * - or snapshot.data[sectionId][fieldKey]
 */
export function buildEngineInputFromSnapshot(snapshot: AnyRecord): EngineInput {
  console.log("🔍 buildEngineInputFromSnapshot (scoreEngineV3.ts) called");
  
  const getSection = (id: string): AnyRecord =>
    (snapshot?.[id] ?? snapshot?.sections?.[id] ?? snapshot?.data?.[id] ?? {}) as AnyRecord;

  const s2 = getSection("S2_1_EVAL_CRITERIA");
  const s30 = getSection("S3_0_OPTIONS_DATA");
  
  console.log("  s30 type:", typeof s30, "isArray:", Array.isArray(s30));

  const strategicCriteria: RubricCriterion[] =
    safeParseArray<RubricCriterion>(s2?.strategicCriteriaJson, []);

  const feasibilityCriteria: RubricCriterion[] =
    safeParseArray<RubricCriterion>(s2?.feasibilityCriteriaJson, []);

  const section2_1: Section2_1_Input = {
    discountRate: safeNumber(s2.discountRate ?? "0.05", 0.05),
    timeHorizonYears: Math.max(1, Math.floor(safeNumber(s2.timeHorizonYears ?? "5", 5))),
    inflationRate: String(s2.inflationRate ?? "").trim()
      ? safeNumber(s2.inflationRate, 0.02)
      : undefined,
    currencyUnit: String(s2.currencyUnit ?? s2.currency ?? "CAD"),

    profileType: toProfileType(s2.profileType),
    weights: {
      financial: safeNumber(s2.weight_financial ?? s2.weightFinancial ?? "0.50", 0.5),
      strategic: safeNumber(s2.weight_strategic ?? s2.weightStrategic ?? "0.30", 0.3),
      feasibility: safeNumber(s2.weight_feasibility ?? s2.weightFeasibility ?? "0.20", 0.2),
    },

    methodologyLocked:
      s2.lockMethodology === true ||
      String(s2.lockMethodology ?? s2.methodologyLocked ?? "false") === "true",

    strategicCriteria,
    feasibilityCriteria,
  };

  // ✅ FIX PRINCIPAL: Support Array direct (nouveau format FlowGestio)
  let rawOptions: any[] = [];
  
  // CAS 1: s30 est directement un Array (nouveau format)
  if (Array.isArray(s30)) {
    console.log("  ✅ s30 is Array (new format):", s30.length);
    rawOptions = s30;
  }
  // CAS 2: s30.optionsJson (JSON string)
  else if (s30?.optionsJson) {
    console.log("  → Trying s30.optionsJson");
    rawOptions = safeParseArray<any>(s30.optionsJson, []);
  }
  // CAS 3: s30.narrative (JSON string)
  else if (s30?.narrative) {
    console.log("  → Trying s30.narrative");
    rawOptions = safeParseArray<any>(s30.narrative, []);
  }
  // CAS 4: s30.options (already array)
  else if (Array.isArray(s30?.options)) {
    console.log("  → Found s30.options:", s30.options.length);
    rawOptions = s30.options;
  }
  else {
    console.log("  ❌ No options found in s30");
  }

  console.log("  📊 Raw options extracted:", rawOptions.length);

  const options: OptionEntry[] = (Array.isArray(rawOptions) ? rawOptions : []).map((o: any, idx: number) => ({
    ...o,
    optionId: o.optionId ?? o.id ?? o.key ?? o.code ?? `opt_${idx + 1}`,
    name: o.name ?? o.title ?? o.label ?? `Option ${idx + 1}`,
  }));
  
  console.log("  ✅ Options normalized:", options.length);

  return { section2_1, options };
}
