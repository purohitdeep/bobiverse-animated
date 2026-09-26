import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  atlasBobInstances,
  atlasBooks,
  atlasChapterScopes,
  atlasSeriesManifest,
  atlasTimelineEvents,
  atlasTravelSegments,
  knowledgeSources,
  seedStarSystems,
} from "@bobiverse/data";
import { PROJECT_NAME } from "@bobiverse/domain";
import {
  buildSceneStarNodes,
  clampYearToBounds,
  formatAtlasYear,
  getBookChapterScopes,
  getChapterScopeById,
  getManifestBooks,
  getManifestChapterScopes,
  getNeighborhoodSummary,
  getScopeTimelineBounds,
  getScopedBobInstances,
  getScopedStarNote,
  getScopedTimelineEvents,
  getScopedTravelSegments,
  searchVisibleAtlas,
  type AtlasSearchResult,
} from "@bobiverse/simulation";
import "./App.css";
import { InspectorPanel, type InspectorTab } from "./components/InspectorPanel";
import { SceneErrorBoundary } from "./components/SceneErrorBoundary";
import { ScopeSelector } from "./components/ScopeSelector";
import { SystemDirectory } from "./components/SystemDirectory";
import { TimelineSlider } from "./components/TimelineSlider";
import { useStarMapStore } from "./store/useStarMapStore";

const LazyStarfieldScene = lazy(() =>
  import("./components/StarfieldScene").then((module) => ({
    default: module.StarfieldScene,
  })),
);

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getSearchIcon(kind: AtlasSearchResult["kind"]) {
  if (kind === "system") return "✦";
  if (kind === "replicant") return "◉";
  return "◇";
}

function getEmptyState() {
  return (
    <div className="app-empty-state">
      <span className="empty-orbit" aria-hidden="true">✦</span>
      <h1>No reading frontier found</h1>
      <p>The atlas needs at least one valid book and chapter boundary before it can open.</p>
    </div>
  );
}

