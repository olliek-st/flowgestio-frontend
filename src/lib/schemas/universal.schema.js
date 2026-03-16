// src/lib/schemas/universal.schema.js
import { z } from "zod";

export const UniversalProjectSchema = z.object({
  context: z.object({
    topic: z.string().min(3),
    industry: z.string().min(2),
    subsector: z.string().min(2),
    region: z.string().min(2),
  }),

  project: z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    type: z
      .enum([
        "new_development",
        "infrastructure",
        "process_improvement",
        "compliance",
        "maintenance",
      ])
      .default("process_improvement"),
    sponsor: z.string().min(2),
    manager: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),

  organization: z.object({
    name: z.string().min(2),
    department: z.string().optional(),
    branch: z.string().optional(),
    mandate: z.string().optional(),
  }),

  businessNeed: z.object({
    problemStatement: z.string().min(10),
    outcomes: z
      .array(
        z.object({
          description: z.string().min(5),
          measurement: z.string().optional(),
        })
      )
      .min(1),
  }),

  stakeholders: z
    .array(
      z.object({
        name: z.string().min(2),
        role: z.enum([
          "Sponsor",
          "Owner",
          "Contributor",
          "Consulted",
          "Informed",
        ]),
        organization: z.string().optional(),
      })
    )
    .default([]),

  scope: z
    .object({
      included: z.string().optional(),
      excluded: z.string().optional(),
    })
    .optional(),

  timeline: z
    .object({
      majorMilestones: z
        .array(
          z.object({
            name: z.string(),
            targetDate: z.string().optional(),
          })
        )
        .default([]),
    })
    .optional(),

  financial: z
    .object({
      capex: z.number().optional(),
      opex_annual: z.number().optional(),
      currency: z.enum(["CAD", "USD", "EUR", "GBP"]).default("CAD"),
    })
    .optional(),
});

export const defaultUniversalData = {
  context: { topic: "", industry: "", subsector: "", region: "" },
  project: {
    title: "",
    type: "process_improvement",
    sponsor: "",
    manager: "",
  },
  organization: { name: "" },
  businessNeed: { problemStatement: "", outcomes: [] },
  stakeholders: [],
  scope: {},
  timeline: { majorMilestones: [] },
  financial: { currency: "CAD" },
};
