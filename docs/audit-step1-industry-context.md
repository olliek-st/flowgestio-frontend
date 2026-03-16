# FlowGestio — Step 1 Industry Context Static Audit

**Date:** 2026-02-26
**Scope:** Audit only — no implementation changes.
**Purpose:** Authoritative reference for regulatory validation implementation.

---

## 1. Component Inventory

| Role | File | Export name |
|---|---|---|
| Step 1 UI | `src/components/wizard/steps/Step1Universal.jsx` | `Step1Context` (default) |
| Wizard root | `src/pages/WizardV2.jsx` | `WizardV2` |
| Step 3 router | `src/components/wizard/steps/Step3DocumentWizard.jsx` | `Step3DocumentWizard` |
| BC-01 entry | `src/components/wizard/document-wizards/BC01Wizard.jsx` | `BC01Wizard` |
| Validation host | `src/components/wizard/steps/Step3Generate.jsx` | `Step3Generate` |
| Mapping router | `src/lib/mapping/MappingEngine.js` | `mappingEngine` (singleton) |
| BC-01 mapper | `src/lib/mappings/UniversalToBC01Mapper.js` | `universalToBC01Mapper` |
| Zod schema | `src/lib/schemas/universal.schema.js` | `UniversalProjectSchema` |
| Config | `src/config/index.js` | `CONFIG_V1` |
| Industry presets | `src/config/compliance/industry_presets.v1.json` | (raw JSON) |

---

## 2. Industry-Context Field Definitions

### 2.1 Type definitions (Zod — `universal.schema.js`)

```javascript
context: z.object({
  topic:     z.string().min(3),
  industry:  z.string().min(2),   // ← NO .enum() — plain string
  subsector: z.string().min(2),   // ← NO .enum() — plain string
  region:    z.string().min(2),   // ← NO .enum() — plain string (jurisdiction proxy)
})
```

**There are no TypeScript enums or union types** for `industry`, `subsector`, or `region`. All three are runtime strings only.

### 2.2 Valid industry values (from `industry_presets.v1.json`)

37 presets across 10 industries:

| `industry` | `subsector` values |
|---|---|
| `HEALTH` | `CLINIC`, `PHARMA`, `CLINICAL_RESEARCH`, `MEDICAL_DEVICES` |
| `FINTECH` | `BANKING`, `BANKING_LENDING`, `PAYMENTS`, `CRYPTO_DIGITAL_ASSETS` |
| `PUBLIC` | `ADMIN_DIGITAL`, `EDUCATION` |
| `CONSTRUCTION` | `CIVIL_INFRA`, `BUILDING`, `INDUSTRIAL` |
| `IT` | `SAAS`, `SAAS_CLOUD`, `AI`, `CYBERSECURITY` |
| `CLEANTECH` | `CARBON_CREDITS`, `LIFECYCLE_PRODUCTS`, `PUBLIC_FUNDING`, `RENEWABLE_ENERGY`, `WASTE_WATER` |
| `MANUFACTURING` | `AUTOMOTIVE`, `AEROSPACE` |
| `CHEMICALS` | `HAZMAT` |
| `EDUCATION` | `DIGITAL_SERVICES` |
| `DEFENSE` | `EXPORT_CONTROLLED` |

The subsector dropdown in Step 1 is filtered by selected industry (disabled until industry is chosen), so a valid `(industry, subsector)` pair is always one of the rows above — but this is only enforced by UI logic, not by Zod.

### 2.3 `region` / jurisdiction

- Free-form text input. No enum. No type constraint beyond `z.string().min(2)`.
- No `jurisdiction` field exists anywhere in the data model.
- `region` is the only jurisdiction proxy available.
- Example values: `"Canada"`, `"Quebec"`, `"Ontario"`, `"Federal"` — uncontrolled.

### 2.4 `activeDomains` (presets only, not yet consumed)

Each preset in `industry_presets.v1.json` carries `activeDomains: string[]`. Examples:

