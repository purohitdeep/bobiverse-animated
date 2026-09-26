import { describe, expect, it } from "vitest";
import { atlasBooks, atlasChapterScopes } from "@bobiverse/data";
import { seedStarSystems } from "@bobiverse/data";
import {
    hasCaughtUpWithViewState,
    readViewState,
    writeViewState,
    type AtlasViewState,
    type ViewStateInputs,
} from "./viewState";

const starIds = seedStarSystems.map((star) => star.id);

function inputs(search: string, overrides: Partial<ViewStateInputs> = {}) {
    return {
        search,
        books: atlasBooks,
        chapterScopes: atlasChapterScopes,
        starIds,
        fallbackBookId: "we-are-legion",
        fallbackStarId: "sol",
        fallbackYear: 2134,
        ...overrides,
    };
}

const base: AtlasViewState = {
    bookId: "we-are-legion",
    scopeId: "book-1-arrival-epsilon-eridani",
    starId: "sol",
    year: 2134,
    eventId: null,
    tab: "overview",
};

describe("readViewState", () => {
    it("returns null when the content set has no chapter boundary", () => {
        expect(readViewState(inputs("", { chapterScopes: [] }))).toBeNull();
    });

    it("falls back to the safe opening frame for an empty query", () => {
        expect(readViewState(inputs(""))).toEqual(base);
    });

    it("restores a fully specified shared frame", () => {
        const search =
            "?book=all-these-worlds&scope=book-3-finale&year=2257.4&star=delta-pavonis";
        expect(readViewState(inputs(search))).toEqual({
            bookId: "all-these-worlds",
            scopeId: "book-3-finale",
            starId: "delta-pavonis",
            year: 2257.4,
            eventId: null,
            tab: "overview",
        });
    });

    it("rejects a scope that belongs to a different book than the one requested", () => {
        // Asking for Book 1 while pointing at a Book 3 boundary must not be
        // honoured: it would disclose content past the reading frontier.
        const state = readViewState(
            inputs("?book=we-are-legion&scope=book-3-finale&year=2263.9"),
        );
        expect(state).not.toBeNull();
        expect(state?.bookId).toBe("we-are-legion");
        expect(state?.scopeId).toBe("book-1-arrival-epsilon-eridani");
    });

    it("infers the book from the scope when no book param is present", () => {
        const state = readViewState(inputs("?scope=book-2-others-reveal"));
        expect(state?.bookId).toBe("for-we-are-many");
        expect(state?.scopeId).toBe("book-2-others-reveal");
    });

    it("clamps an out-of-range year into the selected scope's bounds", () => {
        const late = readViewState(inputs("?scope=book-1-arrival-epsilon-eridani&year=9999"));
        expect(late?.year).toBe(2144.6);

        const early = readViewState(inputs("?scope=book-1-arrival-epsilon-eridani&year=1000"));
        expect(early?.year).toBe(2133);
    });

    it("clamps a non-numeric year instead of producing a broken frame", () => {
        const state = readViewState(inputs("?year=not-a-year"));
        expect(Number.isFinite(state?.year)).toBe(true);
        expect(state?.year).toBe(2134);
    });

    it("ignores an unknown star and falls back safely", () => {
        expect(readViewState(inputs("?star=rigel"))?.starId).toBe("sol");
    });

    it("falls back to a real star when the default star is unknown", () => {
        const state = readViewState(inputs("", { fallbackStarId: "nowhere" }));
        expect(starIds).toContain(state?.starId);
    });

    it("ignores an unknown inspector tab", () => {
        expect(readViewState(inputs("?tab=nonsense"))?.tab).toBe("overview");
    });

    it("restores a requested tab", () => {
        expect(readViewState(inputs("?tab=cast"))?.tab).toBe("cast");
    });

    it("lands a shared event link on the story tab by default", () => {
        const state = readViewState(inputs("?event=battle-of-sol"));
        expect(state?.eventId).toBe("battle-of-sol");
        expect(state?.tab).toBe("events");
    });

    it("honours an explicit tab over the event default", () => {
        const state = readViewState(inputs("?event=battle-of-sol&tab=sources"));
        expect(state?.tab).toBe("sources");
    });
});

describe("writeViewState", () => {
    it("omits defaults to keep a plain link short", () => {
        expect(writeViewState(base)).toBe(
            "?book=we-are-legion&scope=book-1-arrival-epsilon-eridani&year=2134.0&star=sol",
        );
    });

    it("includes the event and tab when the frame has them", () => {
        const search = writeViewState({
            ...base,
            eventId: "bob-arrives-epsilon-eridani",
            tab: "cast",
        });
        expect(search).toContain("event=bob-arrives-epsilon-eridani");
        expect(search).toContain("tab=cast");
    });

    it("round-trips a shared frame back to the same state", () => {
        const original: AtlasViewState = {
            bookId: "for-we-are-many",
            scopeId: "book-2-finale",
            starId: "82-eridani",
            year: 2221.5,
            eventId: "battle-delta-pavonis",
            tab: "events",
        };
        expect(readViewState(inputs(writeViewState(original)))).toEqual(original);
    });
});

describe("hasCaughtUpWithViewState", () => {
    it("matches an identical frame", () => {
        expect(hasCaughtUpWithViewState(base, { ...base })).toBe(true);
    });

    it("tolerates sub-centisecond year drift from scrubber rounding", () => {
        expect(
            hasCaughtUpWithViewState({ ...base, year: 2134.009 }, base),
        ).toBe(true);
    });

    it("does not match while any field still differs", () => {
        expect(hasCaughtUpWithViewState({ ...base, year: 2140 }, base)).toBe(false);
        expect(hasCaughtUpWithViewState({ ...base, starId: "delta-eridani" }, base)).toBe(false);
        expect(hasCaughtUpWithViewState({ ...base, tab: "cast" }, base)).toBe(false);
        expect(hasCaughtUpWithViewState({ ...base, eventId: "bob-online" }, base)).toBe(false);
    });
});
