// src/engine/bc01/messages/messages.ts

import { enCA } from "./messages.en";

export type SupportedLocale = "en-CA" | "fr-CA";

// ─── Typed message shapes ──────────────────────────────────────────────────────

/** The well-known fields every rule message can have. */
export type MessageField = "title" | "message" | "fix";

/**
 * A single rule's message bundle.
 * Index signature allows locale packs to include extra fields (e.g. "severity")
 * without breaking the type.
 */
export type RuleMessage = {
  title?: string;
  message?: string;
  fix?: string;
  [k: string]: string | undefined;
};

/** One locale's full message catalogue. */
export type LocalePack = {
  rules: Record<string, RuleMessage>;
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const registry: Record<SupportedLocale, LocalePack> = {
  "en-CA": enCA as LocalePack,
  "fr-CA": enCA as LocalePack, // placeholder (FR optional, later)
};

let currentLocale: SupportedLocale = "en-CA";

export function setLocale(locale: SupportedLocale) {
  currentLocale = registry[locale] ? locale : "en-CA";
}

export function t(ruleId: string): RuleMessage | null {
  const rules = registry[currentLocale]?.rules;
  return rules?.[ruleId] ?? null;
}

export function getLocale() {
  return currentLocale;
}

/**
 * Look up a specific message field for a rule key in the given locale.
 *
 * Signature matches the S7 rule call-sites:
 *   getMessage(ruleId, "title" | "message" | "fix", locale, params?)
 *
 * Falls back to en-CA when locale is absent or not registered.
 * Template placeholders `{{key}}` are substituted from params.
 */
export function getMessage(
  key: string,
  type: MessageField,
  locale?: string,
  params?: Record<string, string>
): string {
  // Type-safe locale resolution — fall back to en-CA if locale is absent or unknown
  const safeLocale: SupportedLocale =
    locale === "en-CA" || locale === "fr-CA" ? locale : "en-CA";
  const rules = registry[safeLocale]?.rules;
  let msg: string = rules?.[key]?.[type] ?? `[Missing message: ${key}.${type}]`;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      // ES2019-compatible placeholder substitution (replaceAll requires ES2021 lib)
      msg = msg.split(`{{${k}}}`).join(v);
    }
  }

  return msg;
}