```json
{ "id": "PRESET.HEALTH.CLINIC",   "industry": "HEALTH",   "subsector": "CLINIC",
  "activeDomains": ["PRIVACY", "SECURITY", "QUALITY_REG"] }
{ "id": "PRESET.IT.SAAS",         "industry": "IT",       "subsector": "SAAS",
  "activeDomains": ["PRIVACY", "SECURITY"] }
{ "id": "PRESET.FINTECH.BANKING", "industry": "FINTECH",  "subsector": "BANKING",
  "activeDomains": ["FINANCIAL_REG", "SECURITY", "PRIVACY"] }
```

These domain labels are not consumed by any current validation code. They are available for regulatory pack gating.

---

## 3. Step 1 Payload Shape (exact)

Assembled in `Step1Universal.jsx` `handleContinue()` and passed via `onNext(payload)`:

```javascript
{
  // ── Top-level context fields ──────────────────────────────────
  topic:     string,            // e.g. "IT Modernisation"
  industry:  string,            // e.g. "HEALTH"   ← KEY
  subsector: string,            // e.g. "CLINIC"   ← KEY
  sector:    string,            // alias for industry (= industry)
  subSector: string,            // alias for subsector (= subsector)
  region:    string,            // e.g. "Canada"   ← jurisdiction proxy

  // ── inputs (Step 1 project fields) ───────────────────────────
  inputs: {
    title:      string,
    sponsor:    string,
    manager:    string,
    startDate:  string,
    endDate:    string,
    problem:    string,
    goals:      string[],       // outcomes.map(o => o.description)
    capex?:     number,
    opex_annual?: number,
  },

  // ── universal (structured Step 1 data) ───────────────────────
  universal: {
    context: {
      topic:     string,
      industry:  string,        // duplicate of top-level
      subsector: string,        // duplicate of top-level
      region:    string,
    },
    project: {
      title: string,
      type:  "new_development" | "infrastructure" | "process_improvement" |
             "compliance" | "maintenance",
      sponsor: string,
      manager: string,
      startDate: string,
      endDate:   string,
    },
    organization: {
      name:       string,
      department: string,
      branch:     string,
    },
    businessNeed: {
      problemStatement: string,
      outcomes: Array<{ description: string, measurement?: string }>,
    },
    stakeholders: Array<{
      name: string,
      role: "Sponsor" | "Owner" | "Contributor" | "Consulted" | "Informed",
      organization?: string,
    }>,
    scope: {
      included?: string,
      excluded?: string,
    },
    timeline: {
      majorMilestones: Array<{ name: string, targetDate?: string }>,
    },
    financial: {
      capex?:       number,
      opex_annual?: number,
      currency:     "CAD" | "USD" | "EUR" | "GBP",   // default: "CAD"
    },
  },
}
```

---

## 4. Prop Chain: Step1Universal → Step3Generate

```
Step1Universal
  └─ onNext(payload)
       ↓
WizardV2 — setContext(payload)
  context = payload
  step3Data = context.inputs ? context : { ...context, inputs: context }
            = context           ← inputs always present, so step3Data === payload
  └─ <Step3DocumentWizard step1Data={step3Data} />
         ↓
Step3DocumentWizard
  preFilled = mappingEngine.applyMapping(step1Data.universal, "BC-01")
  └─ <BC01Wizard
        step1Data={step1Data}
        data={step1Data}
        universal={step1Data?.universal}
        preFilled={preFilled}
      />
          ↓
BC01Wizard
  initializedData = preFilled
    ? transformPreFilledToBC01Schema(preFilled)   ← v2 section keys
    : data                                        ← = step1Data = payload
  └─ <Step3Generate
        data={step1Data}              ← always the full payload
        initialFormData={initializedData}
      />
           ↓
Step3Generate
  step1Envelope = buildStep1Payload(data.inputs)
                = { step1: { inputs: data.inputs } }
  step1Inputs   = data.inputs
                = { title, sponsor, manager, startDate, endDate,
                    problem, goals[], capex?, opex_annual? }

  ╔══════════════════════════════════════════════════════════════╗
  ║  step1Inputs.industry   === UNDEFINED                        ║
  ║  step1Inputs.subsector  === UNDEFINED                        ║
  ║  step1Inputs.region     === UNDEFINED                        ║
  ╚══════════════════════════════════════════════════════════════╝

  ── Where industry IS accessible inside Step3Generate ──────────
  data?.industry                        // "HEALTH"   (top-level)
  data?.universal?.context?.industry    // "HEALTH"   (nested, same value)
  data?.sector                          // "HEALTH"   (alias)
  data?.subsector                       // "CLINIC"
  data?.universal?.context?.subsector   // "CLINIC"   (nested, same value)
  data?.region                          // "Canada"
  data?.universal?.context?.region      // "Canada"   (nested, same value)
```

