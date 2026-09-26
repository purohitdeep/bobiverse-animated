import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCENE_SETTINGS,
  detectSceneQuality,
  resolveInitialSceneSettings,
  supportsPostProcessing,
  type SceneCapabilities,
} from "./sceneSettings.ts";

function capabilities(overrides: Partial<SceneCapabilities> = {}): SceneCapabilities {
  return {
    hardwareConcurrency: 8,
    maxTouchPoints: 0,
    webgl2: true,
    ...overrides,
  };
}

describe("detectSceneQuality", () => {
  it("gives a capable desktop the full tier", () => {
    expect(detectSceneQuality(capabilities())).toBe("high");
  });

  it("steps down on a small number of cores", () => {
    expect(detectSceneQuality(capabilities({ hardwareConcurrency: 3 }))).toBe("balanced");
    expect(detectSceneQuality(capabilities({ hardwareConcurrency: 2 }))).toBe("low");
  });

  it("treats a touch device with few cores as mobile", () => {
    expect(
      detectSceneQuality(capabilities({ hardwareConcurrency: 6, maxTouchPoints: 5 })),
    ).toBe("low");
  });

  it("still allows a many-core touch device the full tier", () => {
    expect(
      detectSceneQuality(capabilities({ hardwareConcurrency: 12, maxTouchPoints: 5 })),
    ).toBe("high");
  });

  it("never offers the high or balanced tiers without WebGL2", () => {
    // Bloom and the composer need WebGL2; anything less must drop the
    // render pipeline rather than fail at runtime.
    expect(detectSceneQuality(capabilities({ webgl2: false }))).toBe("low");
  });

  it("assumes a mid-range device when the browser reports no core count", () => {
    expect(detectSceneQuality(capabilities({ hardwareConcurrency: undefined }))).toBe("balanced");
  });
});

describe("supportsPostProcessing", () => {
  it("is offered on a capable WebGL2 device", () => {
    expect(supportsPostProcessing(capabilities())).toBe(true);
  });

  it("is refused without WebGL2", () => {
    expect(supportsPostProcessing(capabilities({ webgl2: false }))).toBe(false);
  });

  it("is refused on the low tier even with WebGL2", () => {
    expect(supportsPostProcessing(capabilities({ hardwareConcurrency: 2 }))).toBe(false);
  });
});

describe("DEFAULT_SCENE_SETTINGS", () => {
  it("starts with the effects the reader asked for, on the middle tier", () => {
    expect(DEFAULT_SCENE_SETTINGS).toEqual({
      quality: "balanced",
      postProcessing: true,
      backdrop: true,
      rings: true,
    });
  });
});

describe("resolveInitialSceneSettings", () => {
  const stored = { ...DEFAULT_SCENE_SETTINGS, postProcessing: true };

  it("keeps a stored preference on a capable device", () => {
    expect(
      resolveInitialSceneSettings(stored, capabilities()).postProcessing,
    ).toBe(true);
  });

  it("does not force the composer onto a device that cannot run it", () => {
    // A saved "effects on" must not override what the hardware supports.
    expect(
      resolveInitialSceneSettings(stored, capabilities({ webgl2: false }))
        .postProcessing,
    ).toBe(false);
  });

  it("keeps the other toggles untouched when clamping", () => {
    const resolved = resolveInitialSceneSettings(
      { ...stored, rings: false, backdrop: false },
      capabilities({ webgl2: false }),
    );
    expect(resolved.rings).toBe(false);
    expect(resolved.backdrop).toBe(false);
  });
});
