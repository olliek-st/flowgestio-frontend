export type Issue = { id: string; severity: "error" | "warn" | "info"; message: string };

export function validate(raw: any): Issue[] {
  const issues: Issue[] = [];

  // Dates must be in order
  const s = raw?.project?.dates?.start;
  const f = raw?.project?.dates?.finish;
  if (s && f && f < s) {
    issues.push({ id: "date-order", severity: "error", message: "Finish date cannot be before start date." });
  }

  // Milestone should match a scope inclusion (loose)
  const deliverables: string[] = (raw?.charter?.highLevelScope?.inclusions || []).map((x: string) => (x || "").toLowerCase());
  const milestones: any[] = raw?.charter?.milestones || [];
  for (const m of milestones) {
    const name = (m?.name || "").toLowerCase();
    if (name && !deliverables.some(d => name.includes(d) || d.includes(name))) {
      issues.push({ id: `schedule-milestone-in-scope:${name}`, severity: "warn", message: `Milestone “${m?.name}” has no matching deliverable in scope.` });
    }
  }

  // If stakeholders exist, expect a communications matrix (placeholder)
  const stakeholders = raw?.charter?.stakeholders || [];
  const comms = raw?.pmp?.communications?.matrix || [];
  if (stakeholders.length && !comms.length) {
    issues.push({ id: "stakeholder-comms", severity: "info", message: "Stakeholders exist but Communications Matrix is empty." });
  }

  return issues;
}