---

## 5. `buildStep1Payload` Behaviour

```javascript
// src/utils/buildStep1Payload.js
export function buildStep1Payload(step1Inputs) {
  const inputs = step1Inputs && typeof step1Inputs === "object" && !Array.isArray(step1Inputs)
    ? step1Inputs
    : {};
  return { step1: { inputs } };
}
```

Single responsibility: wrap. The branch `data.inputs ? data.inputs : data` in Step3Generate means `step1Inputs` will **always** equal `data.inputs` (not the whole payload) because `data.inputs` is always a non-null object set by Step1Universal.

---

## 6. `ValidationContext` Current Status

Defined in `src/engine/validation/types.ts` but not yet consumed:

```typescript
export interface ValidationContext {
  industry?:   string;
  subsector?:  string;
  jurisdiction?: string;    // ← Note: schema uses "region", not "jurisdiction"
}
```

Not passed to `collectIssues()`, not read inside `_execValidation`. Phase 1 forward-compat stub only.

---

## 7. MappingEngine Flow (informational)

`UniversalToBC01Mapper.map(universalData)` transforms `step1Data.universal` into a partial BC-01 formData (v2 section keys). It does **not** carry `industry`/`subsector` into the mapped output — the mapper only touches `strategic`, `financial`, `organizational`, `options`, and `workflow`. Industry context is not in `initialFormData`.

---

## 8. Implementation Guidance (pre-requisites confirmed)

For the regulatory validation implementation the following access pattern is safe and correct:

### Reading industry context inside `_execValidation` (Step3Generate)

```javascript
// Add alongside step1InputsRef — same stable-closure pattern:
const contextRef = useRef(null);
useEffect(() => {
  contextRef.current = {
    industry:     data?.industry  ?? data?.universal?.context?.industry  ?? "",
    subsector:    data?.subsector ?? data?.universal?.context?.subsector ?? "",
    jurisdiction: data?.region    ?? data?.universal?.context?.region    ?? "",
  };
}, [data]);

// Inside _execValidation (stable closure reads from ref):
const ctx = contextRef.current ?? {};
const regulatoryIssues = collectIssues(nextFormData, ctx);
```

### Matching to presets

```javascript
// industry_presets.v1.json key format:
// { industry: "HEALTH", subsector: "CLINIC", activeDomains: [...] }
// → match by exact equality on both fields

import presets from "../config/compliance/industry_presets.v1.json";

function getActiveDomainsForContext(ctx) {
  const preset = presets.find(
    p => p.industry === ctx.industry && p.subsector === ctx.subsector
  );
  return preset?.activeDomains ?? [];
}
```

### `collectIssues` signature update

```typescript
// Current:
export function collectIssues(formData: unknown): ValidationIssue[]

// Target:
export function collectIssues(
  formData: unknown,
  context?: ValidationContext
): ValidationIssue[]
```

---

## 9. Known Gaps and Risks

| Gap | Impact | Mitigation |
|---|---|---|
| `region` is free-form text | Cannot be matched to a jurisdiction enum for regulatory gating | Accept as-is for Phase 1; map to `jurisdiction` field only if region-scoped rules needed |
| No TypeScript enum for `industry`/`subsector` | Typos in rule pack IDs won't be caught at compile time | Use exact string literals from `industry_presets.v1.json`; add runtime guard in `getActiveDomainsForContext` |
| `industry_presets.v1.json` `activeDomains` not consumed | Regulatory packs could run outside their target industry | Enforce double guard: pack key match AND domain whitelist check |
| `step1Inputs.industry === undefined` | Existing code that reads `step1Inputs.industry` silently gets `undefined` | Never read industry from `step1Inputs`; always use `data?.industry` |
| `ValidationContext.jurisdiction` vs `region` | Name mismatch between schema (`region`) and interface (`jurisdiction`) | In contextRef builder, map `region → jurisdiction`; or rename the interface field |

---

*Audit complete. No files were modified.*
