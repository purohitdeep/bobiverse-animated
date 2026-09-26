import type { ChapterScope } from "@bobiverse/domain";
import {
  formatAtlasYear,
  type TimelineBounds,
  type TimelineEventState,
} from "@bobiverse/simulation";

interface TimelineSliderProps {
  focalYear: number;
  bounds: TimelineBounds;
  chapterScopes: ChapterScope[];
  selectedScope: ChapterScope;
  isPlaying: boolean;
  playbackSpeed: number;
  previousEvent: TimelineEventState | null;
  nextEvent: TimelineEventState | null;
  onYearChange: (year: number) => void;
  onScopeChange: (scopeId: string) => void;
  onEventStep: (event: TimelineEventState) => void;
  onTogglePlayback: () => void;
  onPlaybackSpeedChange: (speed: number) => void;
}

export function TimelineSlider({
  focalYear,
  bounds,
  chapterScopes,
  selectedScope,
  isPlaying,
  playbackSpeed,
  previousEvent,
  nextEvent,
  onYearChange,
  onScopeChange,
  onEventStep,
  onTogglePlayback,
  onPlaybackSpeedChange,
}: TimelineSliderProps) {
  const range = Math.max(bounds.endYear - bounds.startYear, 1);
  const progress = Math.min(
    Math.max(((focalYear - bounds.startYear) / range) * 100, 0),
    100,
  );
  const visibleChapterScopes = chapterScopes.filter(
    (scope) => scope.maxYear <= bounds.endYear,
  );

  return (
    <section className="timeline-card" aria-labelledby="timeline-heading">
      <div className="timeline-heading-row">
        <div className="panel-heading">
          <p className="rail-label">Time machine</p>
          <h2 id="timeline-heading">Scrub the story</h2>
        </div>
        <div className="timeline-actions">
          <div className="event-stepper" role="group" aria-label="Jump between events">
            <button
              type="button"
              onClick={() => previousEvent && onEventStep(previousEvent)}
              disabled={!previousEvent}
              aria-label="Previous event"
              title={previousEvent ? `Previous event · ${formatAtlasYear(previousEvent.year)}` : "No previous event"}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => nextEvent && onEventStep(nextEvent)}
              disabled={!nextEvent}
              aria-label="Next event"
              title={nextEvent ? `Next event · ${formatAtlasYear(nextEvent.year)}` : "No next event"}
            >
              ›
            </button>
          </div>
          <label className="speed-control">
            <span className="sr-only">Playback speed</span>
            <select
              value={playbackSpeed}
              onChange={(event) =>
                onPlaybackSpeedChange(Number(event.target.value))
              }
              aria-label="Playback speed"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
            </select>
          </label>
          <button
            type="button"
            className="play-button"
            onClick={onTogglePlayback}
            aria-label={isPlaying ? "Pause timeline" : "Play timeline"}
          >
            <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      <div className="timeline-readout">
        <div>
          <span>Story frame</span>
          <strong>{formatAtlasYear(focalYear)}</strong>
        </div>
        <div className="timeline-window" aria-hidden="true">
          <span>{formatAtlasYear(bounds.startYear)}</span>
          <i style={{ width: `${progress}%` }} />
          <span>{formatAtlasYear(bounds.endYear)}</span>
        </div>
      </div>

      <input
        id="year-range"
        className="timeline-range"
        type="range"
        min={String(bounds.startYear)}
        max={String(bounds.endYear)}
        step="0.1"
        value={focalYear}
        aria-valuetext={`Year ${formatAtlasYear(focalYear)}`}
        onChange={(event) => onYearChange(Number(event.target.value))}
      />

      <div className="timeline-markers" aria-label="Curated chapter boundaries">
        {visibleChapterScopes.map((scope) => {
          const position = ((scope.maxYear - bounds.startYear) / range) * 100;
          const isSelected = scope.id === selectedScope.id;
          return (
            <button
              key={scope.id}
              type="button"
              className={
                isSelected ? "timeline-marker active" : "timeline-marker"
              }
              style={{ left: `${Math.min(Math.max(position, 0), 100)}%` }}
              onClick={() => onScopeChange(scope.id)}
              aria-label={`Jump to ${scope.label}`}
              aria-current={isSelected ? "step" : undefined}
            >
              <span aria-hidden="true" />
              <small>Ch. {scope.chapter}</small>
            </button>
          );
        })}
      </div>

      <div className="timeline-footnote">
        <p>
          <span className="status-dot" aria-hidden="true" />
          Frontier: <strong>{selectedScope.label}</strong>
        </p>
        <p>Use ← → for precise steps</p>
      </div>
    </section>
  );
}
