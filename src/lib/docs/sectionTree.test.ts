import { describe, it, expect } from "vitest";
import { pruneTree, numberTree, xrefSection, SectionNode } from "./sectionTree";

describe("SectionTree & Numbering", () => {
  it("numbers and xrefs correctly when some sections are disabled", () => {
    const tree: SectionNode = {
      id: "ROOT",
      title: "Root Doc",
      include: true,
      children: [
        { id: "CH-EXEC", title: "Executive Summary", include: true },
        { id: "PL-RISK", title: "Risk Management Plan", include: true },
        { id: "PL-QUALITY", title: "Quality Plan", include: false },
      ],
    };

    const pruned = pruneTree(tree, () => false)!; // nothing is empty, just honor include flags
    const { index } = numberTree(pruned);

    // Because ROOT is depth 1, the children get numbers 1.1, 1.2, ...
    expect(index.byId["PL-RISK"].number).toBe("1.2");
    expect(
      xrefSection(index, "PL-RISK", { label: "see", format: "both" })
    ).toBe("see § 1.2 Risk Management Plan");
  });
});
