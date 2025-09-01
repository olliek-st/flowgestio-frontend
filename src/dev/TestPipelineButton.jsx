import React, { useState } from "react";
import { documentBuilder } from "../services/documentBuilder";

export default function TestPipelineButton() {
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function runTest() {
    setLoading(true);
    setErr("");
    setOut(null);
    try {
      const result = await documentBuilder.buildDocument(
        "business-case",
        {
          "business-need": { problem: "Manual processes causing delays" },
          "executive-summary": { budget: "$50k", timeline: "6 months" },
        },
        {
          industry: "healthcare",
          region: "Canada",
        }
      );

      // Console logs (as requested)
      console.log("Sections:", result.sections.length);
      console.log("Citations:", result.metadata.totalCitations);
      console.log("PMI Compliant:", result.metadata.pmiCompliant);

      setOut({
        sections: result.sections.length,
        citations: result.metadata.totalCitations,
        pmiCompliant: result.metadata.pmiCompliant,
        title: result.title,
      });
    } catch (e) {
      setErr(e.message || "Pipeline test failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-2xl p-4">
      <button
        onClick={runTest}
        disabled={loading}
        className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
      >
        {loading ? "Running…" : "Run pipeline test"}
      </button>

      {err && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          {err}
        </div>
      )}

      {out && (
        <div className="mt-3 text-sm text-slate-700">
          <div><strong>Document:</strong> {out.title}</div>
          <div><strong>Sections:</strong> {out.sections}</div>
          <div><strong>Citations:</strong> {out.citations}</div>
          <div><strong>PMI Compliant:</strong> {String(out.pmiCompliant)}</div>
        </div>
      )}
    </div>
  );
}