function App() {
  const selectedStarId = useStarMapStore((state) => state.selectedStarId);
  const setSelectedStarId = useStarMapStore((state) => state.setSelectedStarId);
  const selectedBookId = useStarMapStore((state) => state.selectedBookId);
  const setSelectedBookId = useStarMapStore((state) => state.setSelectedBookId);
  const selectedChapterScopeId = useStarMapStore(
    (state) => state.selectedChapterScopeId,
  );
  const setSelectedChapterScopeId = useStarMapStore(
    (state) => state.setSelectedChapterScopeId,
  );
  const focalYear = useStarMapStore((state) => state.focalYear);
  const setFocalYear = useStarMapStore((state) => state.setFocalYear);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] =
    useState<InspectorTab>("overview");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [mapMode, setMapMode] = useState<"spatial" | "directory">("spatial");
  const [searchQuery, setSearchQuery] = useState("");
  const hasHydratedViewRef = useRef(false);
  const pendingUrlHydrationRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialFocalYear = useRef(focalYear);

  const sceneStarNodes = useMemo(
    () => buildSceneStarNodes(seedStarSystems),
    [],
  );
  const summary = useMemo(() => getNeighborhoodSummary(seedStarSystems), []);
  const manifestBooks = useMemo(
    () => getManifestBooks(atlasBooks, atlasSeriesManifest),
    [],
  );
  const manifestChapterScopes = useMemo(
    () => getManifestChapterScopes(atlasChapterScopes, atlasSeriesManifest),
    [],
  );
  const selectedBookChapterScopes = useMemo(
    () => getBookChapterScopes(manifestChapterScopes, selectedBookId),
    [manifestChapterScopes, selectedBookId],
  );
  const selectedScope =
    getChapterScopeById(manifestChapterScopes, selectedChapterScopeId) ??
    selectedBookChapterScopes.at(-1) ??
    manifestChapterScopes.at(-1);
  const activeStar =
    sceneStarNodes.find((star) => star.id === selectedStarId) ?? sceneStarNodes[0];
  const activeStarNote =
    activeStar && selectedScope
      ? getScopedStarNote(
          activeStar,
          manifestBooks,
          manifestChapterScopes,
          selectedScope,
        )
      : undefined;

  const timelineBounds = selectedScope
    ? getScopeTimelineBounds(manifestBooks, selectedScope)
    : { startYear: 0, endYear: 0 };
  const timelineEvents = useMemo(
    () =>
      selectedScope
        ? getScopedTimelineEvents(
            atlasTimelineEvents,
            manifestBooks,
            manifestChapterScopes,
            selectedScope,
            focalYear,
          )
        : [],
    [focalYear, manifestBooks, manifestChapterScopes, selectedScope],
  );
  const travelSegments = useMemo(
    () =>
      selectedScope
        ? getScopedTravelSegments(
            atlasTravelSegments,
            manifestBooks,
            manifestChapterScopes,
            selectedScope,
            focalYear,
          )
        : [],
    [focalYear, manifestBooks, manifestChapterScopes, selectedScope],
  );
  const bobInstances = useMemo(
    () =>
      selectedScope
        ? getScopedBobInstances(
            atlasBobInstances,
            atlasTravelSegments,
            manifestBooks,
            manifestChapterScopes,
            selectedScope,
            focalYear,
          )
        : [],
    [focalYear, manifestBooks, manifestChapterScopes, selectedScope],
  );
  const previousEvent =
    timelineEvents.filter((event) => event.year < focalYear).at(-1) ?? null;
  const nextEvent =
    timelineEvents.find((event) => event.year > focalYear) ?? null;
  const sourceById = useMemo(
    () => new Map(knowledgeSources.map((source) => [source.id, source])),
    [],
  );
  const starById = useMemo(
    () => new Map(sceneStarNodes.map((star) => [star.id, star])),
    [sceneStarNodes],
  );
  const searchResults = useMemo(
    () =>
      searchVisibleAtlas(
        searchQuery,
        sceneStarNodes,
        bobInstances,
        timelineEvents,
      ),
    [bobInstances, sceneStarNodes, searchQuery, timelineEvents],
  );
  const pendingReviewCount = [
    ...timelineEvents,
    ...bobInstances,
    ...travelSegments,
  ].filter((record) => record.reviewStatus === "pending-review").length;
  const selectedBook = manifestBooks.find((book) => book.id === selectedBookId);
  const visibleSourceIds = Array.from(
    new Set([
      ...(selectedBook?.sourceIds ?? []),
      ...(selectedScope?.sourceIds ?? []),
    ]),
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "SELECT";
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedScope = getChapterScopeById(
      manifestChapterScopes,
      params.get("scope") ?? "",
    );
    const requestedBook =
      manifestBooks.find((book) => book.id === params.get("book")) ??
      manifestBooks.find((book) => book.id === requestedScope?.bookId);
    const safeScope =
      requestedScope && requestedScope.bookId === requestedBook?.id
        ? requestedScope
        : getBookChapterScopes(
            manifestChapterScopes,
            requestedBook?.id ?? "we-are-legion",
          )[0] ?? manifestChapterScopes[0];
    pendingUrlHydrationRef.current = true;
    const requestedStar = params.get("star");
    const yearParam = params.get("year");
    const requestedYear = yearParam === null ? Number.NaN : Number(yearParam);

    if (safeScope) {
      setSelectedBookId(safeScope.bookId);
      setSelectedChapterScopeId(safeScope.id);
      const bounds = getScopeTimelineBounds(manifestBooks, safeScope);
      setFocalYear(
        Number.isFinite(requestedYear)
          ? clampYearToBounds(requestedYear, bounds)
          : clampYearToBounds(initialFocalYear.current, bounds),
      );
    }
    if (requestedStar && sceneStarNodes.some((star) => star.id === requestedStar)) {
      setSelectedStarId(requestedStar);
    }
    hasHydratedViewRef.current = true;
  }, [
    manifestBooks,
    manifestChapterScopes,
    sceneStarNodes,
    setFocalYear,
    setSelectedBookId,
    setSelectedChapterScopeId,
    setSelectedStarId,
  ]);

  useEffect(() => {
    if (
      !hasHydratedViewRef.current ||
      !pendingUrlHydrationRef.current ||
      !selectedScope ||
      !activeStar
    ) {
      return;
    }

    const currentParams = new URLSearchParams(window.location.search);
    const requestedBook = currentParams.get("book");
    const requestedScope = getChapterScopeById(
      manifestChapterScopes,
      currentParams.get("scope") ?? "",
    );
    const requestedStar = currentParams.get("star");
    const yearParam = currentParams.get("year");
    const requestedYear = yearParam === null ? Number.NaN : Number(yearParam);
    const hasValidScopeRequest =
      requestedScope !== null && requestedScope.bookId === requestedBook;
    const hasValidStarRequest =
      requestedStar !== null &&
      sceneStarNodes.some((star) => star.id === requestedStar);
    const stateHasCaughtUp =
      (!requestedBook || requestedBook === selectedScope.bookId) &&
      (!hasValidScopeRequest || requestedScope.id === selectedScope.id) &&
      (!hasValidStarRequest || requestedStar === activeStar.id) &&
      (!Number.isFinite(requestedYear) ||
        Math.abs(requestedYear - focalYear) < 0.01);

    if (!stateHasCaughtUp) {
      return;
    }

    pendingUrlHydrationRef.current = false;
    const params = new URLSearchParams();
    params.set("book", selectedScope.bookId);
    params.set("scope", selectedScope.id);
    params.set("year", focalYear.toFixed(1));
    params.set("star", activeStar.id);
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [activeStar, focalYear, manifestChapterScopes, sceneStarNodes, selectedScope]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      const nextYear = Number(
        Math.min(
          focalYear + 0.1 * playbackSpeed,
          timelineBounds.endYear,
        ).toFixed(1),
      );
      if (nextYear >= timelineBounds.endYear) {
        window.clearInterval(timer);
        setIsPlaying(false);
      }
      setFocalYear(nextYear);
    }, 120);
    return () => window.clearInterval(timer);
  }, [focalYear, isPlaying, playbackSpeed, setFocalYear, timelineBounds.endYear]);

  if (!selectedScope || !activeStar) return getEmptyState();

  function handleBookChange(bookId: string) {
    const nextScopes = getBookChapterScopes(manifestChapterScopes, bookId);
    const fallbackScope = nextScopes[0];
    if (!fallbackScope) return;

    setSelectedBookId(bookId);
    setSelectedChapterScopeId(fallbackScope.id);
    setSelectedEventId(null);
    setActiveInspectorTab("overview");
    setIsPlaying(false);
    const nextBounds = getScopeTimelineBounds(manifestBooks, fallbackScope);
    setFocalYear(clampYearToBounds(focalYear, nextBounds));
  }

  function handleChapterScopeChange(scopeId: string) {
    const nextScope = getChapterScopeById(manifestChapterScopes, scopeId);
    if (!nextScope) return;

    setSelectedBookId(nextScope.bookId);
    setSelectedChapterScopeId(nextScope.id);
    setSelectedEventId(null);
    setActiveInspectorTab("overview");
    setIsPlaying(false);
    const nextBounds = getScopeTimelineBounds(manifestBooks, nextScope);
    setFocalYear(clampYearToBounds(focalYear, nextBounds));
  }

  function handleYearChange(year: number) {
    setFocalYear(clampYearToBounds(year, timelineBounds));
  }

  function handleEventSelect(event: (typeof timelineEvents)[number]) {
    setSelectedEventId(event.id);
    setActiveInspectorTab("events");
    setIsPlaying(false);
    setFocalYear(clampYearToBounds(event.year, timelineBounds));
    if (event.starSystemId) setSelectedStarId(event.starSystemId);
  }

  function handleSearchResult(result: AtlasSearchResult) {
    setSearchQuery("");
    if (result.kind === "system") {
      setSelectedStarId(result.id);
      setActiveInspectorTab("overview");
    } else if (result.kind === "replicant") {
      const focusSystemId =
        result.replicant.movement.kind === "in-transit"
          ? result.replicant.movement.toSystemId
          : result.replicant.currentSystemId;
      setSelectedStarId(focusSystemId);
      setActiveInspectorTab("cast");
    } else {
      handleEventSelect(result.event);
    }
  }

  function handleTogglePlayback() {
    if (!isPlaying && focalYear >= timelineBounds.endYear - 0.05) {
      setFocalYear(timelineBounds.startYear);
    }
    setIsPlaying((playing) => !playing);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstResult = searchResults[0];
    if (firstResult) handleSearchResult(firstResult);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#atlas-main">Skip to atlas</a>

      <header className="app-header">
        <a className="brand-lockup" href="#top" aria-label={`${PROJECT_NAME} home`}>
          <span className="brand-mark" aria-hidden="true">B</span>
          <span>
            <strong>Bobiverse</strong>
            <small>Atlas / reader edition</small>
          </span>
        </a>

        <div className="header-search">
          <form role="search" onSubmit={handleSearchSubmit}>
            <label className="sr-only" htmlFor="atlas-search">
              Search systems, replicants, and events
            </label>
            <div className="search-input-wrap">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                ref={searchInputRef}
                id="atlas-search"
                type="search"
                value={searchQuery}
                placeholder="Search the known universe"
                autoComplete="off"
                aria-expanded={searchQuery.trim().length > 0}
                aria-controls="atlas-search-results"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <kbd>/</kbd>
            </div>
          </form>
          {searchQuery.trim() ? (
            <div id="atlas-search-results" className="search-results" role="listbox">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.kind}-${result.id}`}
                    type="button"
                    className="search-result"
                    onClick={() => handleSearchResult(result)}
                    role="option"
                  >
                    <span className={`search-result-icon ${result.kind}`} aria-hidden="true">
                      {getSearchIcon(result.kind)}
                    </span>
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.subtitle}</small>
                    </span>
                    <span className="search-result-arrow" aria-hidden="true">↗</span>
                  </button>
                ))
              ) : (
                <p className="search-empty">No visible records match “{searchQuery}”.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="header-actions">
          <span className="research-pill"><i /> Research preview</span>
          <a href="#methodology">Methodology</a>
        </div>
      </header>

      <section className="intro-panel" id="top">
        <div className="intro-copy">
          <p className="eyebrow">The Bobiverse / Books 1–3</p>
          <h1>Follow the <em>signal.</em><br />Lose the thread.</h1>
          <p>
            A spoiler-safe map of the worlds, replicants, and turning points
            that make the series feel bigger than the page.
          </p>
        </div>
        <div className="intro-metrics" aria-label="Atlas coverage">
          <div><strong>{formatCount(summary.count)}</strong><span>systems mapped</span></div>
          <div><strong>{formatCount(manifestBooks.length)}</strong><span>novels indexed</span></div>
          <div><strong>{formatCount(timelineEvents.length)}</strong><span>events in scope</span></div>
          <div><strong>{formatCount(knowledgeSources.length)}</strong><span>sources tracked</span></div>
        </div>
      </section>

      <div className="scope-status-bar" role="status">
        <span className="status-pulse" aria-hidden="true" />
        <p>
          <strong>Reading frontier:</strong> {selectedScope.label} · {formatCount(bobInstances.length)} active {bobInstances.length === 1 ? "replicant" : "replicants"} · {formatCount(travelSegments.length)} visible {travelSegments.length === 1 ? "route" : "routes"}
        </p>
        <span className="status-review">
          {pendingReviewCount} provisional {pendingReviewCount === 1 ? "record" : "records"} in this frame
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        Current story frame {formatAtlasYear(focalYear)}; focused system {activeStar.name}.
      </p>

      <main className="atlas-layout" id="atlas-main">
        <aside className="navigator-column" aria-label="Reading controls">
          <ScopeSelector
            books={manifestBooks}
            chapterScopes={selectedBookChapterScopes}
            selectedBookId={selectedScope.bookId}
            selectedChapterScopeId={selectedScope.id}
            onBookChange={handleBookChange}
            onChapterScopeChange={handleChapterScopeChange}
          />
          <TimelineSlider
            focalYear={focalYear}
            bounds={timelineBounds}
            chapterScopes={selectedBookChapterScopes}
            selectedScope={selectedScope}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            previousEvent={previousEvent}
            nextEvent={nextEvent}
            onYearChange={handleYearChange}
            onScopeChange={handleChapterScopeChange}
            onEventStep={handleEventSelect}
            onTogglePlayback={handleTogglePlayback}
            onPlaybackSpeedChange={setPlaybackSpeed}
          />
          <section className="coverage-card" aria-labelledby="coverage-heading">
            <div className="section-heading">
              <div>
                <p className="rail-label">Series index</p>
                <h2 id="coverage-heading">Mapped volumes</h2>
              </div>
              <span>{manifestBooks.length} books</span>
            </div>
            <ol className="volume-list">
              {manifestBooks.map((book) => (
                <li key={book.id} className={book.id === selectedBookId ? "active" : undefined}>
                  <button type="button" onClick={() => handleBookChange(book.id)}>
                    <span className="volume-number">{String(book.order).padStart(2, "0")}</span>
                    <span>
                      <strong>{book.shortTitle}</strong>
                      <small>{book.title}</small>
                    </span>
                    <span className="volume-boundary">
                      {getBookChapterScopes(manifestChapterScopes, book.id).length} points
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </aside>

        <section className="map-column" aria-labelledby="map-heading">
          <section className="map-stage">
            <div className="stage-header">
              <div>
                <p className="rail-label">Spatial index</p>
                <h2 id="map-heading">The known neighborhood</h2>
                <p>Drag to orbit · scroll to zoom · select a system to inspect</p>
                <p className="stage-caption">Schematic 3D view · positions use catalog RA/Dec/distance</p>
              </div>
              <div className="stage-toolbar" role="group" aria-label="Map view">
                <button
                  type="button"
                  className={mapMode === "spatial" ? "active" : undefined}
                  aria-pressed={mapMode === "spatial"}
                  onClick={() => setMapMode("spatial")}
                >
                  <span aria-hidden="true">◌</span> Spatial
                </button>
                <button
                  type="button"
                  className={mapMode === "directory" ? "active" : undefined}
                  aria-pressed={mapMode === "directory"}
                  onClick={() => setMapMode("directory")}
                >
                  <span aria-hidden="true">☷</span> Directory
                </button>
                <button
                  type="button"
                  className="reset-view"
                  onClick={() => setSelectedStarId("sol")}
                  aria-label="Reset map view to Sol"
                >
                  <span aria-hidden="true">↺</span> Reset
                </button>
              </div>
            </div>

            <div className="star-index" aria-label="Quick system selection">
              {sceneStarNodes.map((star) => (
                <button
                  key={star.id}
                  type="button"
                  className={star.id === activeStar.id ? "active" : undefined}
                  aria-pressed={star.id === activeStar.id}
                  onClick={() => setSelectedStarId(star.id)}
                >
                  <i style={{ backgroundColor: star.color }} aria-hidden="true" />
                  {star.name}
                </button>
              ))}
            </div>

            {mapMode === "spatial" ? (
              <div className="scene-frame">
                <div className="scene-corner scene-corner-top">
                  <span>LOCAL FRAME</span>
                  <strong>{formatAtlasYear(focalYear)}</strong>
                </div>
                <div className="scene-corner scene-corner-bottom">
                  <span><i className="legend-dot star" /> System</span>
                  <span><i className="legend-dot bob" /> Replicant</span>
                  <span><i className="legend-line" /> Sourced route</span>
                </div>
                <Suspense
                  fallback={
                    <div className="scene-loading" role="status">
                      <span className="loading-orbit" aria-hidden="true" />
                      <strong>Loading the spatial index</strong>
                      <small>Preparing coordinates and routes…</small>
                    </div>
                  }
                >
                  <SceneErrorBoundary
                    fallback={
                      <div className="scene-fallback" role="alert">
                        <span className="empty-orbit" aria-hidden="true">✦</span>
                        <strong>Spatial view unavailable</strong>
                        <p>Switch to Directory to explore every mapped system without WebGL.</p>
                        <button type="button" onClick={() => setMapMode("directory")}>
                          Open directory <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    }
                  >
                    <LazyStarfieldScene
                      stars={sceneStarNodes}
                      selectedStarId={activeStar.id}
                      travelSegments={travelSegments}
                      events={timelineEvents}
                      bobs={bobInstances}
                      onSelectStar={setSelectedStarId}
                    />
                  </SceneErrorBoundary>
                </Suspense>
              </div>
            ) : (
              <div className="directory-mode-frame">
                <SystemDirectory
                  stars={sceneStarNodes}
                  bobs={bobInstances}
                  events={timelineEvents}
                  selectedStarId={activeStar.id}
                  onSelectStar={setSelectedStarId}
                />
              </div>
            )}

            {mapMode === "spatial" ? (
              <SystemDirectory
                stars={sceneStarNodes}
                bobs={bobInstances}
                events={timelineEvents}
                selectedStarId={activeStar.id}
                onSelectStar={setSelectedStarId}
              />
            ) : null}
          </section>
        </section>

        <InspectorPanel
          activeTab={activeInspectorTab}
          activeStar={activeStar}
          activeStarNote={activeStarNote}
          bobs={bobInstances}
          events={timelineEvents}
          focalYear={focalYear}
          segments={travelSegments}
          sourceById={sourceById}
          starById={starById}
          selectedEventId={selectedEventId}
          sourceIds={visibleSourceIds}
          onTabChange={setActiveInspectorTab}
          onSelectEvent={handleEventSelect}
          onSelectStar={setSelectedStarId}
        />
      </main>

      <section className="methodology-section" id="methodology" aria-labelledby="methodology-heading">
        <div className="methodology-intro">
          <p className="rail-label">How to read this atlas</p>
          <h2 id="methodology-heading">Curated for curiosity.<br /><em>Honest about uncertainty.</em></h2>
        </div>
        <div className="methodology-cards">
          <article><span>01</span><h3>Novels first</h3><p>Published books are the canon. Secondary timelines help discovery, never default truth.</p></article>
          <article><span>02</span><h3>Scope before spoilers</h3><p>Your reading frontier filters events, identities, and routes—not just dates.</p></article>
          <article><span>03</span><h3>Movement, modeled</h3><p>Routes are sourced story records; the 3D view visualizes their state, not physical distance.</p></article>
        </div>
      </section>

      <footer className="app-footer">
        <span><span className="brand-mark mini" aria-hidden="true">B</span> {PROJECT_NAME}</span>
        <span>Books 1–3 · research preview · {formatCount(summary.count)} systems</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  );
}

export default App;
