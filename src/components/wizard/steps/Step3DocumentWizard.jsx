// src/components/wizard/steps/Step3DocumentWizard.jsx

import React, { useMemo } from "react";
import { mappingEngine } from "../../../lib/mapping/MappingEngine";
import * as BC01SchemaModule from "../../../schemas/BC01_SCHEMA.v2";
import BC01Wizard from "../document-wizards/BC01Wizard";

// Schema resolution (supports various export shapes)
const BC01_SCHEMA =
  BC01SchemaModule.BC01_SCHEMA ??
  BC01SchemaModule.BC01_SCHEMA_V2 ??
  BC01SchemaModule.schema ??
  (BC01SchemaModule.BC01_SECTIONS ? { sections: BC01SchemaModule.BC01_SECTIONS } : undefined) ??
  BC01SchemaModule.default ??
  { sections: [] };


// sections calculées à exclure du bandeau
const EXCLUDED_SECTION_IDS = new Set([
  "S3_2", "S3_3", "S3_6", "S3_8"
]);

const isNonEmptyValue = (v) => {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") {
    return Object.values(v).some(isNonEmptyValue);
  }
  return true;
};

const getPrefilledSectionLabels = (initialFormData) => {
  if (!initialFormData) return [];

  return BC01_SCHEMA.sections
    .filter(sec => !EXCLUDED_SECTION_IDS.has(sec.id))
    .filter(sec => isNonEmptyValue(initialFormData[sec.id]))
    .map(sec => sec.label);
};

/**
 * Step3DocumentWizard
 * -------------------
 * Routeur modulaire 100% compatible avec WizardV2.jsx
 * 
 * Responsabilités:
 * 1. Applique le mapping universel → document-specific (si universal data existe)
 * 2. Route vers le bon wizard selon selectedDocId
 * 3. Backward compatible: fonctionne même sans universal data
 */
export default function Step3DocumentWizard({
  builderKind,
  step1Data,
  selectedDocId,
  selectedDocIds,
  onBack,
  onNext,
  onResearch,
}) {
  console.log("[Step3DocumentWizard] Props:", {
    builderKind,
    selectedDocId,
    hasUniversal: !!step1Data?.universal,
    hasInputs: !!step1Data?.inputs,
  });

  // 🗺️ Appliquer le mapping si universal data présente
  const preFilled = useMemo(() => {
    if (!step1Data?.universal) {
      console.log("[Step3DocumentWizard] No universal data - legacy mode");
      return null;
    }

    try {
      console.log(`[Step3DocumentWizard] Mapping: universal → ${selectedDocId}`);
      const mapped = mappingEngine.applyMapping(step1Data.universal, selectedDocId);
      
      if (mapped) {
        console.log("[Step3DocumentWizard] ✅ Mapping successful");
        return mapped;
      }
      
      console.warn(`[Step3DocumentWizard] No mapper for ${selectedDocId}`);
      return null;
    } catch (error) {
      console.error("[Step3DocumentWizard] ❌ Mapping error:", error);
      return null;
    }
  }, [step1Data?.universal, selectedDocId]);

  // 🎯 Router vers wizard
  if (selectedDocId === "BC-01" || selectedDocId === "BC-01-P1") {
    return (
      <BC01Wizard
        preFilled={preFilled}
        step1Data={step1Data}
        universal={step1Data?.universal}
        builderKind={builderKind}
        data={step1Data}
        selectedDocId={selectedDocId}
        selectedDocIds={selectedDocIds}
        onBack={onBack}
        onFinish={onNext}
        onResearch={onResearch}
      />
    );
  }

  // Autres documents (coming soon)
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🚧</span>
        <div>
          <h3 className="font-semibold text-amber-900">
            {selectedDocId} - Coming Soon
          </h3>
          <p className="mt-2 text-sm text-amber-800">
            Ce type de document n'est pas encore implémenté.
          </p>
          <button
            onClick={onBack}
            className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
          >
            ← Retour
          </button>
        </div>
      </div>
    </div>
  );
}