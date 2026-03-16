// src/components/wizard/document-wizards/BC01Wizard.jsx
// PATCHED VERSION - TBS-Compliant Section Mapping

import React, { useEffect, useMemo, useState } from "react";
import Step3Generate from "../steps/Step3Generate";
import { BC01_SECTIONS } from "../../../schemas/BC01_SCHEMA.v2";

// -------------------------------------------------------
// Prefilled banner helpers (schema-driven)
// - Only show sections with meaningful (non-empty) content in initialFormData
// - Labels come from BC01_SECTIONS (no hard-coded strings)
// - Excludes auto-calculated tables (3.2, 3.3, 3.6, 3.8) and container-only headings
// -------------------------------------------------------
const EXCLUDED_REFS = new Set(["3.2", "3.3", "3.6", "3.8"]);

const isMeaningfulValue = (v) => {
  if (v == null) return false;

  if (typeof v === "string") return v.trim().length > 0;

  if (Array.isArray(v)) {
    // IMPORTANT: arrays may be pre-initialized with empty objects -> not meaningful
    return v.some(isMeaningfulValue);
  }

  
if (typeof v === "object") {
    // Accept objects like { narrative: { text: "..." } } and reject fully-empty shells.
    // Ignore common placeholder keys that can be auto-generated (id, key, uid, fieldKey, etc.)
    const IGNORE_KEYS = new Set(["id", "key", "uid", "uuid", "fieldKey", "sectionId", "ref"]);
    return Object.entries(v).some(([k, val]) => {
      if (IGNORE_KEYS.has(k)) return false;
      return isMeaningfulValue(val);
    });
  }

  // numbers/booleans/etc.
  return true;
};

const getSectionLabel = (sec) => {
  const ref = sec?.ref ? String(sec.ref).trim() : "";
  const title = sec?.title ? String(sec.title).trim() : "";
  if (ref && title) return `${ref}: ${title}`;
  return title || ref || sec?.id || "Section";
};

const getPrefilledSectionLabels = (initialFormData) => {
  if (!initialFormData) return [];

  return (BC01_SECTIONS || [])
    .filter((sec) => {
      const ref = sec?.ref ? String(sec.ref).trim() : "";
      // Exclude container headings (no user content) and auto-calculated sections
      if (sec?.hasContent === false) return false;
      if (sec?.autoCalculated) return false;
      if (ref && EXCLUDED_REFS.has(ref)) return false;
      return true;
    })
    .filter((sec) => isMeaningfulValue(initialFormData?.[sec.id]))
    .map(getSectionLabel);
};
/**
 * transformPreFilledToBC01Schema - TBS-Compliant Transformation
 * 
 * Maps universal data to BC-01 structure following TBS guidelines:
 * - Section 1: High-level executive summary (2 paragraphs max)
 * - 1.1.2: Concise problem statement (1-2 sentences)
 * - 1.1.3: Drivers for change (list)
 * - 1.1.4: Business outcomes (list)
 */
