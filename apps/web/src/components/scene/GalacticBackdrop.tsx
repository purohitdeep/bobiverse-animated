import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  PointsMaterial,
  SRGBColorSpace,
} from "three";
import { createSeededRandom } from "@bobiverse/simulation";

/**
 * Procedural deep-sky backdrop: a galactic band plus a distant field of
 * faint stars.
 *
 * Both are generated from a fixed seed so the sky is identical on every load
 * and in every test run, and neither ships an image asset.
 *
 * A galactic band is not decoration here: Eridanus and Pavonis are real
 * southern-sky constellations, so the reader is looking at that part of the
 * sky and the band belongs there.
 */

function createBandTexture(seed: number) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  const random = createSeededRandom(seed);

  // Soft luminous clouds concentrated along the band, thickest at the middle
  // of the plane and thinning towards the galactic poles.
  for (let i = 0; i < 900; i++) {
    const x = random() * canvas.width;
    // Gaussian-ish concentration around the midline.
    const t = (random() + random() + random() - 1.5) / 1.5;
    const y = canvas.height / 2 + t * canvas.height * 0.42;

    const radius = 18 + random() * 70;
    const brightness = Math.max(0, 1 - Math.abs(t)) * (0.05 + random() * 0.12);

    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(206, 214, 235, ${brightness})`);
    gradient.addColorStop(1, "rgba(206, 214, 235, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createDeepFieldGeometry(count: number, seed: number, radius: number) {
  const random = createSeededRandom(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Uniform points on a sphere shell.
    const u = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const distance = radius * (0.75 + random() * 0.25);
    positions[i * 3] = r * Math.cos(theta) * distance;
    positions[i * 3 + 1] = u * distance;
    positions[i * 3 + 2] = r * Math.sin(theta) * distance;

    // Slight blue-to-warm variation, kept dim so it never competes with the
    // catalog systems.
    const warmth = random();
    const brightness = 0.25 + random() * 0.5;
    colors[i * 3] = brightness * (0.85 + warmth * 0.15);
    colors[i * 3 + 1] = brightness * 0.92;
    colors[i * 3 + 2] = brightness * (1.05 - warmth * 0.2);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

export function GalacticBackdrop({
  fieldRadius,
  seed = 20260926,
  fieldCount = 2200,
}: {
  fieldRadius: number;
  seed?: number;
  fieldCount?: number;
}) {
  const bandTexture = useMemo(() => createBandTexture(seed), [seed]);
  const deepField = useMemo(
    () => createDeepFieldGeometry(fieldCount, seed + 1, fieldRadius * 6),
    [fieldCount, seed, fieldRadius],
  );

  const fieldMaterial = useMemo(
    () =>
      new PointsMaterial({
        size: 0.06,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      deepField.dispose();
      fieldMaterial.dispose();
      bandTexture?.dispose();
    };
  }, [deepField, fieldMaterial, bandTexture]);

  if (!bandTexture) return null;

  return (
    <group>
      {/* Distant field of faint stars, well outside the catalog systems. */}
      <points
        geometry={deepField}
        material={fieldMaterial}
        frustumCulled={false}
        renderOrder={-2}
      />

      {/* The galactic plane, tilted off the ecliptic so it reads as a band
          across the sky rather than an edge-on line. */}
      <mesh rotation={[Math.PI / 2 - 0.38, 0, 0.42]} renderOrder={-3}>
        <planeGeometry args={[fieldRadius * 14, fieldRadius * 7]} />
        <meshBasicMaterial
          map={bandTexture}
          transparent
          opacity={0.5}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default GalacticBackdrop;
