// src/lib/finance/calculator.ts
import type {
  LineItem, OrganizationalSettings, FinancialCalculator
} from "@/types/businessCase";

// step for recurrence
function stepOf(recurrence: "one-time" | "monthly" | "quarterly" | "annual"): number {
  return recurrence === "one-time" ? 0 : recurrence === "monthly" ? 1 : recurrence === "quarterly" ? 3 : 12;
}

// Build sparse monthly series respecting recurrenceBehavior & org defaults
function buildSeries(
  lineItems: LineItem[],
  horizonMonths: number,
  orgSettings: OrganizationalSettings
): number[] {
  const series = Array(horizonMonths).fill(0);
  for (const li of lineItems) {
    const sign = li.kind === "cost" ? -1 : +1;
    const s = Math.min(li.startMonth, horizonMonths);
    if (s >= horizonMonths) continue;

    if (li.recurrence === "one-time") {
      series[s] += sign * li.amount;
      continue;
    }

    const step = stepOf(li.recurrence);
    const behavior = li.recurrenceBehavior ?? {
      endsAtHorizon: orgSettings.defaultRecurrenceEnd === "horizon",
    };

    let endExclusive: number | undefined;
    if (behavior.endsAtHorizon) {
      endExclusive = horizonMonths;
    } else if (typeof li.endMonth === "number") {
      endExclusive = Math.min(li.endMonth, horizonMonths);
    } else if (behavior.totalOccurrences && behavior.totalOccurrences > 0) {
      endExclusive = Math.min(s + step * behavior.totalOccurrences, horizonMonths);
    } else {
      // fallback to horizon
      endExclusive = horizonMonths;
    }

    for (let m = s; m < (endExclusive ?? horizonMonths); m += step) {
      if (m >= horizonMonths) break;
      series[m] += sign * li.amount;
    }
  }
  return series;
}

function signChanges(xs: number[]): number {
  let prev = 0, changes = 0;
  for (const x of xs) {
    if (x === 0) continue;
    if (prev === 0) { prev = Math.sign(x); continue; }
    const s = Math.sign(x);
    if (s !== prev) { changes++; prev = s; }
  }
  return changes;
}

function npvMonthly(cashflows: number[], annualRatePct: number): number {
  const rm = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  return cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rm, t + 1), 0);
}

function fisherRealRate(nominalPct: number, inflationPct: number): number {
  const nominal = nominalPct / 100, infl = inflationPct / 100;
  return ( (1 + nominal) / (1 + infl) - 1 ) * 100;
}

// MIRR (annualized %) with separate finance & reinvest rates
function mirrAnnual(
  cashflows: number[],
  financeRatePct: number,
  reinvestRatePct: number
): number | null {
  const rf = Math.pow(1 + financeRatePct / 100, 1 / 12) - 1;
  const rr = Math.pow(1 + reinvestRatePct / 100, 1 / 12) - 1;
  const n = cashflows.length;
  if (n === 0) return null;

  let pvNeg = 0, fvPos = 0;
  cashflows.forEach((cf, t) => {
    if (cf < 0) pvNeg += cf / Math.pow(1 + rf, t + 1);
    else if (cf > 0) fvPos += cf * Math.pow(1 + rr, (n - (t + 1)));
  });
  if (pvNeg === 0) return null;

  const mirrMonthly = Math.pow(-fvPos / pvNeg, 1 / n) - 1;
  return (Math.pow(1 + mirrMonthly, 12) - 1) * 100;
}

export const Calculator: FinancialCalculator = {
  calculateROI(costs, benefits) {
    if (costs <= 0) return null;
    return ((benefits - costs) / costs) * 100;
  },

  calculateNPV(cashflows, discountRate, taxRate) {
    // P1 simplification: if taxRate provided, apply tax only to positive flows (benefits)
    const adjusted = typeof taxRate === "number"
      ? cashflows.map(v => (v > 0 ? v * (1 - taxRate / 100) : v))
      : cashflows;
    return npvMonthly(adjusted, discountRate);
  },

  calculateMIRR(cashflows, financeRate, reinvestRate) {
    const changes = signChanges(cashflows);
    const warnings: string[] = [];
    if (changes > 1) warnings.push("Multiple sign changes detected; IRR can be non-unique. MIRR shown.");
    const mirr = mirrAnnual(cashflows, financeRate, reinvestRate);
    if (mirr === null) warnings.push("MIRR not computable (no negative PV or empty series).");
    return { mirr, warnings };
  },

  calculatePaybackPeriod(cashflows) {
    let cum = 0;
    for (let i = 0; i < cashflows.length; i++) {
      cum += cashflows[i];
      if (cum >= 0) return { months: i, breakEvenMonth: i, discountedPayback: null };
    }
    return { months: null, breakEvenMonth: null, discountedPayback: null };
  },

  generateMonthlyCashflow(lineItems, horizon, org) {
    const series = buildSeries(lineItems, horizon, org);
    let costs = 0, benefits = 0, cum = 0, maxDrawdown = 0, peakCashFlow = 0;
    for (const v of series) {
      if (v < 0) costs += -v;
      else benefits += v;
      peakCashFlow = Math.max(peakCashFlow, v);
      cum += v;
      maxDrawdown = Math.min(maxDrawdown, cum);
    }
    const sc = signChanges(series);
    return {
      series,
      totals: { costs, benefits, net: benefits - costs },
      metadata: {
        signChanges: sc,
        hasIrregularFlow: sc > 1,
        maxDrawdown: Math.abs(maxDrawdown),
        peakCashFlow
      }
    };
  },

  computeRiskScore(prob, impact, matrix) {
    const row = { "Very Low": 0, "Low": 1, "Medium": 2, "High": 3, "Very High": 4 }[prob];
    const col = { "Very Low": 0, "Low": 1, "Medium": 2, "High": 3, "Very High": 4 }[impact];
    return matrix.values[row][col];
  }
};
