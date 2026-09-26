import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Line2 } from "three/addons/lines/Line2.js";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import { GalacticBackdrop } from "./scene/GalacticBackdrop";
import {
  DEFAULT_SCENE_SETTINGS,
  readDeviceCapabilities,
  supportsPostProcessing,
  type SceneSettings,
} from "../scene/sceneSettings";
import {
  buildDistanceRings,
  buildStarPointAttributes,
  computeSceneFraming,
  getNiceDistanceStep,
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
  ring: "#4a6b78",
  bob: "#f3a66d",
};

// Kept out of the main scene chunk: readers who never open the spatial view,
// or who run without post-processing, never download the render pipeline.
const LazyPostProcessing = lazy(() => import("./scene/PostProcessing"));

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
  /** Effect toggles and quality tier; see sceneSettings. */
  settings?: SceneSettings;
  /** Called when the GPU drops the context, so the app can fall back. */
  onContextLost?: () => void;
}

/**
 * Stars are drawn as additive points rather than spheres.
 *
 * A sphere is a solid object with a physical size, so two nearby systems
 * interpenetrate and read as one blob: Epsilon Eridani and Omicron2 Eridani
 * sit 0.194 units apart with 0.32-unit spheres. A point has no silhouette to
 * merge, so brightness and colour carry the identity instead, and the whole
 * layer costs a single draw call.
 *
 * Colour comes from the catalog B-V index and size from apparent magnitude
 * (see getStarDisplayStyles), so neither depends on array order.
 */
const STAR_VERTEX_SHADER = /* glsl */ `
  attribute vec3 starColor;
  attribute float starSize;
  uniform float uScale;
  varying vec3 vColor;

  void main() {
    vColor = starColor;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = starSize * uScale / max(-viewPosition.z, 0.0001);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const STAR_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;

  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float distanceFromCentre = length(offset) * 2.0;
    if (distanceFromCentre > 1.0) discard;

    // Bright core, exponential halo, and a faint cross for diffraction.
    float core = smoothstep(0.30, 0.0, distanceFromCentre);
    float halo = exp(-distanceFromCentre * 3.1) * 0.55;
    float spikes = (max(0.0, 1.0 - abs(offset.x) * 26.0)
                  + max(0.0, 1.0 - abs(offset.y) * 26.0))
                 * smoothstep(1.0, 0.12, distanceFromCentre) * 0.30;

    float intensity = core + halo + spikes;
    // Alpha stays at 1 so additive blending (src = SrcAlpha) accumulates the
    // colour as written. Premultiplying here would square the intensity and
    // dim every star.
    gl_FragColor = vec4(vColor * intensity, 1.0);
  }
`;

/**
 * Distance reference rings centred on Sol.
 *
 * Distance is the axis this dataset actually supports, and rings in the
 * top-down plane give it a scale without interpreting a 3D projection. They
 * are drawn flat and dim so they read as a measuring aid, never as content.
 */
function DistanceRings({ stars }: { stars: SceneStarNode[] }) {
  const rings = useMemo(() => buildDistanceRings(stars), [stars]);
  const labels = useMemo(() => {
    const next = new Map<number, { x: number; z: number }>();
    const spacing = getNiceDistanceStep(
      Math.max(0, ...stars.map((star) => star.distanceLy)),
    );
    for (const ring of rings) {
      // Place the label a third of the way round, away from the densest
      // part of the field.
      const point = ring.points[Math.floor(ring.points.length / 3)];
      if (point) next.set(ring.ly, { x: point.x, z: point.z });
    }
    return { next, spacing };
  }, [rings, stars]);

  return (
    <group>
      {rings.map((ring) => (
        <Line
          key={ring.ly}
          points={ring.points.map((point) => [point.x, point.y, point.z])}
          color={scenePalette.ring}
          lineWidth={0.6}
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      ))}
      {[...labels.next.entries()].map(([ly, position]) => (
        <Html
          key={ly}
          center
          position={[position.x, 0, position.z]}
          distanceFactor={8}
          zIndexRange={[5, 0]}
        >
          <span className="ring-label">{ly} ly</span>
        </Html>
      ))}
    </group>
  );
}

