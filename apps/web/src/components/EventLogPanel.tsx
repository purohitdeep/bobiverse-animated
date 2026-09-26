import { useState } from "react";
import type { KnowledgeSource, ReviewStatus } from "@bobiverse/domain";
import {
  formatAtlasYear,
  type BobInstanceState,
  type SceneStarNode,
  type TimelineEventState,
} from "@bobiverse/simulation";

interface EventLogPanelProps {
  events: TimelineEventState[];
  focalYear: number;
  sourceById: Map<string, KnowledgeSource>;
  starById: Map<string, SceneStarNode>;
  bobById: Map<string, BobInstanceState>;
  selectedEventId: string | null;
  onSelectEvent: (event: TimelineEventState) => void;
}

type EventFilter = "all" | "reached" | "later";

function formatReviewStatus(status: ReviewStatus) {
  return status.replace(/-/g, " ");
}

function getStateLabel(event: TimelineEventState) {
  if (event.state === "active") return "Current frame";
  if (event.state === "past") return "Reached";
  return "Later in scope";
}

export function EventLogPanel({
  events,
  focalYear,
  sourceById,
  starById,
  bobById,
  selectedEventId,
  onSelectEvent,
}: EventLogPanelProps) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const filteredEvents = events.filter((event) => {
    if (filter === "reached") return event.state !== "future";
    if (filter === "later") return event.state === "future";
    return true;
  });
  const reachedCount = events.filter((event) => event.state !== "future").length;

  return (
    <section className="event-log-panel" aria-labelledby="event-log-heading">
      <div className="event-log-header">
        <div>
          <p className="rail-label">Story ledger</p>
          <h3 id="event-log-heading">Events in your scope</h3>
        </div>
        <span className="frame-chip">Frame {formatAtlasYear(focalYear)}</span>
      </div>

      <p className="event-source-warning">
        <span aria-hidden="true">↗</span> Source links can contain spoilers beyond this frontier.
      </p>

      <div className="event-filters" role="group" aria-label="Filter events">
        {([
          ["all", "All", events.length],
          ["reached", "Reached", reachedCount],
          ["later", "Later", events.length - reachedCount],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "active" : undefined}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label} <span>{count}</span>
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="empty-state compact">
          <span aria-hidden="true">◇</span>
          <p>No events match this view.</p>
        </div>
      ) : (
        <ol className="event-log-list">
          {filteredEvents.map((event) => {
            const selected = event.id === selectedEventId;
            const star = event.starSystemId
              ? starById.get(event.starSystemId)
              : undefined;
            const relatedBobs = event.bobIds
              .map((bobId) => bobById.get(bobId)?.name)
              .filter((name): name is string => Boolean(name));

            return (
              <li
                key={event.id}
                className={`event-log-item ${event.state}${selected ? " selected" : ""}`}
              >
                <button
                  type="button"
                  className="event-select"
                  onClick={() => onSelectEvent(event)}
                  aria-current={selected ? "true" : undefined}
                >
                  <span className="event-log-year">
                    {formatAtlasYear(event.year)}
                  </span>
                  <span className="event-log-content">
                    <span className="event-log-topline">
                      <span className="event-log-type">
                        {getStateLabel(event)} · {event.type.replace(/-/g, " ")}
                      </span>
                      <span
                        className={`status-badge ${event.reviewStatus}`}
                        title={event.evidenceNote ?? "Evidence status"}
                      >
                        {formatReviewStatus(event.reviewStatus)}
                      </span>
                    </span>
                    <span className="event-log-label">{event.label}</span>
                    {(star || relatedBobs.length > 0) && (
                      <span className="event-relations">
                        {star ? <span>⌁ {star.name}</span> : null}
                        {relatedBobs.length > 0 ? (
                          <span>◉ {relatedBobs.join(", ")}</span>
                        ) : null}
                      </span>
                    )}
                  </span>
                </button>

                <ul className="event-source-list" aria-label="Event sources">
                  {event.sourceIds.map((sourceId) => {
                    const source = sourceById.get(sourceId);
                    if (!source) {
                      return (
                        <li key={sourceId} className="event-source-chip unknown">
                          Unknown source
                        </li>
                      );
                    }
                    return (
                      <li key={sourceId}>
                        <a
                          className={`event-source-chip ${source.authority}`}
                          href={source.href}
                          target="_blank"
                          rel="noreferrer"
                          title={source.note}
                        >
                          {source.authority === "primary" ? "Primary" : source.authority}
                        </a>
                      </li>
                    );
                  })}
                </ul>

                {event.evidenceNote ? (
                  <details className="evidence-details">
                    <summary>Evidence note</summary>
                    <p>{event.evidenceNote}</p>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
