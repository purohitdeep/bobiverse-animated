import type { KnowledgeSource, ReviewStatus } from "@bobiverse/domain";
import {
  formatAtlasYear,
  type BobInstanceState,
  type SceneStarNode,
  type TimelineEventState,
  type TravelSegmentState,
} from "@bobiverse/simulation";
import { EventLogPanel } from "./EventLogPanel";
import { INSPECTOR_TABS, type InspectorTab } from "../store/viewState";

export type { InspectorTab };

interface InspectorPanelProps {
  activeTab: InspectorTab;
  activeStar: SceneStarNode;
  activeStarNote?: string | undefined;
  bobs: BobInstanceState[];
  events: TimelineEventState[];
  focalYear: number;
  segments: TravelSegmentState[];
  sourceById: Map<string, KnowledgeSource>;
  starById: Map<string, SceneStarNode>;
  selectedEventId: string | null;
  sourceIds: string[];
  onTabChange: (tab: InspectorTab) => void;
  onSelectEvent: (event: TimelineEventState) => void;
  onSelectStar: (starId: string) => void;
}

const TABS = INSPECTOR_TABS.map((id) => ({
    id,
    label: id === "overview" ? "Overview" : id === "events" ? "Story" : id === "cast" ? "Cast" : "Sources",
}));

function formatStatus(status: ReviewStatus) {
  return status.replace(/-/g, " ");
}

function movementLabel(bob: BobInstanceState) {
  if (bob.movement.kind === "in-transit") {
    return `In transit · ${Math.round(bob.movement.progress * 100)}%`;
  }
  if (bob.movement.kind === "arrived") return "Arrived";
  return "Stationary";
}

