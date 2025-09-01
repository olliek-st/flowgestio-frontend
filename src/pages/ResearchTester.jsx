import React, { useState } from "react";

/* Tiny inline spinner (no CSS/deps) */
function Spinner({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Loading"
      style={{ display: "inline-block", verticalAlign: "text-bottom" }}
    >
      <circle cx="12" cy="12" r="10" stroke="#999" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M12 2 a10 10 0 0 1 10 10" stroke="#666" strokeWidth="4" fill="none" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

export default function ResearchTester() {
  // ---- Form inputs that match API schema exactly
  const [topic, setTopic] = useState("Stakeholder register essentials");
  const [industry, setIndustry] = useState("healthcare");
  const [region, setRegion] = useState("Ontario");
  const [recencyDays, setRecencyDays] = useState(1095);
  const [domainFilter, setDomainFilter] = useState("pmi.org, projectmanagement.com");

  // ---- UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function runResearch(e) {
    e?.preventDefault?.();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Build API URL
      const API = (import.meta.env.VITE_API_BASE || "").trim();
      const url = API ? `${API}/api/research` : "/api/research";

      // Build payload matching API schema exactly
      const payload = {
        topic: topic.trim(),
        industry: industry.trim() || undefined,
        region: region.trim() || undefined,
        recencyDays: Number(recencyDays) || undefined,
        domains: domainFilter 
          ? domainFilter.split(',').map(d => d.trim()).filter(Boolean) 
          : undefined
      };

      // Remove undefined values to keep payload clean
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log("Sending payload:", payload);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 500)}`);
      }

      const json = await res.json();

      // Validate response structure
      if (typeof json.summary !== "string" || !Array.isArray(json.facts)) {
        throw new Error("Invalid response format from API");
      }

      setResult(json);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      maxWidth: 820, 
      margin: "40px auto", 
      padding: "0 16px", 
      fontFamily: "system-ui, sans-serif" 
    }}>
      <h1>FlowGestio — Research Tester</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Tests the <code>/api/research</code> endpoint with PMI-compliant research integration.
      </p>

      <form onSubmit={runResearch} style={{ display: "grid", gap: 16, marginTop: 16 }}>
        
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Topic *
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
            placeholder="e.g., Risk management planning"
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px"
            }}
            required
          />
          <small style={{ color: "#666" }}>Main research topic (required)</small>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Industry
          </label>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={loading}
            placeholder="e.g., healthcare, construction, IT"
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px"
            }}
          />
          <small style={{ color: "#666" }}>Industry context for relevant results</small>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Region
          </label>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={loading}
            placeholder="e.g., Ontario, Canada, United States"
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px"
            }}
          />
          <small style={{ color: "#666" }}>Geographic context for regional compliance</small>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Recency (days)
          </label>
          <input
            type="number"
            min={1}
            max={3650}
            value={recencyDays}
            onChange={(e) => setRecencyDays(Number(e.target.value || 1))}
            disabled={loading}
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px"
            }}
          />
          <small style={{ color: "#666" }}>How recent sources should be (1-3650 days)</small>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Domain filter (comma-separated)
          </label>
          <input
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            disabled={loading}
            placeholder="pmi.org, projectmanagement.com"
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px"
            }}
          />
          <small style={{ color: "#666" }}>Restrict sources to specific domains (leave empty for defaults)</small>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "1px solid #007acc",
              background: loading ? "#f0f0f0" : "#007acc",
              color: loading ? "#999" : "white",
              cursor: (loading || !topic.trim()) ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: "14px",
              fontWeight: 600
            }}
          >
            {loading ? (
              <>
                <Spinner />
                <span>Researching…</span>
              </>
            ) : (
              "Run Research"
            )}
          </button>

          <a href="/" style={{ color: "#007acc", textDecoration: "none" }}>← Home</a>
        </div>
      </form>

      {/* Screen-reader live region */}
      <div aria-live="polite" style={{ height: 0, overflow: "hidden" }}>
        {loading ? "Running research…" : ""}
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          marginTop: 24,
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: 8,
          padding: 16
        }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#dc2626", fontSize: "16px" }}>
            Research Error
          </h3>
          <pre style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            color: "#991b1b",
            fontSize: "14px",
            fontFamily: "monospace"
          }}>
            {error}
          </pre>
        </div>
      )}

      {/* Results display */}
      {result && (
        <div style={{ marginTop: 32 }}>
          <div style={{
            background: "#f0f9ff",
            border: "1px solid #0ea5e9",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24
          }}>
            <h2 style={{ margin: "0 0 12px 0", color: "#0369a1", fontSize: "18px" }}>
              Research Summary
            </h2>
            <p style={{ 
              margin: 0, 
              lineHeight: 1.6, 
              color: "#0c4a6e",
              whiteSpace: "pre-wrap" 
            }}>
              {result.summary || "No summary available"}
            </p>
          </div>

          <h3 style={{ 
            color: "#374151", 
            fontSize: "18px", 
            marginBottom: 16,
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: 8
          }}>
            Research Facts ({Array.isArray(result.facts) ? result.facts.length : 0})
          </h3>
          
          {result.facts && result.facts.length > 0 ? (
            <div style={{ display: "grid", gap: 16 }}>
              {result.facts.map((fact, index) => (
                <div key={index} style={{
                  background: "#fefefe",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 16,
                  position: "relative"
                }}>
                  {/* Confidence badge */}
                  {typeof fact.confidence === "number" && (
                    <div style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: fact.confidence >= 0.8 ? "#10b981" : fact.confidence >= 0.5 ? "#f59e0b" : "#ef4444",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: "12px",
                      fontWeight: 600
                    }}>
                      {Math.round(fact.confidence * 100)}% confidence
                    </div>
                  )}

                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ color: "#111827" }}>Claim:</strong>{" "}
                    <span style={{ color: "#374151" }}>{fact.claim || "—"}</span>
                  </div>
                  
                  {fact.source && (
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#111827" }}>Source:</strong>{" "}
                      <span style={{ 
                        color: "#1d4ed8",
                        background: "#eff6ff",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: "13px"
                      }}>
                        {fact.source}
                      </span>
                    </div>
                  )}
                  
                  {fact.published && (
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#111827" }}>Published:</strong>{" "}
                      <span style={{ color: "#6b7280" }}>{fact.published}</span>
                    </div>
                  )}
                  
                  {fact.url && (
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#111827" }}>URL:</strong>{" "}
                      <a 
                        href={fact.url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                          color: "#1d4ed8", 
                          wordBreak: "break-all",
                          textDecoration: "none"
                        }}
                      >
                        {fact.url}
                      </a>
                    </div>
                  )}
                  
                  {fact.snippet && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 12, 
                      background: "#f9fafb",
                      borderLeft: "3px solid #d1d5db",
                      fontSize: "14px",
                      color: "#4b5563",
                      fontStyle: "italic"
                    }}>
                      <strong>Snippet:</strong> {fact.snippet}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#6b7280", fontStyle: "italic" }}>
              No research facts available
            </p>
          )}

          {/* Notes section */}
          {result.notes && result.notes.length > 0 && (
            <div style={{ 
              marginTop: 24,
              background: "#fffbeb",
              border: "1px solid #fbbf24",
              borderRadius: 8,
              padding: 16
            }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#92400e" }}>Research Notes</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.notes.map((note, index) => (
                  <li key={index} style={{ color: "#a16207", fontSize: "14px" }}>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Diagnostics section */}
          {result._diagnostics && (
            <details style={{ marginTop: 24 }}>
              <summary style={{ 
                cursor: "pointer", 
                fontWeight: 600,
                color: "#374151",
                padding: 8,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 6
              }}>
                Technical Diagnostics
              </summary>
              <pre style={{
                marginTop: 8,
                whiteSpace: "pre-wrap",
                background: "#1f2937",
                color: "#f9fafb",
                padding: 16,
                borderRadius: 8,
                fontSize: "12px",
                overflow: "auto"
              }}>
                {JSON.stringify(result._diagnostics, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}