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
  getBookChapterScopes,
  getChapterScopeById,
  getManifestBooks,
  getManifestChapterScopes,
  getNeighborhoodSummary,
  getScopeTimelineBounds,
  getScopedBobInstances,
  getScopedTimelineEvents,
  getScopedTravelSegments,
} from "@bobiverse/simulation";
import "./App.css";
import { EventLogPanel } from "./components/EventLogPanel";
import { ScopeSelector } from "./components/ScopeSelector";
import { StarfieldScene } from "./components/StarfieldScene";
import { TimelineSlider } from "./components/TimelineSlider";
import { useStarMapStore } from "./store/useStarMapStore";

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

  const sceneStarNodes = buildSceneStarNodes(seedStarSystems);
  const summary = getNeighborhoodSummary(seedStarSystems);
  const manifestBooks = getManifestBooks(atlasBooks, atlasSeriesManifest);
  const manifestChapterScopes = getManifestChapterScopes(
    atlasChapterScopes,
    atlasSeriesManifest,
  );
  const selectedBookChapterScopes = getBookChapterScopes(
    manifestChapterScopes,
    selectedBookId,
  );
  const selectedScope =
    getChapterScopeById(manifestChapterScopes, selectedChapterScopeId) ??
    selectedBookChapterScopes.at(-1) ??
    manifestChapterScopes.at(-1);
  const activeStar =
    sceneStarNodes.find((star) => star.id === selectedStarId) ??
    sceneStarNodes[0];

  if (!selectedScope) {
    return null;
  }

  const timelineBounds = getScopeTimelineBounds(manifestBooks, selectedScope);
  const timelineEvents = getScopedTimelineEvents(
    atlasTimelineEvents,
    manifestBooks,
    manifestChapterScopes,
    selectedScope,
    focalYear,
  );
  const travelSegments = getScopedTravelSegments(
    atlasTravelSegments,
    manifestBooks,
    manifestChapterScopes,
    selectedScope,
    focalYear,
  );
  const bobInstances = getScopedBobInstances(
    atlasBobInstances,
    atlasTravelSegments,
    manifestBooks,
    manifestChapterScopes,
    selectedScope,
    focalYear,
  );
  const sourceById = new Map(
    knowledgeSources.map((source) => [source.id, source]),
  );
  const primarySourceCount = knowledgeSources.filter(
    (source) => source.authority === "primary",
  ).length;
  const pendingReviewCount = timelineEvents.filter(
    (event) => event.reviewStatus === "pending-review",
  ).length;
  const disputedEventCount = timelineEvents.filter(
    (event) => event.reviewStatus === "disputed",
  ).length;

  function handleBookChange(bookId: string) {
    const nextScopes = getBookChapterScopes(manifestChapterScopes, bookId);
    // Select the book's first curated boundary so changing books never
    // discloses its finale without the reader explicitly choosing it.
    const fallbackScope = nextScopes[0];
    if (!fallbackScope) {
      return;
    }

    setSelectedBookId(bookId);
    setSelectedChapterScopeId(fallbackScope.id);

    const nextBounds = getScopeTimelineBounds(manifestBooks, fallbackScope);
    setFocalYear(clampYearToBounds(focalYear, nextBounds));
  }

  function handleChapterScopeChange(scopeId: string) {
    const nextScope = getChapterScopeById(manifestChapterScopes, scopeId);
    if (!nextScope) {
      return;
    }

    setSelectedBookId(nextScope.bookId);
    setSelectedChapterScopeId(nextScope.id);

    const nextBounds = getScopeTimelineBounds(manifestBooks, nextScope);
    setFocalYear(clampYearToBounds(focalYear, nextBounds));
  }

  function handleYearChange(year: number) {
    setFocalYear(clampYearToBounds(year, timelineBounds));
  }

  return (
    <div className="app-shell">
      <header className="masthead editorial-panel">
        <div className="masthead-copy">
          <p className="eyebrow">Interstellar Atlas</p>
          <h1>{PROJECT_NAME}</h1>
          <p className="hero-copy">
            An editorial map-room for tracing Bobiverse chronology, stellar
            movement, and reviewable narrative evidence across the first three
            novels.
          </p>
        </div>
        <div className="masthead-ledger">
          <div>
            <span>Seed systems</span>
            <strong>{summary.count}</strong>
          </div>
          <div>
            <span>Primary volumes</span>
            <strong>{primarySourceCount}</strong>
          </div>
          <div>
            <span>Tracked sources</span>
            <strong>{knowledgeSources.length}</strong>
          </div>
          <div>
            <span>Visible events</span>
            <strong>{timelineEvents.length}</strong>
          </div>
          <div>
            <span>Focus year</span>
            <strong>{Math.round(focalYear)}</strong>
          </div>
        </div>
      </header>

      <main className="atlas-layout">
        <section className="story-column">
          <section className="editorial-panel story-panel">
            <ScopeSelector
              books={manifestBooks}
              chapterScopes={selectedBookChapterScopes}
              selectedBookId={selectedScope.bookId}
              selectedChapterScopeId={selectedScope.id}
              manifestLabel={atlasSeriesManifest.label}
              onBookChange={handleBookChange}
              onChapterScopeChange={handleChapterScopeChange}
            />
          </section>

          <section className="editorial-panel chronology-panel">
            <div className="panel-heading">
              <p className="rail-label">Chronology navigator</p>
              <h2>Slide through the reading frontier</h2>
            </div>
            <TimelineSlider
              focalYear={focalYear}
              bounds={timelineBounds}
              chapterScopes={selectedBookChapterScopes}
              selectedScope={selectedScope}
              onYearChange={handleYearChange}
            />
          </section>

          <section className="editorial-panel coverage-panel">
            <div className="panel-heading">
              <p className="rail-label">Series coverage</p>
              <h2>Books currently mapped</h2>
            </div>
            <ul className="content-list">
              {manifestBooks.map((book) => (
                <li key={book.id}>
                  {book.shortTitle} · {book.chapterCount} chapters
                </li>
              ))}
            </ul>
          </section>
        </section>

        <section className="map-stage editorial-panel">
          <div className="scene-header">
            <div>
              <p className="rail-label">Stellar stage</p>
              <h2>Neighborhood atlas</h2>
            </div>
            <div className="star-pills" aria-label="Available seed stars">
              {sceneStarNodes.map((star) => (
                <button
                  key={star.id}
                  type="button"
                  className={
                    star.id === activeStar.id ? "star-pill active" : "star-pill"
                  }
                  onClick={() => setSelectedStarId(star.id)}
                >
                  {star.name}
                </button>
              ))}
            </div>
          </div>

          <div className="scene-frame">
            <StarfieldScene
              stars={sceneStarNodes}
              selectedStarId={activeStar.id}
              travelSegments={travelSegments}
              onSelectStar={setSelectedStarId}
            />
          </div>
        </section>

        <aside className="evidence-column">
          <section className="editorial-panel focus-panel">
            <div className="panel-heading focus-heading">
              <p className="rail-label">System focus</p>
              <strong>{activeStar.name}</strong>
            </div>
            <p>
              {activeStar.note ??
                "Reference star carried into the editorial atlas for neighborhood staging."}
            </p>
            <dl className="stat-grid">
              <div>
                <dt>Distance</dt>
                <dd>{activeStar.distanceLy.toFixed(2)} ly</dd>
              </div>
              <div>
                <dt>RA / Dec</dt>
                <dd>
                  {activeStar.raHours.toFixed(2)}h /{" "}
                  {activeStar.decDegrees.toFixed(2)}°
                </dd>
              </div>
            </dl>
          </section>

          <section className="editorial-panel dossier-panel">
            <div className="panel-heading">
              <p className="rail-label">Evidence status</p>
              <h2>Current scope dossier</h2>
            </div>
            <ul className="content-list compact">
              <li>{selectedScope.label} current reading frontier</li>
              <li>
                {Math.floor(timelineBounds.startYear)} to{" "}
                {Math.ceil(timelineBounds.endYear)} visible years
              </li>
              <li>
                {pendingReviewCount} visible events still pending source review
              </li>
              <li>{disputedEventCount} visible events currently disputed</li>
              <li>
                {manifestChapterScopes.length} curated chapter boundaries in
                scope
              </li>
            </ul>
            <p className="card-footnote">
              Canon policy: books first, secondary sources only for discovery or
              corroboration.
            </p>
          </section>

          <section className="editorial-panel replicant-panel">
            <div className="panel-heading">
              <p className="rail-label">Replicant ledger</p>
              <h2>Who is active in this frame</h2>
            </div>
            {bobInstances.length === 0 ? (
              <p className="card-footnote">
                No replicants are active at this reading frontier and focal
                year.
              </p>
            ) : (
              <ul className="content-list compact">
                {bobInstances.map((bob) => {
                  const locationStar = sceneStarNodes.find(
                    (star) => star.id === bob.currentSystemId,
                  );
                  return (
                    <li key={bob.id}>
                      {bob.name} · generation {bob.generation} ·{" "}
                      {locationStar?.name ?? bob.currentSystemId}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <EventLogPanel
            events={timelineEvents}
            focalYear={focalYear}
            sourceById={sourceById}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
