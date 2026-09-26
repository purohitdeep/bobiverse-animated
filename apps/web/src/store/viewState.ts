import type { Book, ChapterScope } from "@bobiverse/domain";
import {
    clampYearToBounds,
    getBookChapterScopes,
    getChapterScopeById,
    getScopeTimelineBounds,
} from "@bobiverse/simulation";

export const INSPECTOR_TABS = ["overview", "events", "cast", "sources"] as const;

export type InspectorTab = (typeof INSPECTOR_TABS)[number];

export interface AtlasViewState {
    bookId: string;
    scopeId: string;
    starId: string;
    year: number;
    eventId: string | null;
    tab: InspectorTab;
}

export interface ViewStateInputs {
    search: string;
    books: Book[];
    chapterScopes: ChapterScope[];
    starIds: readonly string[];
    fallbackBookId: string;
    fallbackStarId: string;
    fallbackYear: number;
    fallbackTab?: InspectorTab;
}

function parseTab(value: string | null): InspectorTab | null {
    return INSPECTOR_TABS.find((tab) => tab === value) ?? null;
}

/**
 * Resolves a shareable URL into a complete, safe view state.
 *
 * Every field is validated against the real content graph before it is
 * accepted, so a hand-edited or stale link can never move the reader past
 * their declared reading frontier or past the end of their selected scope:
 *
 * - a scope is only honoured when it belongs to the requested book
 * - an out-of-range or unparsable year is clamped into the scope's bounds
 * - an unknown star, tab, or event falls back instead of being trusted
 *
 * Returns `null` only when the content set has no chapter boundary at all,
 * which is the app's genuinely empty state.
 */
export function readViewState(inputs: ViewStateInputs): AtlasViewState | null {
    const { search, books, chapterScopes, starIds } = inputs;
    if (chapterScopes.length === 0) {
        return null;
    }

    const params = new URLSearchParams(search);

    const requestedScope = getChapterScopeById(
        chapterScopes,
        params.get("scope") ?? "",
    );
    const requestedBook =
        books.find((book) => book.id === params.get("book")) ??
        books.find((book) => book.id === requestedScope?.bookId);

    const scope =
        requestedScope && requestedScope.bookId === requestedBook?.id
            ? requestedScope
            : (getBookChapterScopes(
                  chapterScopes,
                  requestedBook?.id ?? inputs.fallbackBookId,
              )[0] ?? chapterScopes[0]);

    const bounds = getScopeTimelineBounds(books, scope);
    const rawYear = params.get("year");
    const parsedYear = rawYear === null ? Number.NaN : Number(rawYear);
    const year = clampYearToBounds(
        Number.isFinite(parsedYear) ? parsedYear : inputs.fallbackYear,
        bounds,
    );

    const requestedStar = params.get("star");
    const starId =
        requestedStar && starIds.includes(requestedStar)
            ? requestedStar
            : starIds.includes(inputs.fallbackStarId)
              ? inputs.fallbackStarId
              : (starIds[0] ?? inputs.fallbackStarId);

    const eventId = params.get("event");
    const requestedTab = parseTab(params.get("tab"));
    // A shared event link should land on the surface that explains it unless
    // the link explicitly asks for another tab.
    const tab =
        requestedTab ??
        (eventId
            ? "events"
            : (inputs.fallbackTab ?? "overview"));

    return {
        bookId: scope.bookId,
        scopeId: scope.id,
        starId,
        year,
        eventId: eventId || null,
        tab,
    };
}

/**
 * Serialises the current frame into a shareable query string. Defaults are
 * omitted so a plain overview link stays short and readable.
 */
export function writeViewState(state: AtlasViewState): string {
    const params = new URLSearchParams();
    params.set("book", state.bookId);
    params.set("scope", state.scopeId);
    params.set("year", state.year.toFixed(1));
    params.set("star", state.starId);
    if (state.eventId) {
        params.set("event", state.eventId);
    }
    if (state.tab !== "overview") {
        params.set("tab", state.tab);
    }
    return `?${params.toString()}`;
}

/**
 * True when the live frame has caught up with a pending deep link. The app
 * must not overwrite a shared URL with pre-hydration defaults, but once the
 * link has been applied this must stop matching so later edits are mirrored.
 */
export function hasCaughtUpWithViewState(
    current: AtlasViewState,
    pending: AtlasViewState,
): boolean {
    return (
        current.bookId === pending.bookId &&
        current.scopeId === pending.scopeId &&
        current.starId === pending.starId &&
        current.eventId === pending.eventId &&
        current.tab === pending.tab &&
        Math.abs(current.year - pending.year) < 0.01
    );
}
