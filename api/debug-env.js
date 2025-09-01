// api/debug-env.js
// Minimal endpoint to check whether env is loaded.
// Explicitly load .env.local (Windows sometimes needs this in dev).

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });  // load local secrets
loadEnv();                        // also load .env if present

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(200).json({
    has_PERPLEXITY_API_KEY: Boolean(process.env.PERPLEXITY_API_KEY),
    node: process.version,
  });
}
