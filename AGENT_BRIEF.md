# FlowGestio — Agent Brief

## What FlowGestio Is
FlowGestio is an AI-assisted Decision OS that generates structured
PMI/PMBOK-aligned Business Cases (BC-01) following Treasury Board
of Canada standards.

Primary goal: help organizations produce decision-grade business cases.

## Current Product Phase
BC-01 Builder (MVP).

Wizard structure:
Step1Universal → Step2Options → Step3Generate

## Core Engines
- Narrative drafting (OpenAI)
- Research & benchmarking (Perplexity)
- Scoring engine (three-tier weighting)
- Validation engine (BLOCK/WARN rules)
- Regulatory packs (privacy, procurement)

## Non-Negotiables
- BC01 schema integrity must be preserved
- TBS Business Case Guide alignment
- PMI/PMBOK logic consistency
- No silent field renaming
- User-entered data must never be overwritten by AI outputs

## Agent Roles
ChatGPT → architecture & reasoning layer  
Claude Code → execution layer (repo-native implementation)

## Working Style
Agents should:
- inspect files before modifying them
- fix root causes rather than symptoms
- avoid unrelated refactors
- preserve schema compatibility