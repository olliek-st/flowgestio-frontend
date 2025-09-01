// src/components/research/ResearchInsight.jsx
import React, { useEffect, useState } from "react";
import { runResearch } from "../../services/researchClient";
import FactList from "./FactList";

export default function ResearchInsight({ topic, context }) {
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    async function go() {
      if (!topic) return;
      setLoading(true); setErr("");
      try {
        const res = await runResearch({
          topic,
          industry: context?.industry,
          region: context?.region,
        });
        if (!cancel) setResearch(res);
      } catch (e) {
        if (!cancel) setErr(e.message || "Research failed.");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    go();
    return () => { cancel = true; };
    // re-run when topic/industry/region change
  }, [topic, context?.industry, context?.region]);

  return (
    <div>
      {loading && <div className="text-sm text-slate-600 mb-2">Fetching sources and verifying citations…</div>}
      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 mb-3">{err}</div>}
      {research?.summary && (
        <div className="mb-3 border rounded-2xl p-4 bg-slate-50">
          <h4 className="text-sm font-semibold mb-1">Summary</h4>
          <p className="text-sm">{research.summary}</p>
        </div>
      )}
      <FactList facts={research?.facts || []} />
      {research?.notes?.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer">Notes / caveats</summary>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            {research.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}