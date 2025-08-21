// FlowGestio — SectionTree & Numbering Module v1
// Purpose: deterministic pruning, numbering, and xref resolution for dynamic documents
// Scope: pure functions, no framework/runtime dependencies

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface SectionNode {
  id: string;          // stable id, e.g., "CH-CHARTER", "PL-RISK"
  title: string;       // display title (without number)
  include: boolean;    // pre-toggle include flag
  children?: SectionNode[];
}

export interface NumberedSection {
  id: string;
  title: string;
  number: string;         // e.g., "1", "1.2", "1.2.3"
  depth: number;          // 1-based heading depth
  anchor: string;         // slug for internal links (e.g., "sec-1-2-risk-management-plan")
  parentId?: string;
  indexAmongSiblings: number; // 1-based order within parent
  children?: NumberedSection[];
}

export interface SectionIndex {
  byId: Record<string, NumberedSection>;
  order: string[]; // pre-order flattened list of ids
}

export type EmptinessPredicate = (sectionId: string) => boolean; // true if section has no meaningful content

// ──────────────────────────────────────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────────────────────────────────────
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_.]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function cloneShallow<T extends { children?: T[] }>(node: T): T {
  const copy = { ...node } as T;
  if (node.children) copy.children = node.children.map(child => ({ ...child }));
  return copy;
}

// ──────────────────────────────────────────────────────────────────────────────
// Prune: remove sections that are excluded or empty
// ──────────────────────────────────────────────────────────────────────────────
export function pruneTree(root: SectionNode, isEmpty: EmptinessPredicate): SectionNode | null {
  const node = cloneShallow(root);
  if (!node.include) return null;

  // Recurse children first
  if (node.children && node.children.length) {
    node.children = node.children
      .map(child => pruneTree(child, isEmpty))
      .filter((c): c is SectionNode => !!c);
  }

  // A section is kept if it is explicitly included AND (has content OR has any kept child)
  const hasChildren = !!(node.children && node.children.length);
  const empty = isEmpty(node.id);
  if (empty && !hasChildren) return null;

  return node;
}

// ──────────────────────────────────────────────────────────────────────────────
// Numbering: assign hierarchical numbers and anchors in pre-order traversal
// ──────────────────────────────────────────────────────────────────────────────
export function numberTree(root: SectionNode): { root: NumberedSection; index: SectionIndex } {
  const index: SectionIndex = { byId: {}, order: [] };
  const counters: number[] = []; // counters[depth-1]

  function visit(node: SectionNode, depth: number, parentId?: string): NumberedSection {
    // ensure counter for this depth
    if (!counters[depth - 1]) counters[depth - 1] = 0;

    // index among siblings increments at this depth
    counters[depth - 1] += 1;
    // reset deeper counters
    counters.length = depth;

    const number = counters.join(".");
    const numberAndTitle = `${number} ${node.title}`;
    const anchor = `sec-${number.replace(/\./g, '-')}-${slugify(node.title)}`;

    const numbered: NumberedSection = {
      id: node.id,
      title: node.title,
      number,
      depth,
      anchor,
      parentId,
      indexAmongSiblings: counters[depth - 1],
      children: [],
    };

    index.byId[numbered.id] = numbered;
    index.order.push(numbered.id);

    if (node.children && node.children.length) {
      let childOrdinalAtDepth = 0;
      for (const child of node.children) {
        // child ordinal handling is implicit in counters
        const childNumbered = visit(child, depth + 1, node.id);
        numbered.children!.push(childNumbered);
        childOrdinalAtDepth += 1;
      }
    }

    return numbered;
  }

  const numberedRoot = visit(root, 1, undefined);
  return { root: numberedRoot, index };
}

// ──────────────────────────────────────────────────────────────────────────────
// XRef helpers: resolve cross-references using SectionIndex
// ──────────────────────────────────────────────────────────────────────────────
export interface XRefOptions {
  label?: string;                 // e.g., "see", "Risk", "Section"
  format?: "number" | "title" | "both"; // default "number"
  fallback?: "omit" | "literal"; // default "omit"
}

export function xrefSection(index: SectionIndex, id: string, opts: XRefOptions = {}): string {
  const rec = index.byId[id];
  if (!rec) return opts.fallback === "literal" ? id : "";
  const label = opts.label ? opts.label + " " : "";
  switch (opts.format) {
    case "title":
      return `${label}${rec.title}`;
    case "both":
      return `${label}§ ${rec.number} ${rec.title}`;
    case "number":
    default:
      return `${label}§ ${rec.number}`;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Example usage (pseudo-code)
// ──────────────────────────────────────────────────────────────────────────────
/*
const tree: SectionNode = {
  id: 'DOC-ROOT', title: 'FlowGestio PMP', include: true, children: [
    { id: 'CH-EXEC', title: 'Executive Summary', include: true },
    { id: 'CH-CHARTER', title: 'Project Charter', include: true },
    { id: 'PLANS', title: 'Management Plans', include: true, children: [
      { id: 'PL-SCOPE', title: 'Scope Management Plan', include: true },
      { id: 'PL-SCHEDULE', title: 'Schedule Management Plan', include: true },
      { id: 'PL-COST', title: 'Cost Management Plan', include: true },
      { id: 'PL-QUALITY', title: 'Quality Management Plan', include: false },
      { id: 'PL-RISK', title: 'Risk Management Plan', include: true },
      { id: 'PL-PROC', title: 'Procurement Management Plan', include: false },
    ] },
  ]
};

const isEmpty: EmptinessPredicate = (id) => {
  // Plug in real emptiness rules here (e.g., look into ViewModel by id)
  return false;
};

const pruned = pruneTree(tree, isEmpty)!; // drop disabled/empty sections
const { root: numbered, index } = numberTree(pruned);

console.log(index.byId['PL-RISK']); // → { number: '3.4', title: 'Risk Management Plan', ... }
console.log(xrefSection(index, 'PL-RISK', { label: 'see', format: 'both' })); // → 'see § 3.4 Risk Management Plan'
*/

// ──────────────────────────────────────────────────────────────────────────────
// Notes
// - This module is intentionally pure/deterministic for easy unit testing.
// - Emptiness evaluation is injected to avoid template logic; call from ViewModel.
// - Anchors use a predictable pattern so HTML preview and DOCX bookmarks can agree.
// - Use with the previously defined ProjectDocPackage ViewModel builder.