/**
 * A sourced route with a slow directional flow while it is in use.
 *
 * The flow is decorative: it signals direction and activity, and never
 * claims to be the replicant's position. The replicant marker itself stays
 * exactly where the story year puts it, because the atlas treats world state
 * as a deterministic function of the selected frame. Animate along the
 * route would contradict that contract.
 */
function AnimatedRouteLine({
  from,
  to,
  state,
  animate,
}: {
  from: Vector3;
  to: Vector3;
  state: "pre-departure" | "in-transit" | "arrived";
  animate: boolean;
}) {
  const lineRef = useRef<Line2 | null>(null);
  const isPreDeparture = state === "pre-departure";
  const isInTransit = state === "in-transit";

  useFrame((state_) => {
    const material = lineRef.current?.material;
    if (!material || !animate || !isInTransit) return;
    material.dashOffset = -state_.clock.elapsedTime * 0.4;
    material.needsUpdate = false;
  });

  return (
    <Line
      ref={lineRef as never}
      points={[
        [from.x, from.y, from.z],
        [to.x, to.y, to.z],
      ]}
      color={isPreDeparture ? scenePalette.routeDim : scenePalette.route}
      lineWidth={isPreDeparture ? 1.2 : 2.4}
      transparent
      // Depth testing is on: a route that draws straight through a star
      // reads as a rendering fault rather than a journey.
      depthWrite={false}
      opacity={isPreDeparture ? 0.45 : 0.9}
      dashed={isInTransit}
      dashSize={0.14}
      gapSize={0.08}
    />
  );
}

/**
 * Watches for the GPU dropping the WebGL context, which is otherwise a silent
 * black screen. Reporting it lets the app fall back to the directory.
 */
function ContextLossGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const handle = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", handle);
    return () => canvas.removeEventListener("webglcontextlost", handle);
  }, [gl, onLost]);
  return null;
}

