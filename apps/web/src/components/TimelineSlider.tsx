import type { ChapterScope } from "@bobiverse/domain";
import type { TimelineBounds } from "@bobiverse/simulation";

interface TimelineSliderProps {
  focalYear: number;
  bounds: TimelineBounds;
  chapterScopes: ChapterScope[];
  selectedScope: ChapterScope;
  onYearChange: (year: number) => void;
}

function formatYear(year: number) {
  return Number.isInteger(year) ? String(year) : year.toFixed(1);
}

export function TimelineSlider({
  focalYear,
  bounds,
  chapterScopes,
  selectedScope,
  onYearChange,
}: TimelineSliderProps) {
  const range = Math.max(bounds.endYear - bounds.startYear, 1);

  return (
    <>
      <div className="timeline-header">
        <label className="rail-label" htmlFor="year-range">
          Chronology position
        </label>
        <strong className="timeline-year">{formatYear(focalYear)}</strong>
      </div>
      <input
        id="year-range"
        type="range"
        min={String(bounds.startYear)}
        max={String(bounds.endYear)}
        step="0.1"
        value={focalYear}
        onChange={(event) => onYearChange(Number(event.target.value))}
      />
      <div className="timeline-markers" aria-hidden="true">
        {chapterScopes.map((scope) => {
          const position = ((scope.maxYear - bounds.startYear) / range) * 100;
          return (
            <div
              key={scope.id}
              className={
                scope.id === selectedScope.id
                  ? "timeline-marker active"
                  : "timeline-marker"
              }
              style={{ left: `${Math.min(Math.max(position, 0), 100)}%` }}
            >
              <span />
              <small>{scope.chapter}</small>
            </div>
          );
        })}
      </div>
      <p className="slider-caption">
        The current frontier ends at {selectedScope.label}. Events beyond that
        point stay outside the atlas view.
      </p>
    </>
  );
}
