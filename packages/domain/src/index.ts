import { z } from "zod";

export const SourceTypeSchema = z.enum(["catalog", "estimated"]);
export const EventTypeSchema = z.enum([
  "replicant-created",
  "departure",
  "arrival",
  "conflict",
  "technology",
  "narrative",
]);

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

export const BookSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  chapterCount: z.number().int().positive(),
  timelineStartYear: z.number(),
  timelineEndYear: z.number(),
});

export const ChapterScopeSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  chapter: z.number().int().positive(),
  label: z.string().min(1),
  maxYear: z.number(),
});

export const BobInstanceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  generation: z.number().int().nonnegative(),
  introducedInBookId: z.string().min(1),
  createdYear: z.number(),
  homeSystemId: z.string().min(1),
  parentId: z.string().min(1).optional(),
});

export const TravelSegmentSchema = z.object({
  id: z.string().min(1),
  bobId: z.string().min(1),
  bookId: z.string().min(1),
  fromSystemId: z.string().min(1),
  toSystemId: z.string().min(1),
  departureYear: z.number(),
  arrivalYear: z.number(),
});

export const TimelineEventSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  type: EventTypeSchema,
  label: z.string().min(1),
  year: z.number(),
  chapterScopeId: z.string().min(1).optional(),
  starSystemId: z.string().min(1).optional(),
  bobIds: z.array(z.string().min(1)).default([]),
});

export const SeriesManifestSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  bookIds: z.array(z.string().min(1)).min(1),
  chapterScopeIds: z.array(z.string().min(1)).min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
});

export type SourceType = z.infer<typeof SourceTypeSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type StarSystem = z.infer<typeof StarSystemSchema>;
export type KnowledgeSource = z.infer<typeof KnowledgeSourceSchema>;
export type Book = z.infer<typeof BookSchema>;
export type ChapterScope = z.infer<typeof ChapterScopeSchema>;
export type BobInstance = z.infer<typeof BobInstanceSchema>;
export type TravelSegment = z.infer<typeof TravelSegmentSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type SeriesManifest = z.infer<typeof SeriesManifestSchema>;

export const PROJECT_NAME = "Bobiverse Atlas";