function transformPreFilledToBC01Schema(preFilled) {
  if (!preFilled) return null;
  
  console.log("[BC01Wizard] Transforming preFilled to BC01_SCHEMA format");
  
  const bc01Data = {};
  
  // ===== EXECUTIVE SUMMARY (UNNUMBERED) =====
  
  // S1_EXEC_SUMMARY: Executive Summary (empty - will be AI-generated from all sections)
  bc01Data.S1_EXEC_SUMMARY = { narrative: "" };
  
  // ===== SECTION 1: STRATEGIC CONTEXT =====
  
  // S1_0: Business Needs and Desired Outcomes (HIGH-LEVEL SUMMARY)
  // TBS: 1-2 paragraphs, outcomes-focused, no technical details
  if (preFilled.strategic?.businessNeed) {
    bc01Data.S1_0_BUS_NEEDS = {
      narrative: preFilled.strategic.businessNeed  // Already shortened by mapper
    };
  }
  
  // S1_1_2: Business Need (CONCISE PROBLEM STATEMENT)
  // TBS: 1-2 sentences, factual, specific
  if (preFilled.strategic?.problemStatement) {
    bc01Data.S1_1_2_BUSINESS_NEED = {
      narrative: preFilled.strategic.problemStatement
    };
  }
  
  // S1_1_3: Drivers for Change (LIST)
  // TBS: Internal and external drivers
  if (Array.isArray(preFilled.strategic?.drivers) && preFilled.strategic.drivers.length > 0) {
    // Format as narrative with bullets
    const driversText = preFilled.strategic.drivers
      .map((driver, idx) => {
        if (typeof driver === 'string') {
          return `${idx + 1}. ${driver}`;
        }
        return `${idx + 1}. ${driver.type || 'Driver'}: ${driver.description || driver.label || JSON.stringify(driver)}`;
      })
      .join('\n\n');
    
    bc01Data.S1_1_3_DRIVERS = {
      narrative: driversText
    };
  }
  
  // S1_1_4: Business Outcomes (LIST)
  // TBS: Expected results/benefits
  if (Array.isArray(preFilled.strategic?.outcomes) && preFilled.strategic.outcomes.length > 0) {
    const outcomesText = preFilled.strategic.outcomes
      .map((outcome, idx) => {
        if (typeof outcome === 'string') {
          return `${idx + 1}. ${outcome}`;
        }
        const desc = outcome.description || outcome.outcome || outcome.label || '';
        const metrics = Array.isArray(outcome.metrics) && outcome.metrics.length > 0
          ? ` (Metrics: ${outcome.metrics.map(m => m.name || m.label).join(', ')})`
          : '';
        return `${idx + 1}. ${desc}${metrics}`;
      })
      .join('\n\n');
    
    bc01Data.S1_1_4_OUTCOMES = {
      narrative: outcomesText
    };
  }
  
  // S1_4: Success KPIs (transformed from outcomes.metrics)
  if (preFilled.strategic?.successKPIs?.length > 0) {
    bc01Data.S1_4_KPIs = preFilled.strategic.successKPIs;
  }
  
  // ===== SECTION 2: ASSUMPTIONS =====
  
  if (preFilled.strategic?.keyAssumptions?.length > 0) {
    bc01Data.S2_ASSUMPTIONS = preFilled.strategic.keyAssumptions;
  }
  
  // ===== SECTION 3: FINANCIAL ANALYSIS =====
  
  // S3_0: Options Data - Baseline option
  if (preFilled.options?.length > 0) {
    const baseline = preFilled.options.find(o => o.isBaseline);
    
    if (baseline) {
      bc01Data.S3_0_OPTIONS_DATA = [{
        id: baseline.id,
        name: baseline.name,
        description: baseline.description,
        isBaseline: true,
        implementationComplexity: baseline.implementationComplexity,
        lineItems: baseline.lineItems || []
      }];
      
      // Mark baseline as viable
      bc01Data.S3_0_VIABLE_OPTIONS = [baseline.id];
    }
  }
  
  // S3: Financial Parameters
  if (preFilled.financial) {
    bc01Data.S3_FINANCIAL_PARAMS = {
      currency: preFilled.financial.currency || "CAD",
      horizonMonths: preFilled.financial.horizonMonths || 36,
      discountRatePct: preFilled.financial.discountRatePct || 8,
      requireNPV: preFilled.financial.requireNPV || false,
      requireMIRR: preFilled.financial.requireMIRR || false
    };
  }
  
  // ===== SECTION 4: RISKS =====
  
  if (preFilled.projectRisks?.length > 0) {
    bc01Data.S4_RISKS = preFilled.projectRisks.map(r => ({
      id: r.id,
      statement: r.statement,
      category: r.category,
      probability: r.probability,
      impact: r.impact,
      mitigation: r.mitigation,
      owner: r.owner,
      status: r.status
    }));
  }
  
  // ===== SECTION 5: MANAGEMENT =====
  
  // S5_1: Approvals
  if (preFilled.workflow?.approvals?.length > 0) {
    bc01Data.S5_1_APPROVALS = preFilled.workflow.approvals;
  }
  
  // S5: Workflow metadata
  if (preFilled.workflow) {
    bc01Data.S5_WORKFLOW = {
      currentStatus: preFilled.workflow.currentStatus || "draft",
      version: preFilled.workflow.version || "v1",
      lastModified: preFilled.workflow.lastModified,
      createdBy: preFilled.workflow.createdBy
    };
  }
  
  console.log("[BC01Wizard] Transformation complete:", bc01Data);
  console.log("[BC01Wizard] Pre-filled sections:", Object.keys(bc01Data));
  
  return bc01Data;
}

