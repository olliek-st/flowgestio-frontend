// src/components/validation/IssuesDrawer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Issues Drawer — fixed slide-over panel listing all validation issues.
//
// Props (strict):
//   open            boolean
//   onOpenChange    (bool) => void
//   issues          ValidationIssue[]   (already deduped — key sectionId::ruleId)
//   getSectionMeta  (sectionId) => { label: string, anchorId?: string } | null
//   onJumpToSection (sectionId: string, fieldKey?: string) => void
//   counts          { total, blocks, warns, pmi, tbs, reg }  (optional — computed if absent)
//
// Constraints:
//   • No validation engine changes
//   • No setState inside useEffect without guard
//   • No new infinite-loop sources
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import "./issuesDrawer.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "all",   label: "All",        cls: "" },
  { key: "block", label: "Blocks",     cls: "filter-block" },
  { key: "warn",  label: "Warnings",   cls: "filter-warn" },
  { key: "pmi",   label: "PMI",        cls: "filter-pmi" },
  { key: "tbs",   label: "TBS",        cls: "filter-tbs" },
  { key: "reg",   label: "Regulatory", cls: "filter-reg" },
];

const STANDARD_LABELS = {
  PMI:        { label: "PMI",        icon: "📐" },
  TBS:        { label: "TBS",        icon: "🏛" },
  REGULATORY: { label: "REG",        icon: "⚖️" },
};

const SEVERITY_LABELS = {
  BLOCK: { label: "BLOCK", icon: "🚫" },
  WARN:  { label: "WARN",  icon: "⚠️" },
  INFO:  { label: "INFO",  icon: "ℹ️" },
};

const UNMAPPED_GROUP_ID = "__unmapped__";

// ── Display-group remapping ────────────────────────────────────────────────────
// Some issues must be grouped under a virtual section for display purposes
// without altering the underlying issue data (so jump logic stays intact).
const META_GROUP_ID    = "__meta__";
const META_GROUP_LABEL = "Project";

/**
 * Returns the display-group key for an issue.
 * All other fields (sectionId, fieldKey…) on the issue object are untouched.
 */
