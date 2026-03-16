import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * OptionsDataEntry (Hybrid Form + JSON)
 * - Form mode (default): repeater UI
 * - JSON mode: textarea + apply/format
 * - Persists as JSON string into section data.optionsJson (caller responsibility)
 *
 * Expected stored shape in optionsJson:
 * [
 *   {
 *     "id": "opt_xxx",
 *     "name": "Cloud Migration",
 *     "description": "…",
 *     "financialInputs": { "capex": 0, "opexAnnual": 0, "benefitsAnnual": 0 }
 *   }
 * ]
 */
export default function OptionsDataEntry({
  value = "[]", // JSON string from data.optionsJson
  onChange, // (jsonString) => void
}) {
  const [mode, setMode] = useState("form"); // "form" | "json"
  const [options, setOptions] = useState([]);
  const [jsonText, setJsonText] = useState(value || "[]");
  const [jsonError, setJsonError] = useState(null);

  const lastExternalValueRef = useRef(value);

  const safeParse = (raw) => {
    if (!raw || typeof raw !== "string") return { ok: true, data: [] };
    try {
      const parsed = JSON.parse(raw);
      // Accept either array or { options: [...] }
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.options) ? parsed.options : [];
      return { ok: true, data: normalizeOptions(arr) };
    } catch (e) {
      return { ok: false, error: e?.message || "Invalid JSON", data: null };
    }
  };

  const normalizeOptions = (arr) => {
    const safeArr = Array.isArray(arr) ? arr : [];
    return safeArr.map((o, idx) => {
      const id =
        (typeof o?.id === "string" && o.id.trim()) ||
        `opt_${Date.now()}_${Math.random().toString(16).slice(2)}_${idx}`;
      const name =
        (typeof o?.name === "string" && o.name) ||
        (typeof o?.title === "string" && o.title) ||
        (typeof o?.label === "string" && o.label) ||
        "";
      const description = typeof o?.description === "string" ? o.description : "";
      const fin = o?.financialInputs && typeof o.financialInputs === "object" ? o.financialInputs : {};
      const capex = toNumberOrZero(fin?.capex);
      const opexAnnual = toNumberOrZero(fin?.opexAnnual);
      const benefitsAnnual = toNumberOrZero(fin?.benefitsAnnual);

      return {
        id,
        name,
        description,
        financialInputs: { capex, opexAnnual, benefitsAnnual },
      };
    });
  };

  const toNumberOrZero = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const serialize = (arr) => JSON.stringify(arr, null, 2);

  // Init + keep in sync when parent value changes (external update)
  useEffect(() => {
    const external = value ?? "[]";
    if (external === lastExternalValueRef.current) return;

    lastExternalValueRef.current = external;
    setJsonText(external);

    const parsed = safeParse(external);
    if (parsed.ok) {
      setJsonError(null);
      setOptions(parsed.data);
    } else {
      setJsonError(parsed.error);
      // keep previous form options, but JSON shows the external content
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // First mount parse
  useEffect(() => {
    const initial = value ?? "[]";
    const parsed = safeParse(initial);
    if (parsed.ok) {
      setOptions(parsed.data);
      setJsonError(null);
      setJsonText(serialize(parsed.data));
    } else {
      setOptions([]);
      setJsonError(parsed.error);
      setJsonText(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (nextOptions) => {
    const jsonStr = serialize(nextOptions);
    lastExternalValueRef.current = jsonStr;
    setJsonText(jsonStr);
    setJsonError(null);
    onChange?.(jsonStr);
  };

  const addOption = () => {
    const newOpt = {
      id: `opt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: "",
      description: "",
      financialInputs: { capex: 0, opexAnnual: 0, benefitsAnnual: 0 },
    };
    const next = [...options, newOpt];
    setOptions(next);
    emit(next);
  };

  const removeOption = (index) => {
    const next = options.filter((_, i) => i !== index);
    setOptions(next);
    emit(next);
  };

  const updateOption = (index, patch) => {
    const next = options.map((o, i) => (i === index ? { ...o, ...patch } : o));
    setOptions(next);
    emit(next);
  };

  const updateFinancial = (index, finPatch) => {
    const next = options.map((o, i) => {
      if (i !== index) return o;
      return {
        ...o,
        financialInputs: {
          capex: toNumberOrZero(o?.financialInputs?.capex),
          opexAnnual: toNumberOrZero(o?.financialInputs?.opexAnnual),
          benefitsAnnual: toNumberOrZero(o?.financialInputs?.benefitsAnnual),
          ...Object.fromEntries(
            Object.entries(finPatch).map(([k, v]) => [k, toNumberOrZero(v)])
          ),
        },
      };
    });
    setOptions(next);
    emit(next);
  };

  const applyJson = () => {
    const parsed = safeParse(jsonText);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    setJsonError(null);
    setOptions(parsed.data);
    emit(parsed.data);
  };

  const formatJson = () => {
    const parsed = safeParse(jsonText);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    setJsonError(null);
    setJsonText(serialize(parsed.data));
  };

  const headerHint = useMemo(() => {
    return mode === "form"
      ? "Mode Form (recommandé) : ajoutez vos options via une saisie guidée."
      : "Mode JSON : pour power users/debug. Cliquez sur « Appliquer JSON » pour valider.";
  }, [mode]);

  return (
    <div className="mt-3">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">Options Data Entry</div>
          <div className="text-xs text-slate-600">{headerHint}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("form")}
            className={`px-3 py-1 rounded-md text-xs border ${
              mode === "form"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Form
          </button>
          <button
            type="button"
            onClick={() => setMode("json")}
            className={`px-3 py-1 rounded-md text-xs border ${
              mode === "json"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            JSON
          </button>
        </div>
      </div>

      {mode === "form" && (
        <div className="space-y-3">
          {options.length === 0 ? (
            <div className="p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50">
              <div className="text-sm font-medium text-slate-800">Aucune option définie</div>
              <div className="text-xs text-slate-600 mt-1">
                Cliquez sur « Add option » pour commencer.
              </div>
            </div>
          ) : (
            options.map((opt, idx) => (
              <div key={opt.id || idx} className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      Option {idx + 1}{opt?.name ? ` — ${opt.name}` : ""}
                    </div>
                    <div className="text-xs text-slate-500">id: {opt.id}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="px-3 py-1 rounded-md text-xs border border-rose-300 text-rose-700 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                    <input
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      value={opt.name || ""}
                      onChange={(e) => updateOption(idx, { name: e.target.value })}
                      placeholder="e.g., Cloud Migration"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      value={opt.description || ""}
                      onChange={(e) => updateOption(idx, { description: e.target.value })}
                      placeholder="Short description of the option"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-800 mb-2">Financial inputs</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">CAPEX</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={opt?.financialInputs?.capex ?? 0}
                        onChange={(e) => updateFinancial(idx, { capex: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        OPEX / year
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={opt?.financialInputs?.opexAnnual ?? 0}
                        onChange={(e) => updateFinancial(idx, { opexAnnual: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Benefits / year
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={opt?.financialInputs?.benefitsAnnual ?? 0}
                        onChange={(e) => updateFinancial(idx, { benefitsAnnual: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addOption}
              className="px-4 py-2 rounded-lg text-sm bg-slate-900 text-white hover:bg-slate-800"
            >
              + Add option
            </button>

            <div className="text-xs text-slate-500">
              (Les changements sont sauvegardés dans <code className="px-1 py-0.5 bg-slate-100 rounded">optionsJson</code> en JSON.)
            </div>
          </div>
        </div>
      )}

      {mode === "json" && (
        <div className="space-y-2">
          <textarea
            className="w-full min-h-[260px] px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />

          {jsonError && (
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs">
              <div className="font-semibold">JSON error</div>
              <div className="mt-1">{jsonError}</div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyJson}
              className="px-4 py-2 rounded-lg text-sm bg-slate-900 text-white hover:bg-slate-800"
            >
              Apply JSON
            </button>

            <button
              type="button"
              onClick={formatJson}
              className="px-4 py-2 rounded-lg text-sm border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Format
            </button>

            <button
              type="button"
              onClick={() => setJsonText(serialize(options))}
              className="px-4 py-2 rounded-lg text-sm border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Format from Form
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Astuce : si tu colles un JSON invalide, rien ne casse — l’erreur s’affiche, et le Form reste intact.
          </div>
        </div>
      )}
    </div>
  );
}