function StarPoints({
  stars,
  onSelectStar,
}: {
  stars: SceneStarNode[];
  onSelectStar: (starId: string) => void;
}) {
  const { size, viewport, camera } = useThree();
  const attributes = useMemo(() => buildStarPointAttributes(stars), [stars]);

  const geometry = useMemo(() => {
    const next = new BufferGeometry();
    next.setAttribute("position", new BufferAttribute(attributes.positions, 3));
    next.setAttribute("starColor", new BufferAttribute(attributes.colors, 3));
    next.setAttribute("starSize", new BufferAttribute(attributes.sizes, 1));
    next.computeBoundingSphere();
    return next;
  }, [attributes]);

  // Convert world-space radius into pixels for the current viewport and lens.
  // The scale only changes on resize, so the material is rebuilt rather than
  // mutated in place.
  const fovRadians = ((camera as { fov?: number }).fov ?? 42) * (Math.PI / 180);
  const scale =
    (size.height * viewport.dpr) / (2 * Math.tan(fovRadians / 2));

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: STAR_VERTEX_SHADER,
        fragmentShader: STAR_FRAGMENT_SHADER,
        uniforms: { uScale: { value: scale } },
        transparent: true,
        depthWrite: false,
        // Additive light: overlapping systems add together instead of
        // occluding, which is what keeps a dense region readable.
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [scale],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <points
      geometry={geometry}
      material={material}
      onClick={(event) => {
        event.stopPropagation();
        const starId =
          event.index === undefined ? undefined : attributes.ids[event.index];
        if (starId) onSelectStar(starId);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    />
  );
}

function SelectedStarRing({ star }: { star: SceneStarNode }) {
  return (
    <mesh
      position={[star.position.x, star.position.y, star.position.z]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[star.radius * 1.8, 0.014, 8, 48]} />
      <meshBasicMaterial
        color={scenePalette.route}
        transparent
        opacity={0.8}
        toneMapped={false}
      />
    </mesh>
  );
}

function StarLabels({
  stars,
  eventCountByStar,
  residentCountByStar,
  selectedStarId,
}: {
  stars: SceneStarNode[];
  eventCountByStar: Map<string, number>;
  residentCountByStar: Map<string, number>;
  selectedStarId: string;
}) {
  return (
    <>
      {stars.map((star) => {
        const isSelected = star.id === selectedStarId;
        const eventCount = eventCountByStar.get(star.id) ?? 0;
        const residentCount = residentCountByStar.get(star.id) ?? 0;
        // With only a handful of systems, labelling all of them costs
        // nothing and removes the "what is that unlabelled blob" problem.
        return (
          <group key={star.id} position={[star.position.x, star.position.y, star.position.z]}>
            <Html center distanceFactor={7}>
              <div className={isSelected ? "star-label selected" : "star-label"}>
                <span>{star.name}</span>
                {eventCount > 0 ? (
                  <b>
                    {eventCount} {eventCount === 1 ? "event" : "events"}
                  </b>
                ) : null}
                {residentCount > 0 ? <em>{residentCount} here</em> : null}
              </div>
            </Html>
          </group>
        );
      })}
    </>
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
  settings = DEFAULT_SCENE_SETTINGS,
  onContextLost,
}: StarfieldSceneProps) {
  const reducedMotion = useReducedMotion();
  const [webglAvailable] = useState(supportsWebGL);
  const [contextLost, setContextLost] = useState(false);
  const selectedStar = stars.find((star) => star.id === selectedStarId) ?? stars[0];
  const framing = useMemo(() => computeSceneFraming(stars), [stars]);
  // Bloom and the composer need WebGL2; a device without it runs the scene
  // directly rather than failing inside the render pipeline.
  const postProcessing =
    settings.postProcessing && !contextLost && supportsPostProcessing(readDeviceCapabilities());
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

  const handleContextLost = useCallback(() => {
    setContextLost(true);
    onContextLost?.();
  }, [onContextLost]);

  if (!selectedStar) return null;

  if (!webglAvailable || contextLost) {
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
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        // Tone mapping is applied once by the composer's OutputPass. Three
        // skips it for the RenderPass automatically because that renders to
        // an off-screen target, so setting it here does not double-apply it.
        toneMapping: ACESFilmicToneMapping,
      }}
      raycaster={{
        params: {
          Mesh: {},
          Line: { threshold: 1 },
          LOD: {},
          // Points have no physical surface to intersect, so picking uses a
          // world-space radius around each point instead.
          Points: { threshold: 0.3 },
          Sprite: {},
        },
      }}
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

      <Suspense fallback={null}>
        {settings.backdrop ? (
          <GalacticBackdrop
            fieldRadius={framing.radius}
            fieldCount={reducedMotion ? 1400 : 2200}
          />
        ) : null}
        {postProcessing ? <LazyPostProcessing /> : null}
      </Suspense>

      {travelSegments.map((segment) => {
        const from = starPositionsById.get(segment.fromSystemId);
        const to = starPositionsById.get(segment.toSystemId);
        if (!from || !to) return null;
        return (
          <AnimatedRouteLine
            key={segment.id}
            from={from}
            to={to}
            state={segment.state}
            animate={!reducedMotion}
          />
        );
      })}

      {settings.rings ? <DistanceRings stars={stars} /> : null}

      <ContextLossGuard onLost={handleContextLost} />
      <StarPoints stars={stars} onSelectStar={onSelectStar} />

      {selectedStar ? <SelectedStarRing star={selectedStar} /> : null}

      <StarLabels
        stars={stars}
        eventCountByStar={eventCountByStar}
        residentCountByStar={residentCountByStar}
        selectedStarId={selectedStarId}
      />

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
