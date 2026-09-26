import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { Vector3 } from "three";
import {
  computeSceneFraming,
  type BobInstanceState,
  type SceneStarNode,
  type TimelineEventState,
  type TravelSegmentState,
} from "@bobiverse/simulation";

const scenePalette = {
  background: "#10151c",
  fog: "#10151c",
  route: "#69d5cf",
  routeDim: "#375e64",
  bob: "#f3a66d",
};

function supportsWebGL() {
  if (typeof document === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

interface StarfieldSceneProps {
  stars: SceneStarNode[];
  selectedStarId: string;
  travelSegments: TravelSegmentState[];
  events: TimelineEventState[];
  bobs: BobInstanceState[];
  onSelectStar: (starId: string) => void;
}

interface StarMarkerProps {
  star: SceneStarNode;
  isSelected: boolean;
  residentCount: number;
  eventCount: number;
  onSelectStar: (starId: string) => void;
}

function StarMarker({
  star,
  isSelected,
  residentCount,
  eventCount,
  onSelectStar,
}: StarMarkerProps) {
  return (
    <group position={[star.position.x, star.position.y, star.position.z]}>
      {isSelected ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[star.radius * 1.8, 0.018, 8, 48]} />
          <meshBasicMaterial color={scenePalette.route} transparent opacity={0.75} />
        </mesh>
      ) : null}
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelectStar(star.id);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry
          args={[isSelected ? star.radius * 1.28 : star.radius, 32, 32]}
        />
        <meshBasicMaterial
          color={star.color}
          toneMapped={false}
          transparent={isSelected}
          opacity={isSelected ? 1 : 0.88}
        />
      </mesh>
      {isSelected || eventCount > 0 ? (
        <Html center distanceFactor={7}>
          <div className={isSelected ? "star-label selected" : "star-label"}>
            <span>{star.name}</span>
            {eventCount > 0 ? <b>{eventCount} {eventCount === 1 ? "event" : "events"}</b> : null}
            {residentCount > 0 ? <em>{residentCount} here</em> : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function getBobPosition(
  bob: BobInstanceState,
  starPositionsById: Map<string, Vector3>,
) {
  if (bob.movement.kind === "in-transit") {
    const from = starPositionsById.get(bob.movement.fromSystemId);
    const to = starPositionsById.get(bob.movement.toSystemId);
    if (from && to) {
      return from.clone().lerp(to, bob.movement.progress).add(new Vector3(0, 0.12, 0));
    }
  }
  return starPositionsById.get(bob.currentSystemId);
}

function BobMarker({
  bob,
  starPositionsById,
  onSelectStar,
}: {
  bob: BobInstanceState;
  starPositionsById: Map<string, Vector3>;
  onSelectStar: (starId: string) => void;
}) {
  const position = getBobPosition(bob, starPositionsById);
  if (!position) return null;
  const targetStarId =
    bob.movement.kind === "in-transit"
      ? bob.movement.toSystemId
      : bob.currentSystemId;

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelectStar(targetStarId);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshBasicMaterial color={scenePalette.bob} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={8}>
        <div className="bob-label">
          <span className="bob-pip" aria-hidden="true" />
          {bob.name}
          {bob.movement.kind === "in-transit" ? (
            <small>{Math.round(bob.movement.progress * 100)}%</small>
          ) : null}
        </div>
      </Html>
    </group>
  );
}

/**
 * Frames the camera on the selected system. The distance is derived from the
 * content rather than hardcoded: Sol is the origin of the neighbourhood, so
 * selecting it shows the whole field, while selecting a distant system moves
 * in close enough to read its markers.
 */
function CameraFocus({
  selectedStar,
  cameraDistance,
}: {
  selectedStar: SceneStarNode;
  cameraDistance: number;
}) {
  const camera = useThree((state) => state.camera);
  const { x, y, z } = selectedStar.position;
  const distance = selectedStar.id === "sol" ? cameraDistance : cameraDistance * 0.62;

  useEffect(() => {
    camera.position.set(x + distance * 0.82, y + distance * 0.5, z + distance * 0.82);
    camera.lookAt(new Vector3(x, y, z));
  }, [camera, selectedStar.id, x, y, z, distance]);

  return null;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function SchematicOverlay({
  stars,
  travelSegments,
  bobs,
  selectedStarId,
}: Pick<StarfieldSceneProps, "stars" | "travelSegments" | "bobs" | "selectedStarId">) {
  const extent = Math.max(
    ...stars.map((star) => Math.hypot(star.position.x, star.position.z)),
    1,
  );
  const positionById = new Map(
    stars.map((star) => [
      star.id,
      {
        x: 50 + (star.position.x / extent) * 32,
        y: 50 - (star.position.z / extent) * 30,
      },
    ]),
  );

  function bobPosition(bob: BobInstanceState) {
    if (bob.movement.kind === "in-transit") {
      const from = positionById.get(bob.movement.fromSystemId);
      const to = positionById.get(bob.movement.toSystemId);
      if (from && to) {
        return {
          x: from.x + (to.x - from.x) * bob.movement.progress,
          y: from.y + (to.y - from.y) * bob.movement.progress,
        };
      }
    }
    return positionById.get(bob.currentSystemId);
  }

  return (
    <div className="schematic-overlay" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="route-arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 z" fill={scenePalette.route} />
          </marker>
        </defs>
        {travelSegments.map((segment) => {
          const from = positionById.get(segment.fromSystemId);
          const to = positionById.get(segment.toSystemId);
          if (!from || !to) return null;
          return (
            <line
              key={segment.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={segment.state === "pre-departure" ? scenePalette.routeDim : scenePalette.route}
              strokeWidth={segment.state === "pre-departure" ? 0.22 : 0.42}
              strokeDasharray={segment.state === "in-transit" ? "1.2 0.8" : undefined}
              opacity={segment.state === "pre-departure" ? 0.55 : 0.9}
              markerEnd="url(#route-arrow)"
            />
          );
        })}
        {stars.map((star) => {
          const position = positionById.get(star.id);
          if (!position) return null;
          const selected = star.id === selectedStarId;
          return (
            <g key={star.id}>
              {selected ? (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="3.2"
                  fill="none"
                  stroke={scenePalette.route}
                  strokeWidth="0.35"
                  opacity="0.9"
                />
              ) : null}
              <circle
                cx={position.x}
                cy={position.y}
                r={selected ? "1.35" : "0.9"}
                fill={star.color}
                stroke="#ffffff"
                strokeWidth={selected ? "0.16" : "0.08"}
              />
            </g>
          );
        })}
        {bobs.map((bob) => {
          const position = bobPosition(bob);
          if (!position) return null;
          return (
            <circle
              key={bob.id}
              cx={position.x}
              cy={position.y}
              r="0.75"
              fill={scenePalette.bob}
              stroke="#fff1df"
              strokeWidth="0.18"
            />
          );
        })}
      </svg>
      <span className="schematic-caption">Schematic network overlay · WebGL controls remain active</span>
    </div>
  );
}

export function StarfieldScene({
  stars,
  selectedStarId,
  travelSegments,
  events,
  bobs,
  onSelectStar,
}: StarfieldSceneProps) {
  const reducedMotion = useReducedMotion();
  const [webglAvailable] = useState(supportsWebGL);
  const selectedStar = stars.find((star) => star.id === selectedStarId) ?? stars[0];
  const framing = useMemo(() => computeSceneFraming(stars), [stars]);
  const starPositionsById = useMemo(
    () =>
      new Map(
        stars.map((star) => [
          star.id,
          new Vector3(star.position.x, star.position.y, star.position.z),
        ]),
      ),
    [stars],
  );
  const eventCountByStar = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      if (event.starSystemId) {
        counts.set(event.starSystemId, (counts.get(event.starSystemId) ?? 0) + 1);
      }
    }
    return counts;
  }, [events]);
  const residentCountByStar = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bob of bobs) {
      if (bob.movement.kind === "in-transit") continue;
      counts.set(bob.currentSystemId, (counts.get(bob.currentSystemId) ?? 0) + 1);
    }
    return counts;
  }, [bobs]);

  if (!selectedStar) return null;

  if (!webglAvailable) {
    return (
      <>
        <div className="scene-fallback" role="status">
          <span className="empty-orbit" aria-hidden="true">✦</span>
          <strong>Spatial view unavailable</strong>
          <p>WebGL is disabled. The schematic network and mapped systems table keep the same frame available.</p>
        </div>
        <SchematicOverlay
          stars={stars}
          travelSegments={travelSegments}
          bobs={bobs}
          selectedStarId={selectedStarId}
        />
      </>
    );
  }

  return (
    <>
      <Canvas
      camera={{
        position: [
          framing.center.x + framing.cameraDistance * 0.82,
          framing.center.y + framing.cameraDistance * 0.5,
          framing.center.z + framing.cameraDistance * 0.82,
        ],
        fov: 42,
      }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      fallback={
        <div className="scene-fallback-inline" role="alert">
          <strong>Spatial view unavailable</strong>
          <span>Use the mapped systems table for the same information.</span>
        </div>
      }
    >
      <color attach="background" args={[scenePalette.background]} />
      {/* Range derived from the content: a fixed range either does nothing or
          swallows the field depending on how large the dataset grows. */}
      <fog attach="fog" args={[scenePalette.fog, framing.fogNear, framing.fogFar]} />
      {/* No lights: every material in this scene is unlit (basic materials,
          line materials, and additive points), so lights had no effect. */}

      <Stars
        radius={90}
        depth={60}
        count={2800}
        factor={3.5}
        saturation={0}
        speed={reducedMotion ? 0 : 0.12}
      />

      {travelSegments.map((segment) => {
        const from = starPositionsById.get(segment.fromSystemId);
        const to = starPositionsById.get(segment.toSystemId);
        if (!from || !to) return null;
        return (
          <Line
            key={segment.id}
            points={[
              [from.x, from.y, from.z],
              [to.x, to.y, to.z],
            ]}
            color={segment.state === "pre-departure" ? scenePalette.routeDim : scenePalette.route}
            lineWidth={segment.state === "pre-departure" ? 1.5 : 3}
            transparent
            depthTest={false}
            renderOrder={2}
            opacity={segment.state === "pre-departure" ? 0.5 : 0.95}
            dashed={segment.state === "in-transit"}
            dashSize={0.1}
            gapSize={0.06}
          />
        );
      })}

      {stars.map((star) => (
        <StarMarker
          key={star.id}
          star={star}
          isSelected={star.id === selectedStarId}
          residentCount={residentCountByStar.get(star.id) ?? 0}
          eventCount={eventCountByStar.get(star.id) ?? 0}
          onSelectStar={onSelectStar}
        />
      ))}

      {bobs.map((bob) => (
        <BobMarker
          key={bob.id}
          bob={bob}
          starPositionsById={starPositionsById}
          onSelectStar={onSelectStar}
        />
      ))}

      <CameraFocus
        selectedStar={selectedStar}
        cameraDistance={framing.cameraDistance}
      />
      {/* Orbit is constrained so the reader cannot rotate into a view where
          the layout is unreadable or below the reference plane. */}
      <OrbitControls
        key={selectedStarId}
        enableDamping
        dampingFactor={0.08}
        minDistance={framing.cameraDistance * 0.25}
        maxDistance={framing.cameraDistance * 2.2}
        minPolarAngle={0.05}
        maxPolarAngle={1.25}
        target={[
          selectedStar.position.x,
          selectedStar.position.y,
          selectedStar.position.z,
        ]}
      />
      </Canvas>
      <SchematicOverlay
        stars={stars}
        travelSegments={travelSegments}
        bobs={bobs}
        selectedStarId={selectedStarId}
      />
    </>
  );
}
