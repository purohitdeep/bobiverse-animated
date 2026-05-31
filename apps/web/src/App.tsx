import {
  atlasBooks,
  atlasChapterScopes,
  atlasSeriesManifest,
  atlasTimelineEvents,
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
  getScopedTimelineEvents,
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
    selectedScope.bookId,
    selectedScope.maxYear,
    focalYear,
  );

  function handleBookChange(bookId: string) {
    const nextScopes = getBookChapterScopes(manifestChapterScopes, bookId);
    const fallbackScope = nextScopes.at(-1);
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
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Interstellar Atlas</p>
          <h1>{PROJECT_NAME}</h1>
          <p className="hero-copy">
            A cinematic 3D interface for exploring Bobiverse star systems,
            timeline state, and long-range movement across the local stellar
            neighborhood.
          </p>
        </div>
        <div className="hero-metrics">
          <div>
            <span>Seed systems</span>
            <strong>{summary.count}</strong>
          </div>
          <div>
            <span>Books covered</span>
            <strong>{manifestBooks.length}</strong>
          </div>
          <div>
            <span>Current focus year</span>
            <strong>{Math.round(focalYear)}</strong>
          </div>
        </div>
      </header>

      <main className="layout-grid">
        <aside className="control-rail">
          <section className="rail-card">
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

          <section className="rail-card">
            <div className="rail-header">
              <p className="rail-label">Scene focus</p>
              <strong>{activeStar.name}</strong>
            </div>
            <p>
              {activeStar.note ??
                "Canonical star seed carried into the new modular atlas."}
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

          <section className="rail-card">
            <TimelineSlider
              focalYear={focalYear}
              bounds={timelineBounds}
              chapterScopes={selectedBookChapterScopes}
              selectedScope={selectedScope}
              onYearChange={handleYearChange}
            />
          </section>

          <section className="rail-card">
            <p className="rail-label">Content model</p>
            <ul className="content-list">
              {manifestBooks.map((book) => (
                <li key={book.id}>
                  {book.shortTitle} · {book.chapterCount} chapters
                </li>
              ))}
            </ul>
          </section>

          <section className="rail-card">
            <p className="rail-label">Timeline bounds</p>
            <ul className="content-list">
              <li>
                {Math.floor(timelineBounds.startYear)} earliest visible year
              </li>
              <li>{Math.ceil(timelineBounds.endYear)} latest visible year</li>
              <li>{timelineEvents.length} scope-visible events</li>
              <li>{manifestChapterScopes.length} validated chapter scopes</li>
            </ul>
          </section>
        </aside>

        <section className="scene-panel">
          <div className="scene-header">
            <div>
              <p className="rail-label">3D neighborhood view</p>
              <h2>Interstellar staging view</h2>
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
              onSelectStar={setSelectedStarId}
            />
          </div>

          <EventLogPanel events={timelineEvents} focalYear={focalYear} />
        </section>
      </main>
    </div>
  );
}

export default App;