function displayGroupId(issue) {
  const sid = issue.sectionId || "";
  // Already remapped upstream (Step3Generate metaRemappedResults)
  if (sid === META_GROUP_ID) return META_GROUP_ID;
  // Fallback: catch any legacy issue that slips through with the raw S1+title shape
  const fieldKey = (
    issue.appliesTo?.fieldKey ||
    issue.fieldKey            ||
    issue.targetFieldKey      ||
    ""
  ).toLowerCase();
  if (
    (sid === "S1" || sid === "S1_EXEC_SUMMARY") &&
    fieldKey.includes("title")
  ) {
    return META_GROUP_ID;
  }
  return sid || UNMAPPED_GROUP_ID;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Infer a human-readable domain label from the ruleId for REGULATORY issues.
 * Rules follow the naming convention: PRIVACY-BC01-*, PROC-BC01-*, etc.
 */
function inferDomain(issue) {
  if ((issue.standard || "PMI") !== "REGULATORY") return null;
  const id = (issue.ruleId || "").toUpperCase();
  if (id.startsWith("PRIVACY-"))  return "Privacy";
  if (id.startsWith("PROC-"))     return "Public Procurement";
  if (id.startsWith("SECURITY-")) return "Security";
  if (id.startsWith("FINANCIAL-"))return "Financial Regulation";
  if (id.startsWith("ENV-"))      return "Environmental";
  if (id.startsWith("ACCESS-"))   return "Accessibility";
  if (id.startsWith("SAFETY-"))   return "Safety / HSE";
  // Fallback: use the prefix up to first hyphen
  const prefix = id.split("-")[0];
  return prefix ? prefix.charAt(0) + prefix.slice(1).toLowerCase() : "Regulatory";
}

/**
 * Pick the best available "fix instruction" text from an issue.
 * Priority: remedy.label > fix > hint > recommendation > message
 */
function getFixText(issue) {
  return (
    issue.remedy?.label  ||
    issue.fix            ||
    issue.hint           ||
    issue.recommendation ||
    issue.message        ||
    ""
  );
}

/**
 * Determine whether an issue passes a given filter tab.
 */
function issuePassesFilter(issue, filter) {
  const std = issue.standard || "PMI";
  const sev = issue.severity || "INFO";
  switch (filter) {
    case "all":   return true;
    case "block": return sev === "BLOCK";
    case "warn":  return sev === "WARN";
    case "pmi":   return std === "PMI";
    case "tbs":   return std === "TBS";
    case "reg":   return std === "REGULATORY";
    default:      return true;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StandardBadge({ standard }) {
  const std = standard || "PMI";
  const meta = STANDARD_LABELS[std] || { label: std, icon: "•" };
  return (
    <span className={`issue-badge-standard std-${std}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const sev = severity || "INFO";
  const meta = SEVERITY_LABELS[sev] || { label: sev, icon: "•" };
  return (
    <span className={`issue-badge-severity sev-${sev}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

function DomainBadge({ domain }) {
  if (!domain) return null;
  return <span className="issue-domain-label">⚖️ {domain}</span>;
}

/**
 * Single issue row.
 */
function IssueRow({ issue, onJump }) {
  const std       = issue.standard || "PMI";
  const sev       = issue.severity || "INFO";
  const message   = issue.message || "";
  const fixText   = getFixText(issue);
  const fieldKey  = issue.appliesTo?.fieldKey || null;
  const refText   = issue.ref || issue.source || null;
  const domain    = inferDomain(issue);

  // Fix text differs from message only when remedy.label is available
  const showFix   = fixText && fixText !== message;

  return (
    <div className={`issue-row severity-${sev}`}>
      <div className="issue-row-inner">
        {/* Top row: badges + Go */}
        <div className="issue-top-row">
          <div className="issue-badges">
            <StandardBadge standard={std} />
            <SeverityBadge severity={sev} />
            {domain && <DomainBadge domain={domain} />}
          </div>
          <button
            type="button"
            className="issue-go-btn"
            onClick={() => onJump(issue.sectionId, fieldKey)}
            title={fieldKey ? `Go to field: ${fieldKey}` : "Go to section"}
          >
            Go →
          </button>
        </div>

        {/* Message */}
        <div className="issue-message">{message}</div>

        {/* Fix instruction (only when different from message) */}
        {showFix && (
          <div className="issue-fix">💡 {fixText}</div>
        )}

        {/* Reference pill */}
        {refText && (
          <div className="mt-1">
            <span className="issue-ref">📄 {refText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Collapsible section group.
 */
function IssueGroup({ groupId, label, issues, collapsed, onToggle, onJump, isUnmapped }) {
  if (!issues.length) return null;

  return (
    <div className={`issues-group${isUnmapped ? " unmapped" : ""}`}>
      {/* Group header */}
      <button
        type="button"
        className="issues-group-header"
        onClick={() => onToggle(groupId)}
        aria-expanded={!collapsed}
      >
        <span className="issues-group-label">{label}</span>
        <span className="issues-group-meta">
          <span className="issues-group-count">{issues.length}</span>
          <span className={`issues-chevron${collapsed ? " collapsed" : ""}`}>▼</span>
        </span>
      </button>

      {/* Issues */}
      {!collapsed && (
        <div>
          {issues.map((issue) => (
            <IssueRow
              key={`${issue.sectionId}::${issue.ruleId}`}
              issue={issue}
              onJump={onJump}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IssuesDrawer({
  open,
  onOpenChange,
  issues,
  getSectionMeta,
  onJumpToSection,
  counts: countsProp,
}) {
  // ── Local state ────────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState("all");
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  // Reset filter to "all" whenever drawer opens
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setActiveFilter("all");
    }
    prevOpenRef.current = open;
  }, [open]);

  // ── Counts ─────────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    if (countsProp) return countsProp;
    const safeIssues = Array.isArray(issues) ? issues : [];
    return {
      total:  safeIssues.length,
      blocks: safeIssues.filter((i) => i.severity === "BLOCK").length,
      warns:  safeIssues.filter((i) => i.severity === "WARN").length,
      pmi:    safeIssues.filter((i) => (i.standard || "PMI") === "PMI").length,
      tbs:    safeIssues.filter((i) => (i.standard || "PMI") === "TBS").length,
      reg:    safeIssues.filter((i) => (i.standard || "PMI") === "REGULATORY").length,
    };
  }, [issues, countsProp]);

  // ── Filter counts (for tab pills) ─────────────────────────────────────────
  const filterCounts = useMemo(() => ({
    all:   counts.total,
    block: counts.blocks,
    warn:  counts.warns,
    pmi:   counts.pmi,
    tbs:   counts.tbs,
    reg:   counts.reg,
  }), [counts]);

  // ── Filtered issues ────────────────────────────────────────────────────────
  const filteredIssues = useMemo(() => {
    const safeIssues = Array.isArray(issues) ? issues : [];
    if (activeFilter === "all") return safeIssues;
    return safeIssues.filter((i) => issuePassesFilter(i, activeFilter));
  }, [issues, activeFilter]);

  // ── Groups ─────────────────────────────────────────────────────────────────
  // Build ordered groups: known sections in schema order, then unmapped.
  const groups = useMemo(() => {
    if (!filteredIssues.length) return [];

    // Collect issues per display-group key.
    // displayGroupId() remaps S1+title → META_GROUP_ID without mutating the issue.
    const bySection = new Map();
    for (const issue of filteredIssues) {
      const gid = displayGroupId(issue);
      if (!bySection.has(gid)) bySection.set(gid, []);
      bySection.get(gid).push(issue);
    }

    // Build group objects with meta
    const result = [];

    // META group always appears first when present (project-level metadata)
    if (bySection.has(META_GROUP_ID)) {
      result.push({
        id:      META_GROUP_ID,
        label:   META_GROUP_LABEL,
        issues:  bySection.get(META_GROUP_ID),
        unknown: false,
      });
    }

    // Known sections (getSectionMeta returns non-null for known ones)
    // We iterate in insertion order of bySection (which mirrors navNormalized order).
    for (const [sid, sectionIssues] of bySection) {
      if (sid === UNMAPPED_GROUP_ID || sid === META_GROUP_ID) continue;
      const meta = getSectionMeta ? getSectionMeta(sid) : null;
      result.push({
        id:      sid,
        label:   meta?.label || sid,
        issues:  sectionIssues,
        unknown: !meta,
      });
    }

    // Unmapped group at end
    if (bySection.has(UNMAPPED_GROUP_ID)) {
      result.push({
        id:      UNMAPPED_GROUP_ID,
        label:   "Unmapped / Unrecognised Sections",
        issues:  bySection.get(UNMAPPED_GROUP_ID),
        unknown: true,
      });
    }

    return result;
  }, [filteredIssues, getSectionMeta]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleGroup = useCallback((groupId) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const handleJump = useCallback((sectionId, fieldKey) => {
    // Jump without closing — drawer stays open for progressive issue browsing.
    // Only the ✕ button (onOpenChange(false)) closes the drawer.
    if (onJumpToSection) onJumpToSection(sectionId, fieldKey || undefined);
  }, [onJumpToSection]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onOpenChange(false);
  }, [onOpenChange]);

  // ── Keyboard trap ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  // ── Render (null when closed) ──────────────────────────────────────────────
  if (!open) return null;

  const hasBlocks = counts.blocks > 0;

  return (
    <>
      {/* Drawer panel */}
      <div
        className="issues-drawer"
        role="dialog"
        aria-label="Validation Issues"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="issues-drawer-header">
          <div className="issues-drawer-title">
            <span>Validation Issues</span>
            <span className={`issues-total-badge${hasBlocks ? " has-blocks" : ""}`}>
              {counts.total}
            </span>
          </div>
          <button
            type="button"
            className="issues-close-btn"
            onClick={() => onOpenChange(false)}
            aria-label="Close issues drawer"
          >
            ✕
          </button>
        </div>

        {/* ── Filter tabs ── */}
        <div className="issues-filters" role="tablist" aria-label="Filter issues">
          {FILTERS.map(({ key, label, cls }) => {
            const cnt = filterCounts[key] ?? 0;
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`issues-filter-tab${cls ? ` ${cls}` : ""}${isActive ? " active" : ""}`}
                onClick={() => setActiveFilter(key)}
              >
                {label}
                <span className="issues-filter-count">{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* ── Issue list ── */}
        <div className="issues-scroll" role="tabpanel">
          {groups.length === 0 ? (
            <div className="issues-empty">
              <span className="issues-empty-icon">✅</span>
              <span>
                {counts.total === 0
                  ? "✓ No issues found. All sections valid."
                  : "No issues match this filter."}
              </span>
            </div>
          ) : (
            groups.map((group) => (
              <IssueGroup
                key={group.id}
                groupId={group.id}
                label={group.label}
                issues={group.issues}
                collapsed={collapsedGroups.has(group.id)}
                onToggle={handleToggleGroup}
                onJump={handleJump}
                isUnmapped={group.id === UNMAPPED_GROUP_ID || group.unknown}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
