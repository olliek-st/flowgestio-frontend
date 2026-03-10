// src/components/wizard/FieldRenderer.jsx
import React, { useMemo, useState } from "react";

/**
 * FieldRenderer (PURE)
 * - Rend uniquement les champs.
 * - DraftWithAI déclenche onAIDraft(...) MAIS n'écrit jamais dans le champ.
 * - Le staging + Apply est géré par SectionCard / Step3Generate.
 */
export default function FieldRenderer({
  fields,
  data,
  onChange,
  sectionId,
  validationResults,
  onAIDraft,
  fieldSeverityMap = {}, // { "sectionId::fieldKey": "OK"|"WARN"|"BLOCK" }
}) {
  const safeFields = Array.isArray(fields) ? fields : [];

  const issues = useMemo(() => {
    if (Array.isArray(validationResults)) return validationResults;
    if (validationResults && Array.isArray(validationResults.issues)) return validationResults.issues;
    return [];
  }, [validationResults]);

  const getFieldError = (fieldKey) => {
    if (!issues.length) return "";
    const match = issues.find(
      (it) =>
        (it.sectionId === sectionId || !it.sectionId) &&
        (it.appliesTo?.fieldKey === fieldKey || it.targetFieldKey === fieldKey)
    );
    if (!match) return "";

    const block = issues.find(
      (it) =>
        (it.sectionId === sectionId || !it.sectionId) &&
        (it.appliesTo?.fieldKey === fieldKey || it.targetFieldKey === fieldKey) &&
        it.severity === "BLOCK"
    );
    const warn = issues.find(
      (it) =>
        (it.sectionId === sectionId || !it.sectionId) &&
        (it.appliesTo?.fieldKey === fieldKey || it.targetFieldKey === fieldKey) &&
        it.severity === "WARN"
    );

    return (block || warn || match)?.message || "";
  };

  if (!Array.isArray(fields)) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
        Invalid fields configuration (fields is missing or not an array).
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {safeFields
        .filter((f) => f?.uiType !== "hidden")
        .map((field, idx) => {
          const fieldKey = field?.key ?? `__missing_key_${idx}`;
          const raw = data?.[fieldKey];
		  const value =
			typeof raw === "string"
			 ? raw
			 : typeof raw?.narrative === "string"
			 ? raw.narrative
			 : "";
          const error = field?.key ? getFieldError(field.key) : "Field definition is missing a key.";

          const fieldSeverity =
            fieldSeverityMap[`${sectionId}::${fieldKey}`] ?? "OK";

          return (
            <FieldControl
              key={String(fieldKey)}
              field={field}
              value={value}
              error={error}
              onChange={(newValue) => onChange?.(field.key, newValue)}
              onAIDraft={onAIDraft}
              sectionId={sectionId}
              fieldSeverity={fieldSeverity}
            />
          );
        })}
    </div>
  );
}

