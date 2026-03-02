# FlowGestio Frontend — CLAUDE.md

## Project Identity

FlowGestio is a **Decision Operating System** — not a template engine or generic AI document generator.
It structures, evaluates, and documents strategic project decisions with governance-grade rigor.

Primary output: **Business Cases** (BC01-level governance artifacts) and derivative documents.
The Business Case is the canonical source of truth. See `FLOWGESTIO_CONSTITUTION.md` for doctrine.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 5 |
| Language | JSX (pages, components) + TypeScript (lib/) |
| Styling | Tailwind CSS v3 |
| Routing | React Router DOM v7 (browser router) |
| Forms | react-hook-form + zod |
| AI | openai SDK (via Vercel serverless) |
| HTTP | axios |
| Export | docx, jspdf |
| Analytics | posthog-js |
| Deployment | Vercel (serverless functions in `/api`) |

---

## Commands

```bash
npm run dev          # Vite dev server on port 5173 (proxies /api → localhost:4000)
npm run dev:vercel   # Full-stack local dev via Vercel CLI (preferred for API testing)
npm run build        # Production build
npm run preview      # Preview production build
```

---

## Project Structure

```
src/
  main.jsx              # Router setup — all routes defined here
  App.jsx               # Minimal shell (mostly unused)
  pages/                # Page-level route components
    Landing.jsx
    ComingSoon.jsx
    Wizard.jsx           # Legacy wizard (kept)
    WizardV2.jsx         # Active research wizard
    ResearchTester.jsx   # Dev testing page
    Login.jsx / Signup.jsx / Demo.jsx
  components/
    wizard/              # Wizard step components + stepper
      steps/             # Step1Context, Step2Documents, Step3Generate, Step4Export
    research/            # FactCard, FactList, ResearchInsight
    common/              # DiffView
    BetaAccess, BetaBanner, CharterPreview, EmailCapture, FAQ, etc.
  lib/                   # Core business logic (TypeScript)
    ai/client.ts         # OpenAI client wrapper
    analyze/             # Business case analysis
    docs/                # Document section tree + view model
    finance/calculator.ts
    risk/score.ts
    schemas/             # businessCaseSchema.js
    validation/          # Business case validation rules
    research.ts
    api.js               # API helpers
    analytics.js         # PostHog wrapper
  services/              # Service layer (JS)
    documentBuilder.js
    exportService.js
    researchService.js
    researchClient.js
    citationManager.js
    formatters.js
    validation.js
  documentBuilders/
    businessCase.js      # Business Case document generator
  data/
    demoPackage.ts       # Demo data
  dev/
    TestPipelineButton.jsx  # Dev-only component

api/                     # Vercel serverless functions
  waitlist.js
  research.js
  debug-env.js
  ai/                    # AI-related serverless handlers
```

---

## Routing

Defined in `src/main.jsx`. Current routes:

| Path | Component | Notes |
|------|-----------|-------|
| `/` | Landing | Public |
| `/coming-soon` | ComingSoon | Waitlist gate |
| `/wizard` | Wizard | Legacy, kept |
| `/wizard-v2` | WizardV2 | Active wizard |
| `/research-tester` | ResearchTester | Dev only |
| `*` | → `/coming-soon` | Catch-all redirect |

Vercel (`vercel.json`) redirects `/wizard` and `/demo` to `/coming-soon` in production.

---

## Architecture Principles (from Constitution)

These are **non-negotiable** — do not violate them when modifying code:

1. **Strict layer separation**: Screening → Scoring → Financial computation → Regulatory gating → Narrative generation. Never merge these layers implicitly.
2. **Deterministic engines**: Identical inputs must produce identical outputs. No hidden modifiers or silent state mutation.
3. **Financial integrity**: 2 decimal precision (banker's rounding). NPV, ROI, TCO must be externally reproducible.
4. **No silent overrides**: Any deviation from engine output must be logged with structured justification.
5. **Derivative documents** (Business Plans, decks) may adjust tone but must not alter financial conclusions or suppress risk.

---

## Key Conventions

- Most source files are `.jsx` (not `.tsx`). TypeScript is used in `src/lib/`.
- API calls go through Vercel serverless functions in `/api/` — never call external AI APIs directly from the client in production.
- Vite proxies `/api/*` → `localhost:4000` in dev; use `npm run dev:vercel` to run serverless functions locally.
- PostHog analytics is initialized via `src/lib/analytics.js`.
- Environment variables: use `.env` locally; configure in Vercel dashboard for production.

---

## Current State (as of this worktree)

- The app is gated: public users land on `/coming-soon` (waitlist capture).
- Wizard routes are accessible directly in dev but redirected in Vercel production config.
- WizardV2 is the active development path.
