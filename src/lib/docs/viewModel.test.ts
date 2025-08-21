import { describe, it, expect } from "vitest";
import { buildNumbered } from "./viewModel";
import type { SectionNode } from "./sectionTree";

describe("ViewModel + prune + number", () => {
  it("filters empty rows and hides empty sections", () => {
    const raw = {
      project: { name: "Demo", dates: { start: "2025-09-01", finish: "2026-02-28" } },
      charter: {
        businessCase: "Why this matters.",
        objectives: [
          { id: "O1", text: "Ship MVP", metric: "features", target: "core set" },      // valid
          { id: "O2", text: "   ", metric: "", target: "" },                           // invalid → filtered out
        ],
        highLevelScope: { inclusions: ["Wizard", "Export"], exclusions: ["Portfolio"] },
        successCriteria: ["Ref O1 achieves MVP"],
        assumptions: [],
        constraints: ["Budget 60k"],
        milestones: [
          { id: "M1", name: "Kickoff", date: "2025-09-01" },                           // valid
          { id: "M2", name: "   ", date: "" },                                         // invalid → filtered
        ],
        initialRisks: [
          { id: "R1", cause: "Renderer quirks", event: "PDF mismatch", impactDesc: "Rework" }, // valid
          { id: "R2", cause: "", event: "", impactDesc: "" },                                  // invalid → filtered
        ],
        stakeholders: [
          { id: "S1", name: "Sponsor A", role: "Sponsor", interest: "H", influence: "H" },     // valid
          { id: "S2", name: "   ", role: "", interest: "L", influence: "L" },                  // invalid → filtered
        ],
      },
    };

    const tree: SectionNode = {
      id: "ROOT", title: "Doc", include: true, children: [
        { id: "CH-EXEC", title: "Executive Summary", include: true },
        { id: "CH-CHARTER", title: "Project Charter", include: true, children: [
          { id: "CH-ASSUMPTIONS", title: "Assumptions & Constraints", include: true },
          { id: "CH-MILESTONES", title: "Milestones", include: true },
          { id: "CH-RISKS", title: "Initial Risks", include: true },
          { id: "CH-STAKEHOLDERS", title: "Stakeholders", include: true },
        ]},
      ]
    };

    const { vm, pruned, index } = buildNumbered(raw as any, tree);

    // only 1 objective survived
    expect(vm.charter.objectives.length).toBe(1);
    // milestones filtered down to 1
    expect(vm.charter.milestones.length).toBe(1);
    // risks filtered down to 1
    expect(vm.charter.risks.length).toBe(1);
    // stakeholders filtered down to 1
    expect(vm.charter.stakeholders.length).toBe(1);

    // pruned tree keeps Charter children that still have content
    // (Assumptions has only constraints -> still content; ok)
    expect(index.byId["CH-CHARTER"].number).toBe("1.2");
  });
});
