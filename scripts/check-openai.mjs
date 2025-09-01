// scripts/check-openai.mjs
// Simple import-only smoke test (no network request).
import OpenAI from "openai";
import { z } from "zod";

console.log("OpenAI import OK?", typeof OpenAI === "function" || typeof OpenAI === "object");
console.log("Zod import OK?", typeof z === "object");