/**
 * BC01Wizard - TBS-Compliant Business Case Wizard
 */
export default function BC01Wizard({
  preFilled,
  step1Data,
  universal,
  builderKind,
  data,
  selectedDocId,
  selectedDocIds,
  onBack,
  onFinish,
  onResearch,
}) {
  const [initializedData, setInitializedData] = useState(null);

  const prefilledSectionLabels = useMemo(
    () => getPrefilledSectionLabels(initializedData),
    [initializedData]
  );


  useEffect(() => {
    if (initializedData !== null) return;

    // Priority 1: preFilled (new universal system)
    if (preFilled) {
      console.log("[BC01Wizard] Initializing from preFilled mapping");
      const transformed = transformPreFilledToBC01Schema(preFilled);
      setInitializedData(transformed);
      return;
    }

    // Priority 2: data (legacy)
    if (data && !preFilled) {
      console.log("[BC01Wizard] Initializing from legacy step3Data");
      setInitializedData(data);
      return;
    }

    // Priority 3: empty (defaults)
    console.log("[BC01Wizard] Initializing empty");
    setInitializedData({});
  }, [preFilled, data, initializedData]);

  // Wait for initialization
  if (initializedData === null && preFilled) {
    return null;
  }
	const hasOptions30 = prefilledSectionLabels?.some(
	  (label) => typeof label === "string" && label.trim().startsWith("3.0")
	);
return (
    <div className="space-y-4">
      {/* TBS Pre-fill Banner */}
      {preFilled && prefilledSectionLabels.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <span className="text-lg">✓</span>
            <span className="text-sm font-semibold">
              Pre-filled from Step 1 (TBS-Compliant)
            </span>
          </div>
          <p className="text-xs text-blue-700 mb-3">
            Sections automatically initialized according to TBS standards. 
            Section 1 = executive summary, 1.1.2 = concise problem statement.
          </p>
          
          {/* Detail of pre-filled sections */}
          {initializedData && prefilledSectionLabels.length > 0 && (
            <div className="text-xs text-blue-600 bg-blue-100 rounded-lg p-3">
              <div className="font-medium mb-1">Pre-filled sections:</div>
              <ul className="ml-4 space-y-1 list-disc">
                {prefilledSectionLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
			  {/* Auto-generated tables note (from 3.0) */}
			  {hasOptions30 && (
			  <div className="mt-2 text-[11px] text-blue-700">
				<span className="font-medium">Note:</span> Sections{" "}
				<span className="font-mono">3.2 Costs</span>,{" "}
				<span className="font-mono">3.3 Cost-Benefit Analysis</span>,{" "}
				<span className="font-mono">3.6 Benchmark</span> and{" "}
				<span className="font-mono">3.8 Advantages &amp; Disadvantages</span>{" "}
				are auto-generated from <span className="font-mono">3.0</span>. They currently
				contain only the <span className="font-medium">Status Quo</span> option (no
				financial data), except default evaluation criteria. They will update when you
				complete <span className="font-mono">3.0 Options Data Entry</span>.
			  </div>
			  )}
			 </div>
          )}
        </div>
      )}

      {/* BC-01 Wizard (existing Step3Generate) */}
      <Step3Generate
        builderKind={builderKind}
        data={step1Data}
        step1Data={step1Data}
        initialFormData={initializedData}
        selectedDocId={selectedDocId}
        selectedDocIds={selectedDocIds}
        onBack={onBack}
        onNext={onFinish}
        onResearch={onResearch}
      />
    </div>
  );
}
