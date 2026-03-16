type MessageKey = string;
type MessageType = "title" | "message" | "fix";
type Messages = Record<MessageKey, Record<MessageType, string>>;

export const messagesFR: Messages = {
  "BC01-S7-7.1-BLOCK-01": {
    title: "Options insuffisantes",
    message:
      "Section 7 invalide : moins de 2 options identifiées. Une analyse comparative requiert au minimum 2 options distinctes.",
    fix: "Ajouter au moins une option supplémentaire (ex: scénario alternatif, phased approach, ou Do Nothing).",
  },

  "BC01-S7-7.4-BLOCK-01": {
    title: "Matrice de comparaison absente",
    message:
      "Section 7.4 invalide : aucune matrice de comparaison fournie. Impossible de valider la recommandation sans analyse comparative structurée.",
    fix: "Créer une matrice évaluant chaque option selon les critères définis en 7.3.",
  },

  "BC01-S7-7.4-BLOCK-02": {
    title: "Couverture de matrice insuffisante",
    message:
      "La matrice de comparaison couvre {{coverage}} des cellules attendues (seuil minimum: {{threshold}}). Trop de données manquantes pour une décision éclairée.",
    fix: "Compléter les évaluations manquantes ou justifier explicitement les N/A avec raisons valides.",
  },

  "BC01-S7-7.4-WARN-01": {
    title: "Trade-offs non explicités",
    message:
      "La synthèse de Section 7.4 ne mentionne aucun trade-off entre options. Une comparaison rigoureuse doit reconnaître les compromis inhérents.",
    fix: "Ajouter 2-3 phrases sur les principaux trade-offs (ex: coût vs rapidité, risque vs bénéfice).",
  },
};

export function getMessage(
  key: MessageKey,
  type: MessageType,
  _locale: string = "fr-CA",
  params?: Record<string, string>
): string {
  let msg = messagesFR[key]?.[type] ?? `[Missing message: ${key}.${type}]`;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      // ES2019-compatible replacement (replaceAll requires ES2021 lib)
      msg = msg.split(`{{${k}}}`).join(v);
    }
  }
  return msg;
}
