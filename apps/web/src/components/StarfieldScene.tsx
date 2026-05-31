import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { SceneStarNode } from "@bobiverse/simulation";

const scenePalette = {
  background: "#18110d",
  fog: "#18110d",
  sun: "#d1894f",
  rim: "#8d9a76",
  grid: "#6e4c37",
  gridSubtle: "#281b15",
  route: "#c97842",
};

interface StarfieldSceneProps {
  stars: SceneStarNode[];
  selectedStarId: string;
  onSelectStar: (starId: string) => void;
}

interface StarMarkerProps {
  star: SceneStarNode;
  isSelected: boolean;
  onSelectStar: (starId: string) => void;
}

function StarMarker({ star, isSelected, onSelectStar }: StarMarkerProps) {
  return (
    <group position={[star.position.x, star.position.y, star.position.z]}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelectStar(star.id);
        }}
      >
        <sphereGeometry
          args={[isSelected ? star.radius * 1.35 : star.radius, 32, 32]}
        />
        <meshStandardMaterial
          color={star.color}
          emissive={star.color}
          emissiveIntensity={isSelected ? 1.8 : 0.95}
          roughness={0.25}
        />
      </mesh>
      {isSelected ? (
        <Html center distanceFactor={6.5}>
          <div className="star-label">{star.name}</div>
        </Html>
      ) : null}
    </group>
  );
}

export function StarfieldScene({
  stars,
  selectedStarId,
  onSelectStar,
}: StarfieldSceneProps) {
  return (
    <Canvas camera={{ position: [3.6, 2.4, 6.4], fov: 42 }}>
      <color attach="background" args={[scenePalette.background]} />
      <fog attach="fog" args={[scenePalette.fog, 5, 12]} />
      <ambientLight intensity={0.62} />
      <pointLight
        position={[0, 0, 0]}
        intensity={30}
        distance={16}
        color={scenePalette.sun}
      />
      <directionalLight
        position={[4, 5, 3]}
        intensity={1}
        color={scenePalette.rim}
      />
      <gridHelper
        args={[12, 12, scenePalette.grid, scenePalette.gridSubtle]}
        position={[0, -1.4, 0]}
      />
      <Stars
        radius={80}
        depth={48}
        count={3500}
        factor={4}
        saturation={0}
        speed={0.25}
      />

      {stars
        .filter((star) => star.id !== "sol")
        .map((star) => (
          <Line
            key={`${star.id}-line`}
            points={[
              [0, 0, 0],
              [star.position.x, star.position.y, star.position.z],
            ]}
            color={scenePalette.route}
            lineWidth={1}
            transparent
            opacity={0.32}
          />
        ))}

      {stars.map((star) => (
        <StarMarker
          key={star.id}
          star={star}
          isSelected={star.id === selectedStarId}
          onSelectStar={onSelectStar}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={10}
      />
    </Canvas>
  );
}
