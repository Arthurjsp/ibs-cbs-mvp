import { z } from "zod";

export const ruleContextFieldSchema = z.enum([
  "emitterUf",
  "recipientUf",
  "ncm",
  "category",
  "operationType",
  "issueDate",
  "itemValue"
]);

export const ruleOperatorSchema = z.enum([
  "eq",
  "ne",
  "in",
  "notIn",
  "gt",
  "gte",
  "lt",
  "lte",
  "and",
  "or"
]);

export const ruleConditionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    op: ruleOperatorSchema,
    field: ruleContextFieldSchema.optional(),
    value: z
      .union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()]))])
      .optional(),
    conditions: z.array(ruleConditionSchema).optional()
  })
);

export const ruleEffectSchema = z.object({
  ibsRate: z.number().min(0).max(1).optional(),
  cbsRate: z.number().min(0).max(1).optional(),
  creditEligible: z.boolean().optional(),
  notes: z.string().optional()
});

export const taxRuleSchema = z.object({
  id: z.string(),
  priority: z.number().int(),
  description: z.string(),
  whenJson: ruleConditionSchema,
  thenJson: ruleEffectSchema
});

export const ruleSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  validFrom: z.string(),
  validTo: z.string().nullable().optional(),
  rules: z.array(taxRuleSchema)
});

export const scenarioParamsSchema = z.object({
  overrideRates: z
    .object({
      ibsRate: z.number().min(0).max(1).optional(),
      cbsRate: z.number().min(0).max(1).optional()
    })
    .optional(),
  pricePassThroughPercent: z.number().min(0).max(100).optional(),
  transitionFactor: z.number().min(0).max(1).optional(),
  notes: z.string().optional()
});

export const companySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  uf: z.string().length(2),
  segment: z.string().nullable().optional()
});

export const documentItemSchema = z.object({
  id: z.string(),
  lineNumber: z.number().int().positive(),
  description: z.string(),
  ncm: z.string(),
  cfop: z.string().nullable().optional(),
  quantity: z.number().positive(),
  unitValue: z.number().nonnegative(),
  totalValue: z.number().nonnegative(),
  category: z.string().nullable().optional()
});

export const documentSchema = z.object({
  id: z.string(),
  key: z.string(),
  issueDate: z.string(),
  emitterUf: z.string().length(2),
  recipientUf: z.string().length(2),
  operationType: z.enum(["SALE", "PURCHASE"]),
  totalValue: z.number().nonnegative(),
  items: z.array(documentItemSchema)
});

export const calcInputSchema = z.object({
  tenantId: z.string(),
  company: companySchema,
  document: documentSchema,
  scenario: scenarioParamsSchema.optional(),
  ruleSet: ruleSetSchema
});
