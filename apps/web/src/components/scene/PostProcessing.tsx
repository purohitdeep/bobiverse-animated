import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Vector2 } from "three";

/**
 * The post-processing chain. This lives in its own module so the render
 * pipeline is split into a separate chunk: readers who never open the
 * spatial view, or who run at the low quality tier, never download it.
 *
 * The priority-1 frame callback takes over the render loop, which is what
 * stops the default renderer from also drawing the scene.
 */
export function PostProcessing({ strength = 0.85 }: { strength?: number }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const composer = useMemo(() => {
    const next = new EffectComposer(gl);
    next.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new Vector2(size.width, size.height),
      strength,
      // A wide radius keeps the star halos soft instead of hard-edged.
      0.6,
      // Only genuinely bright cores should bloom; the threshold keeps the
      // dimmer systems from smearing into each other.
      0.55,
    );
    next.addPass(bloom);
    // Tone mapping and colour-space conversion happen once, at the end of
    // the chain, rather than in every material.
    next.addPass(new OutputPass());

    next.setSize(size.width, size.height);
    next.setPixelRatio(gl.getPixelRatio());
    return next;
  }, [gl, scene, camera, size.width, size.height, strength]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
    composer.setPixelRatio(gl.getPixelRatio());
  }, [composer, gl, size.width, size.height]);

  useEffect(() => {
    return () => {
      composer.dispose();
    };
  }, [composer]);

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}

export default PostProcessing;