function FieldControl({ field, value, onChange, error, onAIDraft, sectionId, fieldSeverity = "OK" }) {
  const {
    key,
    label,
    type,
    required,
    placeholder,
    help,
    helpText,
    maxLen,
    options,
  } = field || {};

  const helpMsg = help ?? helpText;

  const isLongText = useMemo(() => {
    // Only show AI Draft button on textarea / narrative fields.
    // Exclude toggles, selects, weights, and json_editor fields.
    const uiType = field?.uiType;
    if (type === "toggle" || uiType === "select" || uiType === "weight" || uiType === "hidden" || uiType === "json_editor") return false;
    const k = String(key || "").toLowerCase();
    return type === "textarea" || k.includes("narrative") || k.endsWith("_text");
  }, [type, key, field?.uiType]);

  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleDraft = async () => {
    if (!onAIDraft || !key) return;
    try {
      setAiError("");
      setAiDrafting(true);
      // IMPORTANT: no mutation here; this only requests a draft into draftBuffer
      await onAIDraft({ sectionId, fieldKey: key, field });
    } catch (e) {
      setAiError(e?.message || "DraftWithAI failed.");
    } finally {
      setAiDrafting(false);
    }
  };

  return (
    <div id={`${sectionId}__${key}`} className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">
            {isLongText
              ? (label && label !== key ? label : "Content")
              : (label || key)
            }{" "}
            {required ? <span className="text-red-600">*</span> : null}
          </div>
          {helpMsg ? <div className="text-xs text-gray-500 mt-0.5">{helpMsg}</div> : null}
          {isLongText && !value && (
            <div className="text-xs text-gray-400 mt-0.5">Draft with AI → edit → Apply</div>
          )}
        </div>

        {onAIDraft && isLongText && (
          <button
            type="button"
            onClick={handleDraft}
            disabled={aiDrafting}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              aiDrafting
                ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed"
                : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
            }`}
            title="Generate a draft (staged). Use Apply to update the preview."
          >
            {aiDrafting ? "Drafting..." : "Draft with AI"}
          </button>
        )}
      </div>

      {aiError ? (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {aiError}
        </div>
      ) : null}

      {renderInput({ field, value, onChange, placeholder, maxLen, options, fieldSeverity })}

      {error ? (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function renderInput({ field, value, onChange, placeholder, maxLen, options, fieldSeverity = "OK" }) {
  const type = field?.type;
  const uiType = field?.uiType;

  // Severity-driven input classes (border + bg + focus ring).
  // Accessibility: color is supplemental — Drawer error text is the primary signal.
  const severityInputClass =
    fieldSeverity === "BLOCK"
      ? "border-red-300 bg-red-50 focus:ring-red-200"
      : fieldSeverity === "WARN"
      ? "border-amber-300 bg-amber-50 focus:ring-amber-200"
      : "border-gray-300 focus:ring-blue-200";

  // ── hidden: never render, but value is preserved in data by FieldRenderer ──
  if (uiType === "hidden") return null;

  // ── textarea ──────────────────────────────────────────────────────────────
  if (type === "textarea") {
    return (
      <textarea
        className={`w-full min-h-[140px] rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 ${severityInputClass}`}
        value={typeof value === "string" ? value : value ?? ""}
        placeholder={placeholder || "Write here..."}
        maxLength={maxLen || undefined}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  // ── toggle (boolean switch) — no severity tint (toggle has its own states) ─
  if (type === "toggle") {
    const checked = value === true || value === "true";
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    );
  }

  // ── select (uiType or type) ───────────────────────────────────────────────
  if (type === "select" || uiType === "select") {
    return (
      <select
        className={`w-full rounded-lg border p-2 text-sm bg-white focus:outline-none focus:ring-2 ${severityInputClass}`}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">Select...</option>
        {(Array.isArray(options) ? options : []).map((opt) => {
          const v = typeof opt === "string" ? opt : opt?.value;
          const l = typeof opt === "string" ? opt : opt?.label ?? opt?.value;
          return (
            <option key={String(v)} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    );
  }

  // ── weight: numeric input with soft sum hint ──────────────────────────────
  if (uiType === "weight") {
    const numVal = value === "" || value == null ? "" : value;
    return (
      <input
        className={`w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 ${severityInputClass}`}
        type="number"
        step="0.01"
        min="0"
        max="1"
        value={numVal}
        placeholder="0.00–1.00"
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  // ── json_editor: not handled here — dispatched by SectionCard via uiType ──
  // (OptionsDataEntry is rendered at the SectionCard level, not inside FieldRenderer)
  if (uiType === "json_editor") return null;

  // ── default: text / number input ─────────────────────────────────────────
  const inputType = type === "number" ? "number" : "text";
  return (
    <input
      className={`w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 ${severityInputClass}`}
      type={inputType}
      value={value ?? ""}
      placeholder={placeholder || ""}
      maxLength={maxLen || undefined}
      onChange={(e) => onChange?.(inputType === "number" ? Number(e.target.value) : e.target.value)}
    />
  );
}
