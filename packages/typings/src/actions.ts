import type { FromSchema, JSONSchema } from "json-schema-to-ts";

export const ACTION_SCHEMA = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { const: "useSkill" },
        cost: { type: "array", items: { type: "integer" } },
        name: { type: "string" },
      },
      required: ["type", "cost", "name"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { const: "switchActive" },
        target: { type: "integer" },
      },
      required: ["type", "target"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { const: "playCard" },
        card: { type: "number" },
        with: {
          type: "array",
          items: {
            type: "object", 
            additionalProperties: false,
            properties: {
              type: { enum: ["character", "summon", "support"] },
              id: { type: "number" }, 
            },
            required: ["type", "who"]
          },
        },
        removeSupport: { type: "integer" },
      },
      required: ["type", "card"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        card: { type: "number" },
        type: { const: "elementalTuning" },
      },
      required: ["type", "card"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { const: "declareEnd" },
      },
      required: ["type"],
    },
  ],
} as const satisfies JSONSchema;

export type Action = FromSchema<typeof ACTION_SCHEMA>;