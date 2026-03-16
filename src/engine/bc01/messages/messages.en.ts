// src/engine/bc01/messages/messages.en.ts

export const enCA = {
  meta: {
    locale: "en-CA",
  },

  rules: {
    S7_7_4_BLOCK_01: {
      title: "Procurement strategy missing",
      message:
        "The Business Case indicates external acquisition but does not define a procurement strategy.",
      severity: "BLOCK",
    },

    S7_7_4_WARN_01: {
      title: "Procurement approach unclear",
      message:
        "A procurement approach is mentioned but lacks sufficient detail to assess feasibility.",
      severity: "WARN",
    },
  },
} as const;

export type MessagesEN = typeof enCA;
