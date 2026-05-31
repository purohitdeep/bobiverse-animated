import type { TimelineEventState } from "@bobiverse/simulation";

interface EventLogPanelProps {
  events: TimelineEventState[];
  focalYear: number;
}

function formatYear(year: number) {
  return Number.isInteger(year) ? String(year) : year.toFixed(1);
}

export function EventLogPanel({ events, focalYear }: EventLogPanelProps) {
  return (
    <section className="event-log-panel">
      <div className="event-log-header">
        <div>
          <p className="rail-label">Timeline events</p>
          <h3 className="event-log-title">Narrative feed</h3>
        </div>
        <strong className="event-log-meta">Up to {formatYear(focalYear)}</strong>
      </div>
      <ol className="event-log-list">
        {events.map((event) => (
          <li key={event.id} className={`event-log-item ${event.state}`}>
            <span className="event-log-year">{formatYear(event.year)}</span>
            <div>
              <p className="event-log-type">{event.type.replace(/-/g, " ")}</p>
              <p className="event-log-label">{event.label}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}