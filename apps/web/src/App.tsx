import {
  atlasBooks,
  atlasChapterScopes,
  atlasSeriesManifest,
  seedStarSystems,
} from "@bobiverse/data";
import { PROJECT_NAME } from "@bobiverse/domain";
import {
  buildSceneStarNodes,
  getManifestBooks,
  getNeighborhoodSummary,
  getTimelineBounds,
} from "@bobiverse/simulation";
import "./App.css";
import { StarfieldScene } from "./components/StarfieldScene";
import { useStarMapStore } from "./store/useStarMapStore";

function App() {
  const selectedStarId = useStarMapStore((state) => state.selectedStarId);
  const setSelectedStarId = useStarMapStore((state) => state.setSelectedStarId);
  const focalYear = useStarMapStore((state) => state.focalYear);
  const setFocalYear = useStarMapStore((state) => state.setFocalYear);

  const sceneStarNodes = buildSceneStarNodes(seedStarSystems);
  const summary = getNeighborhoodSummary(seedStarSystems);
  const manifestBooks = getManifestBooks(atlasBooks, atlasSeriesManifest);
  const timelineBounds = getTimelineBounds(manifestBooks, atlasChapterScopes);
  const activeStar =
    sceneStarNodes.find((star) => star.id === selectedStarId) ??
    sceneStarNodes[0];

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
            <p className="rail-label">Atlas scope</p>
            <h2>Scene, timeline, and content</h2>
            <p>
              The app is being built around validated content packages so new
              books can be added through data and manifests instead of renderer
              rewrites.
            </p>
            <p className="card-footnote">
              Active manifest: {atlasSeriesManifest.label}
            </p>
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
            <label className="rail-label" htmlFor="year-range">
              Story frame year
            </label>
            <input
              id="year-range"
              type="range"
              min={String(Math.floor(timelineBounds.startYear))}
              max={String(Math.ceil(timelineBounds.endYear))}
              step="1"
              value={focalYear}
              onChange={(event) => setFocalYear(Number(event.target.value))}
            />
            <p className="slider-caption">
              Timeline state will be driven by reading scope, chapter cutoffs,
              replicant events, and travel segments from the shared simulation
              layer.
            </p>
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
              <li>{Math.floor(timelineBounds.startYear)} earliest visible year</li>
              <li>{Math.ceil(timelineBounds.endYear)} latest visible year</li>
              <li>Canonical star systems</li>
              <li>{atlasChapterScopes.length} validated chapter scopes</li>
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
        </section>
      </main>
    </div>
  );
}

export default App;
