import {
  formatAtlasYear,
  type BobInstanceState,
  type SceneStarNode,
  type TimelineEventState,
} from "@bobiverse/simulation";

interface SystemDirectoryProps {
  stars: SceneStarNode[];
  bobs: BobInstanceState[];
  events: TimelineEventState[];
  selectedStarId: string;
  onSelectStar: (starId: string) => void;
}

export function SystemDirectory({
  stars,
  bobs,
  events,
  selectedStarId,
  onSelectStar,
}: SystemDirectoryProps) {
  return (
    <section className="system-directory" aria-labelledby="system-directory-heading">
      <div className="directory-heading">
        <div>
          <p className="rail-label">Accessible atlas</p>
          <h3 id="system-directory-heading">Mapped systems</h3>
        </div>
        <p>{stars.length} systems in the current visual frame</p>
      </div>

      <div className="directory-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">System</th>
              <th scope="col">Distance</th>
              <th scope="col">Position</th>
              <th scope="col">Here now</th>
              <th scope="col">Events</th>
              <th scope="col"><span className="sr-only">Select</span></th>
            </tr>
          </thead>
          <tbody>
            {stars.map((star) => {
              const residents = bobs.filter(
                (bob) =>
                  bob.currentSystemId === star.id &&
                  bob.movement.kind !== "in-transit",
              );
              const travelers = bobs.filter(
                (bob) =>
                  bob.movement.kind === "in-transit" &&
                  (bob.movement.fromSystemId === star.id ||
                    bob.movement.toSystemId === star.id),
              );
              const travelerText = travelers.map((bob) => {
                const movement = bob.movement;
                if (movement.kind !== "in-transit") return bob.name;
                const destination = stars.find(
                  (candidate) => candidate.id === movement.toSystemId,
                );
                return `${bob.name} → ${destination?.name ?? movement.toSystemId}`;
              });
              const peopleHere = [
                ...residents.map((bob) => bob.name),
                ...travelerText,
              ];
              const starEvents = events.filter(
                (event) => event.starSystemId === star.id,
              );
              const selected = star.id === selectedStarId;
              return (
                <tr key={star.id} className={selected ? "selected" : undefined}>
                  <th scope="row">
                    <span
                      className="directory-star"
                      style={{ backgroundColor: star.color }}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{star.name}</strong>
                      <small>{star.reviewStatus.replace(/-/g, " ")}</small>
                    </span>
                  </th>
                  <td>{star.distanceLy.toFixed(2)} ly</td>
                  <td>
                    {star.raHours.toFixed(2)}h / {star.decDegrees.toFixed(2)}°
                  </td>
                  <td>
                    {peopleHere.length > 0
                      ? peopleHere.join(", ")
                      : "—"}
                  </td>
                  <td>
                    {starEvents.length > 0 ? (
                      <span className="directory-events">
                        {starEvents.length} · latest {formatAtlasYear(
                          starEvents.at(-1)?.year ?? 0,
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="directory-select"
                      onClick={() => onSelectStar(star.id)}
                      aria-pressed={selected}
                    >
                      {selected ? "Focused" : "Focus"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
