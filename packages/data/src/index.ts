import {
  KnowledgeSourceSchema,
  StarSystemSchema,
  type KnowledgeSource,
  type StarSystem,
} from "@bobiverse/domain";

const rawStarSystems = [
  {
    id: "sol",
    name: "Sol",
    raHours: 0,
    decDegrees: 0,
    distanceLy: 0,
    sourceType: "catalog",
    note: "Origin point for the interstellar neighborhood model.",
  },
  {
    id: "epsilon-eridani",
    name: "Epsilon Eridani",
    raHours: 3.55,
    decDegrees: -9.46,
    distanceLy: 10.5,
    sourceType: "catalog",
  },
  {
    id: "delta-eridani",
    name: "Delta Eridani",
    raHours: 3.72,
    decDegrees: -9.76,
    distanceLy: 29.5,
    sourceType: "catalog",
  },
  {
    id: "omicron2-eridani",
    name: "Omicron2 Eridani",
    raHours: 4.26,
    decDegrees: -7.65,
    distanceLy: 16.45,
    sourceType: "catalog",
  },
  {
    id: "alpha-centauri",
    name: "Alpha Centauri",
    raHours: 14.66,
    decDegrees: -60.83,
    distanceLy: 4.39,
    sourceType: "catalog",
  },
  {
    id: "82-eridani",
    name: "82 Eridani",
    raHours: 3.33,
    decDegrees: -43.07,
    distanceLy: 19.76,
    sourceType: "catalog",
  },
] satisfies StarSystem[];

const rawKnowledgeSources = [
  {
    id: "timeline-books-1-2",
    label: "Bobiverse Timeline Books 1-2",
    href: "https://pastebin.com/ZcKub4Fc",
  },
  {
    id: "timeline-books-1-3",
    label: "Bobiverse Timeline Books 1-3",
    href: "https://pastebin.com/qwfY3PMU",
  },
  {
    id: "bobiverse-wiki",
    label: "Bobiverse Wiki",
    href: "https://bobiverse.fandom.com/wiki/Bobiverse_Wiki",
  },
] satisfies KnowledgeSource[];

export const seedStarSystems = rawStarSystems.map((star) =>
  StarSystemSchema.parse(star),
);
export const knowledgeSources = rawKnowledgeSources.map((source) =>
  KnowledgeSourceSchema.parse(source),
);
