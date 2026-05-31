import { z } from "zod";

export const SourceTypeSchema = z.enum(["catalog", "estimated"]);

export const StarSystemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  raHours: z.number(),
  decDegrees: z.number(),
  distanceLy: z.number().nonnegative(),
  sourceType: SourceTypeSchema,
  note: z.string().optional(),
});

export const KnowledgeSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().url(),
});

export type SourceType = z.infer<typeof SourceTypeSchema>;
export type StarSystem = z.infer<typeof StarSystemSchema>;
export type KnowledgeSource = z.infer<typeof KnowledgeSourceSchema>;

export const PROJECT_NAME = "Bobiverse Atlas";
