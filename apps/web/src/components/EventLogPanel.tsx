import type { KnowledgeSource, ReviewStatus } from "@bobiverse/domain";
import type { TimelineEventState } from "@bobiverse/simulation";

interface EventLogPanelProps {
  events: TimelineEventState[];
  focalYear: number;
  sourceById: Map<string, KnowledgeSource>;
}

function formatYear(year: number) {
  return Number.isInteger(year) ? String(year) : year.toFixed(1);
}

function formatReviewStatus(status: ReviewStatus) {
  return status.replace(/-/g, " ");
}

export function EventLogPanel({
  events,
  focalYear,
  sourceById,
}: EventLogPanelProps) {
  return (
    <section className="event-log-panel">
      <div className="event-log-header">
        <div>
          <p className="rail-label">Evidence log</p>
          <h3 className="event-log-title">Chronology dossier</h3>
        </div>
        <strong className="event-log-meta">
          Frame {formatYear(focalYear)}
        </strong>
      </div>
      <ol className="event-log-list">
        {events.map((event) => (
          <li key={event.id} className={`event-log-item ${event.state}`}>
            <span className="event-log-year">{formatYear(event.year)}</span>
            <div>
              <div className="event-log-topline">
                <p className="event-log-type">{event.type.replace(/-/g, " ")}</p>
                <span
                  className={`status-badge ${event.reviewStatus}`}
                  aria-label={`Review status ${formatReviewStatus(event.reviewStatus)}`}
                >
                  {formatReviewStatus(event.reviewStatus)}
                </span>
              </div>
              <p className="event-log-label">{event.label}</p>
              <ul className="event-source-list" aria-label="Event sources">
                {event.sourceIds.map((sourceId) => {
                  const source = sourceById.get(sourceId);
                  if (!source) {
                    return (
                      <li key={sourceId} className="event-source-chip unknown">
                        Unknown source {sourceId}
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
                      >
                        {source.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
              {event.evidenceNote ? (
                <p className="event-log-evidence">{event.evidenceNote}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