export function InspectorPanel({
  activeTab,
  activeStar,
  activeStarNote,
  bobs,
  events,
  focalYear,
  segments,
  sourceById,
  starById,
  selectedEventId,
  sourceIds,
  onTabChange,
  onSelectEvent,
  onSelectStar,
}: InspectorPanelProps) {
  const starEvents = events.filter((event) => event.starSystemId === activeStar.id);
  const residents = bobs.filter(
    (bob) =>
      bob.currentSystemId === activeStar.id &&
      bob.movement.kind !== "in-transit",
  );
  const transitVisitors = bobs.filter(
    (bob) =>
      bob.movement.kind === "in-transit" &&
      bob.movement.fromSystemId === activeStar.id,
  );
  const starSegments = segments.filter(
    (segment) =>
      segment.fromSystemId === activeStar.id || segment.toSystemId === activeStar.id,
  );
  const visibleSourceIds = Array.from(
    new Set([
      ...sourceIds,
      ...starEvents.flatMap((event) => event.sourceIds),
      ...bobs.flatMap((bob) => bob.sourceIds),
      ...segments.flatMap((segment) => segment.sourceIds),
    ]),
  );
  const bobNameById = new Map(bobs.map((bob) => [bob.id, bob.name]));
  const systemDescription =
    activeStarNote ??
    (activeStar.note
      ? "Verified coordinates are available here. Its narrative annotation stays hidden until the revealing chapter is in your frontier."
      : "A catalogued system in the local interstellar reference frame.");

  return (
    <aside className="inspector-panel" aria-label="Atlas inspector">
      <div className="inspector-topline">
        <div>
          <p className="rail-label">Inspector</p>
          <h2>{activeStar.name}</h2>
        </div>
        <span className={`status-badge ${activeStar.reviewStatus}`}>
          {formatStatus(activeStar.reviewStatus)}
        </span>
      </div>

      <div className="inspector-tabs" role="tablist" aria-label="Inspector views">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`inspector-panel-${tab.id}`}
            id={`inspector-tab-${tab.id}`}
            className={activeTab === tab.id ? "active" : undefined}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {tab.id === "events" ? <span>{events.length}</span> : null}
            {tab.id === "cast" ? <span>{bobs.length}</span> : null}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div
          className="inspector-body"
          id="inspector-panel-overview"
          role="tabpanel"
          aria-labelledby="inspector-tab-overview"
        >
          <p className="inspector-lede">{systemDescription}</p>
          <dl className="metric-grid">
            <div>
              <dt>Distance</dt>
              <dd>{activeStar.distanceLy.toFixed(2)} <small>ly</small></dd>
            </div>
            <div>
              <dt>Right ascension</dt>
              <dd>{activeStar.raHours.toFixed(2)} <small>h</small></dd>
            </div>
            <div>
              <dt>Declination</dt>
              <dd>{activeStar.decDegrees.toFixed(2)}<small>°</small></dd>
            </div>
            <div>
              <dt>Story events</dt>
              <dd>{starEvents.length}</dd>
            </div>
          </dl>

          <div className="inspector-section">
            <div className="section-heading">
              <h3>In this frame</h3>
              <span>{formatAtlasYear(focalYear)}</span>
            </div>
            {residents.length > 0 || transitVisitors.length > 0 ? (
              <div className="mini-roster">
                {residents.map((bob) => (
                  <button
                    key={bob.id}
                    type="button"
                    className="mini-roster-item"
                    onClick={() => onSelectStar(bob.currentSystemId)}
                  >
                    <span className="avatar-mark" aria-hidden="true">
                      {bob.name.slice(0, 1)}
                    </span>
                    <span>
                      <strong>{bob.name}</strong>
                      <small>{movementLabel(bob)}</small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
                {transitVisitors.map((bob) => {
                  const movement = bob.movement;
                  if (movement.kind !== "in-transit") return null;
                  const destination =
                    starById.get(movement.toSystemId)?.name ??
                    movement.toSystemId;
                  return (
                    <button
                      key={bob.id}
                      type="button"
                      className="mini-roster-item transit"
                      onClick={() => onSelectStar(movement.toSystemId)}
                    >
                      <span className="avatar-mark" aria-hidden="true">
                        {bob.name.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{bob.name}</strong>
                        <small>
                          Passing through · {Math.round(movement.progress * 100)}% → {destination}
                        </small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="muted-empty">No visible replicant is stationed here.</p>
            )}
          </div>

          <div className="inspector-section">
            <div className="section-heading">
              <h3>Known routes</h3>
              <span>{starSegments.length}</span>
            </div>
            {starSegments.length > 0 ? (
              <ul className="route-list">
                {starSegments.map((segment) => {
                  const from = starById.get(segment.fromSystemId)?.name ?? segment.fromSystemId;
                  const to = starById.get(segment.toSystemId)?.name ?? segment.toSystemId;
                  return (
                    <li key={segment.id}>
                      <span className="route-line" aria-hidden="true">→</span>
                      <span>
                        <strong>{from} <span>to</span> {to}</strong>
                        <small>
                          {formatAtlasYear(segment.departureYear)} — {formatAtlasYear(segment.arrivalYear)} · {segment.state.replace(/-/g, " ")}
                        </small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted-empty">No sourced route is visible in this scope.</p>
            )}
          </div>

          <div className="trust-note">
            <span className="trust-icon" aria-hidden="true">i</span>
            <p>
              <strong>Evidence before certainty.</strong> This view includes
              only records inside your reading frontier. Open Sources to see
              what still needs review.
            </p>
          </div>
        </div>
      ) : null}

      {activeTab === "events" ? (
        <div
          className="inspector-body"
          id="inspector-panel-events"
          role="tabpanel"
          aria-labelledby="inspector-tab-events"
        >
          <EventLogPanel
            events={events}
            focalYear={focalYear}
            sourceById={sourceById}
            starById={starById}
            bobById={new Map(bobs.map((bob) => [bob.id, bob]))}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
          />
        </div>
      ) : null}

      {activeTab === "cast" ? (
        <div
          className="inspector-body"
          id="inspector-panel-cast"
          role="tabpanel"
          aria-labelledby="inspector-tab-cast"
        >
          <div className="section-heading cast-heading">
            <div>
              <p className="rail-label">Replicant index</p>
              <h3>Who is visible?</h3>
            </div>
            <span>{bobs.length} active</span>
          </div>
          {bobs.length > 0 ? (
            <div className="cast-list">
              {bobs.map((bob) => {
                const currentLocation =
                  starById.get(bob.currentSystemId)?.name ?? bob.currentSystemId;
                const location =
                  bob.movement.kind === "in-transit"
                    ? `${starById.get(bob.movement.fromSystemId)?.name ?? bob.movement.fromSystemId} → ${starById.get(bob.movement.toSystemId)?.name ?? bob.movement.toSystemId}`
                    : currentLocation;
                const focusStarId =
                  bob.movement.kind === "in-transit"
                    ? bob.movement.toSystemId
                    : bob.currentSystemId;
                return (
                  <button
                    key={bob.id}
                    type="button"
                    className="cast-card"
                    onClick={() => onSelectStar(focusStarId)}
                  >
                    <span className="avatar-mark large" aria-hidden="true">
                      {bob.name.slice(0, 1)}
                    </span>
                    <span className="cast-card-copy">
                      <strong>{bob.name}</strong>
                      <small>
                        Generation {bob.generation} · {bob.parentId && bobNameById.get(bob.parentId) ? `Child of ${bobNameById.get(bob.parentId)}` : "Original identity"}
                      </small>
                      <small>{movementLabel(bob)} · {formatStatus(bob.reviewStatus)}</small>
                      <small className="cast-location">⌁ {location}</small>
                    </span>
                    <span className="cast-arrow" aria-hidden="true">↗</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">◌</span>
              <p>No replicant has been revealed at this point in the story.</p>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "sources" ? (
        <div
          className="inspector-body"
          id="inspector-panel-sources"
          role="tabpanel"
          aria-labelledby="inspector-tab-sources"
        >
          <div className="section-heading cast-heading">
            <div>
              <p className="rail-label">Evidence desk</p>
              <h3>Sources in play</h3>
            </div>
            <span>{visibleSourceIds.length}</span>
          </div>
          <p className="source-warning">
            Novels are the canon. Secondary links are discovery aids and may
            contain spoilers outside your selected frontier.
          </p>
          <div className="source-list">
            {visibleSourceIds.map((sourceId) => {
              const source = sourceById.get(sourceId);
              if (!source) return null;
              return (
                <article key={source.id} className="source-card">
                  <div className="source-card-topline">
                    <span className={`source-authority ${source.authority}`}>
                      {source.authority}
                    </span>
                    {source.scope ? <small>{source.scope}</small> : null}
                  </div>
                  <h4>{source.label}</h4>
                  {source.note ? <p>{source.note}</p> : null}
                  <a href={source.href} target="_blank" rel="noreferrer">
                    {source.authority === "primary" ? "Open primary text" : "Open reference · may spoil"}
                    <span aria-hidden="true">↗</span>
                  </a>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
